import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getCurrentUser } from '@/lib/auth/session';
import { getAISettings, getConnectionById } from '@/lib/db/app-db';
import { getAIModel, getSystemPromptForSQL } from '@/lib/ai/providers';
import { fetchTables, fetchColumns } from '@/lib/db/schema-fetcher';
import { aiChatSchema } from '@/lib/validations/ai';

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

    const { message, connectionId } = validationResult.data;

    // Get AI settings
    const settings = await getAISettings(user.id);
    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'AI not configured. Please configure AI settings first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database schema if connection is provided
    let schemaInfo = '';
    let dbType = 'SQL';

    if (connectionId) {
      const connection = await getConnectionById(connectionId, user.id);
      if (connection) {
        try {
          const tables = await fetchTables(connection);
          const schema: { tables: Array<{ name: string; columns: Array<{ name: string; type: string; nullable: boolean; key: string }> }> } = {
            tables: [],
          };
          for (const table of tables) {
            const columns = await fetchColumns(connection, table.name);
            schema.tables.push({
              name: table.name,
              columns: columns.map((c) => ({
                name: c.name,
                type: c.type,
                nullable: c.nullable,
                key: c.isPrimaryKey ? 'PRI' : c.isForeignKey ? 'MUL' : '',
              })),
            });
          }
          dbType = connection.type.toUpperCase();
          schemaInfo = formatSchemaForAI(schema);
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

    const result = streamText({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
      temperature: settings.temperature,
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

function formatSchemaForAI(schema: {
  tables: Array<{
    name: string;
    columns: Array<{ name: string; type: string; nullable: boolean; key: string }>;
  }>;
}): string {
  return schema.tables
    .map((table) => {
      const cols = table.columns
        .map((c) => `  - ${c.name}: ${c.type}${c.key === 'PRI' ? ' (PK)' : ''}${c.key === 'MUL' ? ' (FK)' : ''}${c.nullable ? ' NULL' : ''}`)
        .join('\n');
      return `TABLE: ${table.name}\n${cols}`;
    })
    .join('\n\n');
}
