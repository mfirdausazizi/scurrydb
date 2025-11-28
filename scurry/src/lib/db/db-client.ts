// Unified database client interface for SQLite (local), Turso (serverless), and PostgreSQL (production)
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getTursoClient, isTursoEnabled } from './turso-adapter';
import { getPostgresPool, isPostgresEnabled, withTransaction as pgWithTransaction } from './drivers/postgres-app';
import type { Client as TursoClient } from '@libsql/client';
import type { Pool as PgPool, PoolClient } from 'pg';

export type DbType = 'postgres' | 'turso' | 'sqlite';

export interface DbRow {
  [key: string]: unknown;
}

export interface DbResult {
  changes: number;
  lastInsertRowid?: number | bigint;
}

// Detect which database type to use based on environment
export function getDbType(): DbType {
  if (isPostgresEnabled()) return 'postgres';
  if (isTursoEnabled()) return 'turso';
  return 'sqlite';
}

// Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
export function convertPlaceholders(sql: string, dbType: DbType): string {
  if (dbType !== 'postgres') return sql;
  
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// Singleton instances
let sqliteDb: Database.Database | null = null;
let tursoClient: TursoClient | null = null;
let pgPool: PgPool | null = null;
let schemaInitialized = false;

const DB_PATH = process.env.APP_DB_PATH || path.join(process.cwd(), 'data', 'scurrydb.db');

function getSqliteDb(): Database.Database {
  if (!sqliteDb) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    sqliteDb = new Database(DB_PATH);
    sqliteDb.pragma('journal_mode = WAL');
  }
  return sqliteDb;
}

// Initialize schema based on database type
async function ensureSchemaInitialized(): Promise<void> {
  if (schemaInitialized) return;
  
  const dbType = getDbType();
  const client = getClient();
  
  if (dbType === 'sqlite') {
    // SQLite schema is initialized synchronously
    const db = getSqliteDb();
    initializeSqliteSchema(db);
    migrateSqliteSchema(db);
  } else if (dbType === 'turso') {
    await initializeTursoSchema(client.turso!);
  } else if (dbType === 'postgres') {
    await initializePostgresSchema(client.postgres!);
  }
  
  schemaInitialized = true;
}

function initializeSqliteSchema(database: Database.Database) {
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
    
    CREATE TABLE IF NOT EXISTS ai_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL DEFAULT 'openai',
      api_key TEXT,
      model TEXT,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 2048,
      base_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);
    
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      connection_id TEXT,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
    
    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sql_query TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
    
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
    CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
    
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      invited_by TEXT,
      joined_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(team_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
    
    CREATE TABLE IF NOT EXISTS team_invitations (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      invited_by TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
    
    CREATE TABLE IF NOT EXISTS shared_connections (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      shared_by TEXT NOT NULL,
      permission TEXT NOT NULL DEFAULT 'read',
      created_at TEXT NOT NULL,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_by) REFERENCES users(id),
      UNIQUE(connection_id, team_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_shared_connections_team_id ON shared_connections(team_id);
    CREATE INDEX IF NOT EXISTS idx_shared_connections_connection_id ON shared_connections(connection_id);
    
    CREATE TABLE IF NOT EXISTS saved_queries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT,
      connection_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      sql TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id ON saved_queries(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_queries_team_id ON saved_queries(team_id);
    
    CREATE TABLE IF NOT EXISTS query_comments (
      id TEXT PRIMARY KEY,
      query_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (query_id) REFERENCES saved_queries(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_query_comments_query_id ON query_comments(query_id);
    
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_activities_team_id ON activities(team_id);
    CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
    
    CREATE TABLE IF NOT EXISTS data_change_logs (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      row_identifier TEXT,
      old_values TEXT,
      new_values TEXT,
      user_id TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_data_change_logs_connection_id ON data_change_logs(connection_id);
    CREATE INDEX IF NOT EXISTS idx_data_change_logs_table_name ON data_change_logs(table_name);
    CREATE INDEX IF NOT EXISTS idx_data_change_logs_user_id ON data_change_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_data_change_logs_applied_at ON data_change_logs(applied_at);
  `);
}

function migrateSqliteSchema(database: Database.Database) {
  const tableExists = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='connections'"
  ).get();
  
  if (tableExists) {
    const columns = database.prepare("PRAGMA table_info(connections)").all() as Array<{ name: string }>;
    const hasUserId = columns.some((col) => col.name === 'user_id');
    
    if (!hasUserId) {
      database.exec("ALTER TABLE connections ADD COLUMN user_id TEXT REFERENCES users(id)");
      database.exec("CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id)");
    }
  }
}

async function initializeTursoSchema(client: TursoClient): Promise<void> {
  // Turso uses the same schema as SQLite
  const statements = getSqliteSchemaStatements();
  for (const stmt of statements) {
    if (stmt.trim()) {
      await client.execute(stmt);
    }
  }
}

async function initializePostgresSchema(pool: PgPool): Promise<void> {
  const schema = getPostgresSchema();
  await pool.query(schema);
}

function getSqliteSchemaStatements(): string[] {
  // Return individual CREATE statements for Turso batch execution
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`,
    `CREATE TABLE IF NOT EXISTS connections (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_connections_name ON connections(name)`,
    `CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id)`,
    `CREATE TABLE IF NOT EXISTS ai_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL DEFAULT 'openai',
      api_key TEXT,
      model TEXT,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 2048,
      base_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id)`,
    `CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      connection_id TEXT,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id)`,
    `CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sql_query TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id)`,
    `CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id)`,
    `CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      invited_by TEXT,
      joined_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(team_id, user_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)`,
    `CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)`,
    `CREATE TABLE IF NOT EXISTS team_invitations (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      invited_by TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id)`,
    `CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token)`,
    `CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email)`,
    `CREATE TABLE IF NOT EXISTS shared_connections (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      shared_by TEXT NOT NULL,
      permission TEXT NOT NULL DEFAULT 'read',
      created_at TEXT NOT NULL,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_by) REFERENCES users(id),
      UNIQUE(connection_id, team_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_shared_connections_team_id ON shared_connections(team_id)`,
    `CREATE INDEX IF NOT EXISTS idx_shared_connections_connection_id ON shared_connections(connection_id)`,
    `CREATE TABLE IF NOT EXISTS saved_queries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT,
      connection_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      sql TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id ON saved_queries(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_saved_queries_team_id ON saved_queries(team_id)`,
    `CREATE TABLE IF NOT EXISTS query_comments (
      id TEXT PRIMARY KEY,
      query_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (query_id) REFERENCES saved_queries(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_query_comments_query_id ON query_comments(query_id)`,
    `CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_activities_team_id ON activities(team_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at)`,
    `CREATE TABLE IF NOT EXISTS data_change_logs (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      row_identifier TEXT,
      old_values TEXT,
      new_values TEXT,
      user_id TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_data_change_logs_connection_id ON data_change_logs(connection_id)`,
    `CREATE INDEX IF NOT EXISTS idx_data_change_logs_table_name ON data_change_logs(table_name)`,
    `CREATE INDEX IF NOT EXISTS idx_data_change_logs_user_id ON data_change_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_data_change_logs_applied_at ON data_change_logs(applied_at)`,
  ];
}

function getPostgresSchema(): string {
  return `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      database_name TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      ssl BOOLEAN DEFAULT false,
      color TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_connections_name ON connections(name);
    CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
    
    CREATE TABLE IF NOT EXISTS ai_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'openai',
      api_key TEXT,
      model TEXT,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 2048,
      base_url TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);
    
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connection_id TEXT REFERENCES connections(id) ON DELETE SET NULL,
      title TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
    
    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sql_query TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
    
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
    CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
    
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      invited_by TEXT,
      joined_at TIMESTAMPTZ NOT NULL,
      UNIQUE(team_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
    
    CREATE TABLE IF NOT EXISTS team_invitations (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      invited_by TEXT NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
    
    CREATE TABLE IF NOT EXISTS shared_connections (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      shared_by TEXT NOT NULL REFERENCES users(id),
      permission TEXT NOT NULL DEFAULT 'read',
      created_at TIMESTAMPTZ NOT NULL,
      UNIQUE(connection_id, team_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_shared_connections_team_id ON shared_connections(team_id);
    CREATE INDEX IF NOT EXISTS idx_shared_connections_connection_id ON shared_connections(connection_id);
    
    CREATE TABLE IF NOT EXISTS saved_queries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
      connection_id TEXT REFERENCES connections(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      sql TEXT NOT NULL,
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id ON saved_queries(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_queries_team_id ON saved_queries(team_id);
    
    CREATE TABLE IF NOT EXISTS query_comments (
      id TEXT PRIMARY KEY,
      query_id TEXT NOT NULL REFERENCES saved_queries(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_query_comments_query_id ON query_comments(query_id);
    
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_activities_team_id ON activities(team_id);
    CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
    
    CREATE TABLE IF NOT EXISTS data_change_logs (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      row_identifier JSONB,
      old_values JSONB,
      new_values JSONB,
      user_id TEXT NOT NULL REFERENCES users(id),
      applied_at TIMESTAMPTZ NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_data_change_logs_connection_id ON data_change_logs(connection_id);
    CREATE INDEX IF NOT EXISTS idx_data_change_logs_table_name ON data_change_logs(table_name);
    CREATE INDEX IF NOT EXISTS idx_data_change_logs_user_id ON data_change_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_data_change_logs_applied_at ON data_change_logs(applied_at);
  `;
}

interface ClientInstances {
  sqlite: Database.Database | null;
  turso: TursoClient | null;
  postgres: PgPool | null;
}

function getClient(): ClientInstances {
  const dbType = getDbType();
  
  if (dbType === 'postgres') {
    if (!pgPool) {
      pgPool = getPostgresPool();
    }
    return { sqlite: null, turso: null, postgres: pgPool };
  } else if (dbType === 'turso') {
    if (!tursoClient) {
      tursoClient = getTursoClient();
    }
    return { sqlite: null, turso: tursoClient, postgres: null };
  } else {
    return { sqlite: getSqliteDb(), turso: null, postgres: null };
  }
}

// Unified database client class
export class UnifiedDbClient {
  private dbType: DbType;
  private initialized: boolean = false;

  constructor() {
    this.dbType = getDbType();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await ensureSchemaInitialized();
      this.initialized = true;
    }
  }

  getDbType(): DbType {
    return this.dbType;
  }

  async execute(sql: string, params?: unknown[]): Promise<DbResult> {
    await this.ensureInitialized();
    const client = getClient();
    const convertedSql = convertPlaceholders(sql, this.dbType);

    if (this.dbType === 'postgres' && client.postgres) {
      const result = await client.postgres.query(convertedSql, params);
      return {
        changes: result.rowCount ?? 0,
      };
    } else if (this.dbType === 'turso' && client.turso) {
      const result = await client.turso.execute({
        sql,
        args: (params || []) as (string | number | null | undefined)[],
      });
      return {
        changes: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid,
      };
    } else if (client.sqlite) {
      const stmt = client.sqlite.prepare(sql);
      const result = stmt.run(...(params || []));
      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
      };
    }
    throw new Error('No database client available');
  }

  async query<T = DbRow>(sql: string, params?: unknown[]): Promise<T[]> {
    await this.ensureInitialized();
    const client = getClient();
    const convertedSql = convertPlaceholders(sql, this.dbType);

    if (this.dbType === 'postgres' && client.postgres) {
      const result = await client.postgres.query(convertedSql, params);
      return result.rows as T[];
    } else if (this.dbType === 'turso' && client.turso) {
      const result = await client.turso.execute({
        sql,
        args: (params || []) as (string | number | null | undefined)[],
      });
      return result.rows as T[];
    } else if (client.sqlite) {
      const stmt = client.sqlite.prepare(sql);
      return stmt.all(...(params || [])) as T[];
    }
    throw new Error('No database client available');
  }

  async queryOne<T = DbRow>(sql: string, params?: unknown[]): Promise<T | null> {
    await this.ensureInitialized();
    const client = getClient();
    const convertedSql = convertPlaceholders(sql, this.dbType);

    if (this.dbType === 'postgres' && client.postgres) {
      const result = await client.postgres.query(convertedSql, params);
      return (result.rows[0] as T) || null;
    } else if (this.dbType === 'turso' && client.turso) {
      const result = await client.turso.execute({
        sql,
        args: (params || []) as (string | number | null | undefined)[],
      });
      return (result.rows[0] as T) || null;
    } else if (client.sqlite) {
      const stmt = client.sqlite.prepare(sql);
      const row = stmt.get(...(params || []));
      return row ? (row as T) : null;
    }
    throw new Error('No database client available');
  }

  async transaction<T>(callback: (client: UnifiedDbClient) => Promise<T>): Promise<T> {
    await this.ensureInitialized();
    const clientInstances = getClient();

    if (this.dbType === 'postgres' && clientInstances.postgres) {
      return pgWithTransaction(async () => {
        return callback(this);
      });
    } else if (this.dbType === 'turso' && clientInstances.turso) {
      // Turso handles transactions via batch - for now, just run the callback
      // A proper implementation would use clientInstances.turso.transaction()
      return callback(this);
    } else if (clientInstances.sqlite) {
      const transaction = clientInstances.sqlite.transaction(() => {
        // SQLite transactions are sync, but we need to handle async callback
        // This is a limitation - for true async, we'd need to restructure
        throw new Error('SQLite transactions with async callbacks require restructuring');
      });
      // For SQLite, we'll just run without transaction wrapper for now
      // The calling code should handle this appropriately
      return callback(this);
    }
    throw new Error('No database client available');
  }
}

// Singleton instance
let dbClient: UnifiedDbClient | null = null;

export function getDbClient(): UnifiedDbClient {
  if (!dbClient) {
    dbClient = new UnifiedDbClient();
  }
  return dbClient;
}

// Export for type compatibility
export { type Pool as PgPool } from 'pg';
