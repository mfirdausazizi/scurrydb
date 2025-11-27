import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import type { DatabaseConnection, DatabaseType } from '@/types';

const DB_PATH = process.env.APP_DB_PATH || path.join(process.cwd(), 'data', 'scurry.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const database = getDb();
  
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      database_name TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      ssl INTEGER DEFAULT 0,
      color TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_connections_name ON connections(name);
    CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
  `);
}

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

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    name: row.name as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    expiresAt: new Date(row.expires_at as string),
    createdAt: new Date(row.created_at as string),
  };
}

function rowToConnection(row: Record<string, unknown>): DatabaseConnection {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as DatabaseType,
    host: row.host as string,
    port: row.port as number,
    database: row.database_name as string,
    username: row.username as string,
    password: decrypt(row.password as string),
    ssl: Boolean(row.ssl),
    color: row.color as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// User functions
export function createUser(user: { id: string; email: string; passwordHash: string; name?: string }): User {
  const database = getDb();
  const now = new Date().toISOString();
  
  const stmt = database.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(user.id, user.email, user.passwordHash, user.name || null, now, now);
  return getUserById(user.id)!;
}

export function getUserById(id: string): User | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return row ? rowToUser(row as Record<string, unknown>) : null;
}

export function getUserByEmail(email: string): User | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  return row ? rowToUser(row as Record<string, unknown>) : null;
}

// Session functions
export function createSession(session: { id: string; userId: string; expiresAt: Date }): Session {
  const database = getDb();
  const now = new Date().toISOString();
  
  const stmt = database.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(session.id, session.userId, session.expiresAt.toISOString(), now);
  return getSessionById(session.id)!;
}

export function getSessionById(id: string): Session | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  return row ? rowToSession(row as Record<string, unknown>) : null;
}

export function getValidSession(id: string): Session | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').get(id, new Date().toISOString());
  return row ? rowToSession(row as Record<string, unknown>) : null;
}

export function deleteSession(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  return result.changes > 0;
}

export function deleteExpiredSessions(): number {
  const database = getDb();
  const result = database.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
  return result.changes;
}

// Connection functions (with user filtering)
export function getAllConnections(userId?: string): DatabaseConnection[] {
  const database = getDb();
  if (userId) {
    const rows = database.prepare('SELECT * FROM connections WHERE user_id = ? ORDER BY name').all(userId);
    return rows.map((row) => rowToConnection(row as Record<string, unknown>));
  }
  const rows = database.prepare('SELECT * FROM connections ORDER BY name').all();
  return rows.map((row) => rowToConnection(row as Record<string, unknown>));
}

export function getConnectionById(id: string, userId?: string): DatabaseConnection | null {
  const database = getDb();
  if (userId) {
    const row = database.prepare('SELECT * FROM connections WHERE id = ? AND user_id = ?').get(id, userId);
    return row ? rowToConnection(row as Record<string, unknown>) : null;
  }
  const row = database.prepare('SELECT * FROM connections WHERE id = ?').get(id);
  return row ? rowToConnection(row as Record<string, unknown>) : null;
}

export function createConnection(connection: Omit<DatabaseConnection, 'createdAt' | 'updatedAt'>, userId?: string): DatabaseConnection {
  const database = getDb();
  const now = new Date().toISOString();
  
  const stmt = database.prepare(`
    INSERT INTO connections (id, user_id, name, type, host, port, database_name, username, password, ssl, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    connection.id,
    userId || null,
    connection.name,
    connection.type,
    connection.host,
    connection.port,
    connection.database,
    connection.username,
    encrypt(connection.password),
    connection.ssl ? 1 : 0,
    connection.color || null,
    now,
    now
  );
  
  return getConnectionById(connection.id)!;
}

export function updateConnection(id: string, updates: Partial<Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>>): DatabaseConnection | null {
  const database = getDb();
  const existing = getConnectionById(id);
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
    values.push(updates.ssl ? 1 : 0);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  
  values.push(id);
  
  const stmt = database.prepare(`UPDATE connections SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  return getConnectionById(id);
}

export function deleteConnection(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM connections WHERE id = ?').run(id);
  return result.changes > 0;
}
