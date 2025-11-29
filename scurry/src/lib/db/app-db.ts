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

// Password Reset Token types
export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

function rowToPasswordResetToken(row: DbRow): PasswordResetToken {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    token: row.token as string,
    expiresAt: new Date(row.expires_at as string),
    usedAt: row.used_at ? new Date(row.used_at as string) : null,
    createdAt: new Date(row.created_at as string),
  };
}

// Password Reset Token functions
export async function createPasswordResetToken(data: {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}): Promise<PasswordResetToken> {
  const client = getDbClient();
  const now = new Date().toISOString();

  await client.execute(
    `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [data.id, data.userId, data.token, data.expiresAt.toISOString(), now]
  );

  const created = await getPasswordResetTokenById(data.id);
  if (!created) throw new Error('Failed to create password reset token');
  return created;
}

export async function getPasswordResetTokenById(id: string): Promise<PasswordResetToken | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT * FROM password_reset_tokens WHERE id = ?', [id]);
  return row ? rowToPasswordResetToken(row) : null;
}

export async function getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT * FROM password_reset_tokens WHERE token = ?', [token]);
  return row ? rowToPasswordResetToken(row) : null;
}

export async function getValidPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const row = await client.queryOne<DbRow>(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > ? AND used_at IS NULL',
    [token, now]
  );
  return row ? rowToPasswordResetToken(row) : null;
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<boolean> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const result = await client.execute(
    'UPDATE password_reset_tokens SET used_at = ? WHERE token = ? AND used_at IS NULL',
    [now, token]
  );
  return result.changes > 0;
}

export async function deleteExpiredPasswordResetTokens(): Promise<number> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const result = await client.execute(
    'DELETE FROM password_reset_tokens WHERE expires_at < ? OR used_at IS NOT NULL',
    [now]
  );
  return result.changes;
}

export async function invalidateUserPasswordResetTokens(userId: string): Promise<number> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const result = await client.execute(
    'UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL',
    [now, userId]
  );
  return result.changes;
}
