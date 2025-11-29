import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import type { DatabaseConnection, DatabaseType } from '@/types';
import { getDbClient, getDbType, type DbRow } from './db-client';

// User types
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

// AI Settings types
export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

export interface AISettings {
  id: string;
  userId: string;
  provider: AIProvider;
  apiKey: string | null;
  model: string | null;
  temperature: number;
  maxTokens: number;
  baseUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Row converters
function rowToUser(row: DbRow): User {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    name: row.name as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function rowToSession(row: DbRow): Session {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    expiresAt: new Date(row.expires_at as string),
    createdAt: new Date(row.created_at as string),
  };
}

function rowToConnection(row: DbRow): DatabaseConnection {
  const dbType = getDbType();
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as DatabaseType,
    host: row.host as string,
    port: row.port as number,
    database: row.database_name as string,
    username: row.username as string,
    password: decrypt(row.password as string),
    ssl: dbType === 'postgres' ? Boolean(row.ssl) : Boolean(row.ssl),
    color: row.color as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function rowToAISettings(row: DbRow): AISettings {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    provider: row.provider as AIProvider,
    apiKey: row.api_key ? decrypt(row.api_key as string) : null,
    model: row.model as string | null,
    temperature: row.temperature as number,
    maxTokens: row.max_tokens as number,
    baseUrl: row.base_url as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// User functions
export async function createUser(user: { id: string; email: string; passwordHash: string; name?: string }): Promise<User> {
  const client = getDbClient();
  const now = new Date().toISOString();
  
  await client.execute(
    `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, user.email.toLowerCase(), user.passwordHash, user.name || null, now, now]
  );
  
  const created = await getUserById(user.id);
  if (!created) throw new Error('Failed to create user');
  return created;
}

export async function getUserById(id: string): Promise<User | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT * FROM users WHERE id = ?', [id]);
  return row ? rowToUser(row) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  return row ? rowToUser(row) : null;
}

export async function updateUser(
  id: string,
  updates: { name?: string; email?: string; passwordHash?: string }
): Promise<User | null> {
  const client = getDbClient();
  const existing = await getUserById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email.toLowerCase());
  }
  if (updates.passwordHash !== undefined) {
    fields.push('password_hash = ?');
    values.push(updates.passwordHash);
  }

  values.push(id);

  await client.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

  return getUserById(id);
}

// Session functions
export async function createSession(session: { id: string; userId: string; expiresAt: Date }): Promise<Session> {
  const client = getDbClient();
  const now = new Date().toISOString();
  
  await client.execute(
    `INSERT INTO sessions (id, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
    [session.id, session.userId, session.expiresAt.toISOString(), now]
  );
  
  const created = await getSessionById(session.id);
  if (!created) throw new Error('Failed to create session');
  return created;
}

export async function getSessionById(id: string): Promise<Session | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT * FROM sessions WHERE id = ?', [id]);
  return row ? rowToSession(row) : null;
}

export async function getValidSession(id: string): Promise<Session | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > ?',
    [id, new Date().toISOString()]
  );
  return row ? rowToSession(row) : null;
}

export async function deleteSession(id: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM sessions WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function deleteExpiredSessions(): Promise<number> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM sessions WHERE expires_at < ?', [new Date().toISOString()]);
  return result.changes;
}

// Connection functions (with user filtering)
export async function getAllConnections(userId?: string): Promise<DatabaseConnection[]> {
  const client = getDbClient();
  if (userId) {
    const rows = await client.query<DbRow>('SELECT * FROM connections WHERE user_id = ? ORDER BY name', [userId]);
    return rows.map((row) => rowToConnection(row));
  }
  const rows = await client.query<DbRow>('SELECT * FROM connections ORDER BY name');
  return rows.map((row) => rowToConnection(row));
}

export async function getConnectionById(id: string, userId?: string): Promise<DatabaseConnection | null> {
  const client = getDbClient();
  if (userId) {
    const row = await client.queryOne<DbRow>('SELECT * FROM connections WHERE id = ? AND user_id = ?', [id, userId]);
    return row ? rowToConnection(row) : null;
  }
  const row = await client.queryOne<DbRow>('SELECT * FROM connections WHERE id = ?', [id]);
  return row ? rowToConnection(row) : null;
}

export async function createConnection(connection: Omit<DatabaseConnection, 'createdAt' | 'updatedAt'>, userId?: string): Promise<DatabaseConnection> {
  const client = getDbClient();
  const dbType = getDbType();
  const now = new Date().toISOString();
  
  const sslValue = dbType === 'postgres' ? connection.ssl : (connection.ssl ? 1 : 0);
  
  await client.execute(
    `INSERT INTO connections (id, user_id, name, type, host, port, database_name, username, password, ssl, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      connection.id,
      userId || null,
      connection.name,
      connection.type,
      connection.host,
      connection.port,
      connection.database,
      connection.username,
      encrypt(connection.password),
      sslValue,
      connection.color || null,
      now,
      now
    ]
  );
  
  const created = await getConnectionById(connection.id);
  if (!created) throw new Error('Failed to create connection');
  return created;
}

export async function updateConnection(id: string, updates: Partial<Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DatabaseConnection | null> {
  const client = getDbClient();
  const dbType = getDbType();
  const existing = await getConnectionById(id);
  if (!existing) return null;
  
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.host !== undefined) {
    fields.push('host = ?');
    values.push(updates.host);
  }
  if (updates.port !== undefined) {
    fields.push('port = ?');
    values.push(updates.port);
  }
  if (updates.database !== undefined) {
    fields.push('database_name = ?');
    values.push(updates.database);
  }
  if (updates.username !== undefined) {
    fields.push('username = ?');
    values.push(updates.username);
  }
  if (updates.password !== undefined) {
    fields.push('password = ?');
    values.push(encrypt(updates.password));
  }
  if (updates.ssl !== undefined) {
    fields.push('ssl = ?');
    values.push(dbType === 'postgres' ? updates.ssl : (updates.ssl ? 1 : 0));
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  
  values.push(id);
  
  await client.execute(`UPDATE connections SET ${fields.join(', ')} WHERE id = ?`, values);
  
  return getConnectionById(id);
}

export async function deleteConnection(id: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM connections WHERE id = ?', [id]);
  return result.changes > 0;
}

// AI Settings functions
export async function getAISettings(userId: string): Promise<AISettings | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT * FROM ai_settings WHERE user_id = ?', [userId]);
  return row ? rowToAISettings(row) : null;
}

export async function saveAISettings(userId: string, settings: {
  provider: AIProvider;
  apiKey?: string | null;
  model?: string | null;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string | null;
}): Promise<AISettings> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const existing = await getAISettings(userId);
  
  if (existing) {
    const fields: string[] = ['updated_at = ?', 'provider = ?'];
    const values: unknown[] = [now, settings.provider];
    
    if (settings.apiKey !== undefined) {
      fields.push('api_key = ?');
      values.push(settings.apiKey ? encrypt(settings.apiKey) : null);
    }
    if (settings.model !== undefined) {
      fields.push('model = ?');
      values.push(settings.model);
    }
    if (settings.temperature !== undefined) {
      fields.push('temperature = ?');
      values.push(settings.temperature);
    }
    if (settings.maxTokens !== undefined) {
      fields.push('max_tokens = ?');
      values.push(settings.maxTokens);
    }
    if (settings.baseUrl !== undefined) {
      fields.push('base_url = ?');
      values.push(settings.baseUrl);
    }
    
    values.push(userId);
    await client.execute(`UPDATE ai_settings SET ${fields.join(', ')} WHERE user_id = ?`, values);
  } else {
    const id = uuidv4();
    await client.execute(
      `INSERT INTO ai_settings (id, user_id, provider, api_key, model, temperature, max_tokens, base_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        settings.provider,
        settings.apiKey ? encrypt(settings.apiKey) : null,
        settings.model || null,
        settings.temperature ?? 0.7,
        settings.maxTokens ?? 2048,
        settings.baseUrl || null,
        now,
        now
      ]
    );
  }
  
  const result = await getAISettings(userId);
  if (!result) throw new Error('Failed to save AI settings');
  return result;
}

export async function deleteAISettings(userId: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM ai_settings WHERE user_id = ?', [userId]);
  return result.changes > 0;
}

// Schema Cache types and functions
export interface SchemaCache {
  id: string;
  connectionId: string;
  schemaJson: string;
  cachedAt: Date;
  expiresAt: Date;
}

export interface EnrichedSchema {
  tables: Array<{
    name: string;
    type: 'table' | 'view';
    rowCount?: number;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
      autoIncrement: boolean;
      defaultValue?: string;
      references?: {
        table: string;
        column: string;
      };
    }>;
    indexes?: Array<{
      name: string;
      columns: string[];
      unique: boolean;
      primary: boolean;
    }>;
  }>;
  relationships: Array<{
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }>;
}

function rowToSchemaCache(row: DbRow): SchemaCache {
  return {
    id: row.id as string,
    connectionId: row.connection_id as string,
    schemaJson: row.schema_json as string,
    cachedAt: new Date(row.cached_at as string),
    expiresAt: new Date(row.expires_at as string),
  };
}

const SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getSchemaCache(connectionId: string): Promise<EnrichedSchema | null> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const row = await client.queryOne<DbRow>(
    'SELECT * FROM schema_cache WHERE connection_id = ? AND expires_at > ?',
    [connectionId, now]
  );

  if (!row) return null;

  const cache = rowToSchemaCache(row);
  try {
    return JSON.parse(cache.schemaJson) as EnrichedSchema;
  } catch {
    return null;
  }
}

export async function saveSchemaCache(connectionId: string, schema: EnrichedSchema): Promise<void> {
  const client = getDbClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SCHEMA_CACHE_TTL_MS);

  // Try to update existing cache first
  const existing = await client.queryOne<DbRow>(
    'SELECT id FROM schema_cache WHERE connection_id = ?',
    [connectionId]
  );

  if (existing) {
    await client.execute(
      'UPDATE schema_cache SET schema_json = ?, cached_at = ?, expires_at = ? WHERE connection_id = ?',
      [JSON.stringify(schema), now.toISOString(), expiresAt.toISOString(), connectionId]
    );
  } else {
    const id = uuidv4();
    await client.execute(
      'INSERT INTO schema_cache (id, connection_id, schema_json, cached_at, expires_at) VALUES (?, ?, ?, ?, ?)',
      [id, connectionId, JSON.stringify(schema), now.toISOString(), expiresAt.toISOString()]
    );
  }
}

export async function invalidateSchemaCache(connectionId: string): Promise<void> {
  const client = getDbClient();
  await client.execute('DELETE FROM schema_cache WHERE connection_id = ?', [connectionId]);
}

export async function cleanExpiredSchemaCache(): Promise<number> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM schema_cache WHERE expires_at < ?', [new Date().toISOString()]);
  return result.changes;
}

// AI Conversation types and functions
export interface AIConversation {
  id: string;
  userId: string;
  connectionId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sqlQuery: string | null;
  createdAt: Date;
}

function rowToConversation(row: DbRow): AIConversation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    connectionId: row.connection_id as string | null,
    title: row.title as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function rowToMessage(row: DbRow): AIMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as 'user' | 'assistant' | 'system',
    content: row.content as string,
    sqlQuery: row.sql_query as string | null,
    createdAt: new Date(row.created_at as string),
  };
}

export async function getOrCreateConversation(userId: string, connectionId: string | null): Promise<AIConversation> {
  const client = getDbClient();

  // Look for existing conversation for this user-connection pair
  const existingRow = connectionId
    ? await client.queryOne<DbRow>(
        'SELECT * FROM ai_conversations WHERE user_id = ? AND connection_id = ?',
        [userId, connectionId]
      )
    : await client.queryOne<DbRow>(
        'SELECT * FROM ai_conversations WHERE user_id = ? AND connection_id IS NULL',
        [userId]
      );

  if (existingRow) {
    return rowToConversation(existingRow);
  }

  // Create new conversation
  const id = uuidv4();
  const now = new Date().toISOString();

  await client.execute(
    'INSERT INTO ai_conversations (id, user_id, connection_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, connectionId, null, now, now]
  );

  const created = await client.queryOne<DbRow>('SELECT * FROM ai_conversations WHERE id = ?', [id]);
  if (!created) throw new Error('Failed to create conversation');
  return rowToConversation(created);
}

export async function getConversationMessages(conversationId: string, limit: number = 50): Promise<AIMessage[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(
    'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?',
    [conversationId, limit]
  );
  return rows.map(rowToMessage);
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  sqlQuery?: string
): Promise<AIMessage> {
  const client = getDbClient();
  const id = uuidv4();
  const now = new Date().toISOString();

  await client.execute(
    'INSERT INTO ai_messages (id, conversation_id, role, content, sql_query, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, conversationId, role, content, sqlQuery || null, now]
  );

  // Update conversation's updated_at
  await client.execute(
    'UPDATE ai_conversations SET updated_at = ? WHERE id = ?',
    [now, conversationId]
  );

  const created = await client.queryOne<DbRow>('SELECT * FROM ai_messages WHERE id = ?', [id]);
  if (!created) throw new Error('Failed to add message');
  return rowToMessage(created);
}

export async function clearConversation(userId: string, connectionId: string | null): Promise<boolean> {
  const client = getDbClient();

  // Find the conversation
  const conversation = connectionId
    ? await client.queryOne<DbRow>(
        'SELECT id FROM ai_conversations WHERE user_id = ? AND connection_id = ?',
        [userId, connectionId]
      )
    : await client.queryOne<DbRow>(
        'SELECT id FROM ai_conversations WHERE user_id = ? AND connection_id IS NULL',
        [userId]
      );

  if (!conversation) return false;

  // Delete all messages in the conversation
  await client.execute('DELETE FROM ai_messages WHERE conversation_id = ?', [conversation.id as string]);

  // Delete the conversation itself
  const result = await client.execute('DELETE FROM ai_conversations WHERE id = ?', [conversation.id as string]);

  return result.changes > 0;
}

export async function clearAllUserConversations(userId: string): Promise<number> {
  const client = getDbClient();

  // Get all conversation IDs for this user
  const conversations = await client.query<DbRow>(
    'SELECT id FROM ai_conversations WHERE user_id = ?',
    [userId]
  );

  if (conversations.length === 0) return 0;

  // Delete all messages for these conversations
  for (const conv of conversations) {
    await client.execute('DELETE FROM ai_messages WHERE conversation_id = ?', [conv.id as string]);
  }

  // Delete all conversations
  const result = await client.execute('DELETE FROM ai_conversations WHERE user_id = ?', [userId]);

  return result.changes;
}
