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
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
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
      updated_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_connections_name ON connections(name);
  `);
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

export function getAllConnections(): DatabaseConnection[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM connections ORDER BY name').all();
  return rows.map((row) => rowToConnection(row as Record<string, unknown>));
}

export function getConnectionById(id: string): DatabaseConnection | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM connections WHERE id = ?').get(id);
  return row ? rowToConnection(row as Record<string, unknown>) : null;
}

export function createConnection(connection: Omit<DatabaseConnection, 'createdAt' | 'updatedAt'>): DatabaseConnection {
  const database = getDb();
  const now = new Date().toISOString();
  
  const stmt = database.prepare(`
    INSERT INTO connections (id, name, type, host, port, database_name, username, password, ssl, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    connection.id,
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
