import { NextRequest } from 'next/server';
import { streamText, type CoreMessage } from 'ai';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getEffectiveAISettings,
  getConnectionById,
  getSchemaCache,
  saveSchemaCache,
  getOrCreateConversation,
  getConversationMessages,
  addMessage,
  type EnrichedSchema,
} from '@/lib/db/app-db';
import { validateConnectionAccess } from '@/lib/db/teams';
import { getAIModel, getSystemPromptForSQL } from '@/lib/ai/providers';
import {
  fetchTables,
  fetchColumns,
  fetchIndexes,
  fetchAllRelationships,
  fetchForeignKeys,
} from '@/lib/db/schema-fetcher';
import { aiChatSchema } from '@/lib/validations/ai';

// Maximum number of previous messages to include in context
const MAX_CONTEXT_MESSAGES = 20;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const validationResult = aiChatSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validationResult.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, connectionId, teamId } = validationResult.data;

    // Get effective AI settings based on context (workspace vs personal)
    const settings = await getEffectiveAISettings(user.id, teamId || null);
    if (!settings) {
      const errorMessage = teamId
        ? 'AI not configured for this workspace. Please ask a team admin to configure AI settings.'
        : 'AI not configured. Please configure AI settings first.';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get or create conversation for this user-connection pair
    const conversation = await getOrCreateConversation(user.id, connectionId || null);

    // Get previous messages for context
    const previousMessages = await getConversationMessages(conversation.id, MAX_CONTEXT_MESSAGES);

    // Store the user's message
    await addMessage(conversation.id, 'user', message);

    // Get database schema if connection is provided (with caching)
    let schemaInfo = '';
    let dbType = 'SQL';

    if (connectionId) {
      const connection = await getConnectionById(connectionId, user.id);
      if (connection) {
        try {
          // Try to get cached schema first
          let enrichedSchema = await getSchemaCache(connectionId);

          if (!enrichedSchema) {
            // Fetch and cache schema
            enrichedSchema = await fetchEnrichedSchema(connection);
            await saveSchemaCache(connectionId, enrichedSchema);
          }

          dbType = connection.type.toUpperCase();
          schemaInfo = formatEnrichedSchemaForAI(enrichedSchema);
        } catch (error) {
          console.error('Failed to fetch schema:', error);
          schemaInfo = 'Schema information unavailable.';
        }
      }
    }

    const model = getAIModel(settings);
    const systemPrompt = connectionId && schemaInfo
      ? getSystemPromptForSQL(schemaInfo, dbType)
      : `You are a helpful SQL assistant. Help users with database queries and concepts. If no database schema is provided, give general SQL guidance.`;

    // Build message history for context
    const messages: CoreMessage[] = previousMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add the current message
    messages.push({ role: 'user', content: message });

    // Stream the response
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      temperature: settings.temperature,
      async onFinish({ text }) {
        // Store the assistant's response
        await addMessage(conversation.id, 'assistant', text);
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'AI request failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function fetchEnrichedSchema(connection: Parameters<typeof fetchTables>[0]): Promise<EnrichedSchema> {
  const tables = await fetchTables(connection);
  const relationships = await fetchAllRelationships(connection);

  const enrichedTables = await Promise.all(
    tables.map(async (table) => {
      const columns = await fetchColumns(connection, table.name);
      const foreignKeys = await fetchForeignKeys(connection, table.name);
      let indexes: Awaited<ReturnType<typeof fetchIndexes>> = [];

      try {
        indexes = await fetchIndexes(connection, table.name);
      } catch {
        // Indexes are optional, continue without them
      }

      // Build a map of foreign key references
      const fkMap = new Map(
        foreignKeys.map((fk) => [fk.columnName, { table: fk.referencedTable, column: fk.referencedColumn }])
      );

      return {
        name: table.name,
        type: table.type as 'table' | 'view',
        rowCount: table.rowCount,
        columns: columns.map((col) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          isPrimaryKey: col.isPrimaryKey,
          isForeignKey: col.isForeignKey || fkMap.has(col.name),
          autoIncrement: col.autoIncrement ?? false,
          defaultValue: col.defaultValue,
          references: fkMap.get(col.name) || col.references,
        })),
        indexes: indexes.map((idx) => ({
          name: idx.name,
          columns: idx.columns,
          unique: idx.unique,
          primary: idx.primary,
        })),
      };
    })
  );

  return {
    tables: enrichedTables,
    relationships: relationships.map((rel) => ({
      fromTable: rel.fromTable,
      fromColumn: rel.fromColumn,
      toTable: rel.toTable,
      toColumn: rel.toColumn,
    })),
  };
}

function formatEnrichedSchemaForAI(schema: EnrichedSchema): string {
  const tableSection = schema.tables
    .map((table) => {
      const cols = table.columns
        .map((c) => {
          let colStr = `  - ${c.name}: ${c.type}`;
          if (c.isPrimaryKey) colStr += ' (PK)';
          if (c.isForeignKey && c.references) {
            colStr += ` (FK -> ${c.references.table}.${c.references.column})`;
          } else if (c.isForeignKey) {
            colStr += ' (FK)';
          }
          if (c.nullable) colStr += ' NULL';
          if (c.autoIncrement) colStr += ' AUTO_INCREMENT';
          return colStr;
        })
        .join('\n');

      let tableStr = `TABLE: ${table.name}`;
      if (table.rowCount !== undefined && table.rowCount > 0) {
        tableStr += ` (~${table.rowCount.toLocaleString()} rows)`;
      }
      tableStr += `\n${cols}`;

      // Add indexes if available
      if (table.indexes && table.indexes.length > 0) {
        const idxStr = table.indexes
          .filter((idx) => !idx.primary) // Skip primary key index as it's redundant
          .map((idx) => `    INDEX ${idx.name}: (${idx.columns.join(', ')})${idx.unique ? ' UNIQUE' : ''}`)
          .join('\n');
        if (idxStr) {
          tableStr += `\n  Indexes:\n${idxStr}`;
        }
      }

      return tableStr;
    })
    .join('\n\n');

  // Add relationships section if there are any
  let relationshipSection = '';
  if (schema.relationships.length > 0) {
    const relStr = schema.relationships
      .map((rel) => `  ${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn}`)
      .join('\n');
    relationshipSection = `\n\nRELATIONSHIPS:\n${relStr}`;
  }

  return tableSection + relationshipSection;
}
