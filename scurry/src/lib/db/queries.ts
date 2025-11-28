import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getUserTeams } from './teams';

const DB_PATH = process.env.APP_DB_PATH || path.join(process.cwd(), 'data', 'scurry.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export interface SavedQuery {
  id: string;
  userId: string;
  teamId: string | null;
  connectionId: string | null;
  name: string;
  description: string | null;
  sql: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
  team?: {
    id: string;
    name: string;
    slug: string;
  };
}

function rowToSavedQuery(row: Record<string, unknown>): SavedQuery {
  const query: SavedQuery = {
    id: row.id as string,
    userId: row.user_id as string,
    teamId: row.team_id as string | null,
    connectionId: row.connection_id as string | null,
    name: row.name as string,
    description: row.description as string | null,
    sql: row.sql as string,
    isPublic: Boolean(row.is_public),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };

  if (row.user_email) {
    query.user = {
      id: row.user_id as string,
      email: row.user_email as string,
      name: row.user_name as string | null,
    };
  }

  if (row.team_name) {
    query.team = {
      id: row.team_id as string,
      name: row.team_name as string,
      slug: row.team_slug as string,
    };
  }

  return query;
}

export function createSavedQuery(data: {
  userId: string;
  teamId?: string | null;
  connectionId?: string | null;
  name: string;
  description?: string | null;
  sql: string;
  isPublic?: boolean;
}): SavedQuery {
  const database = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  database.prepare(`
    INSERT INTO saved_queries (id, user_id, team_id, connection_id, name, description, sql, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.userId,
    data.teamId || null,
    data.connectionId || null,
    data.name,
    data.description || null,
    data.sql,
    data.isPublic ? 1 : 0,
    now,
    now
  );

  return getSavedQueryById(id)!;
}

export function getSavedQueryById(id: string): SavedQuery | null {
  const database = getDb();
  const row = database.prepare(`
    SELECT 
      q.*,
      u.email as user_email,
      u.name as user_name,
      t.name as team_name,
      t.slug as team_slug
    FROM saved_queries q
    LEFT JOIN users u ON q.user_id = u.id
    LEFT JOIN teams t ON q.team_id = t.id
    WHERE q.id = ?
  `).get(id);

  return row ? rowToSavedQuery(row as Record<string, unknown>) : null;
}

export function getUserSavedQueries(userId: string, options?: {
  teamId?: string | null;
  includeTeamQueries?: boolean;
}): SavedQuery[] {
  const database = getDb();
  
  if (options?.teamId) {
    // Get queries for a specific team
    const rows = database.prepare(`
      SELECT 
        q.*,
        u.email as user_email,
        u.name as user_name,
        t.name as team_name,
        t.slug as team_slug
      FROM saved_queries q
      LEFT JOIN users u ON q.user_id = u.id
      LEFT JOIN teams t ON q.team_id = t.id
      WHERE q.team_id = ?
      ORDER BY q.updated_at DESC
    `).all(options.teamId) as Array<Record<string, unknown>>;
    
    return rows.map(rowToSavedQuery);
  }
  
  if (options?.includeTeamQueries) {
    // Get user's personal queries + all team queries they have access to
    const userTeams = getUserTeams(userId);
    const teamIds = userTeams.map(t => t.id);
    
    if (teamIds.length === 0) {
      // Just personal queries
      const rows = database.prepare(`
        SELECT 
          q.*,
          u.email as user_email,
          u.name as user_name,
          t.name as team_name,
          t.slug as team_slug
        FROM saved_queries q
        LEFT JOIN users u ON q.user_id = u.id
        LEFT JOIN teams t ON q.team_id = t.id
        WHERE q.user_id = ? AND q.team_id IS NULL
        ORDER BY q.updated_at DESC
      `).all(userId) as Array<Record<string, unknown>>;
      
      return rows.map(rowToSavedQuery);
    }
    
    const placeholders = teamIds.map(() => '?').join(', ');
    const rows = database.prepare(`
      SELECT 
        q.*,
        u.email as user_email,
        u.name as user_name,
        t.name as team_name,
        t.slug as team_slug
      FROM saved_queries q
      LEFT JOIN users u ON q.user_id = u.id
      LEFT JOIN teams t ON q.team_id = t.id
      WHERE (q.user_id = ? AND q.team_id IS NULL) OR q.team_id IN (${placeholders})
      ORDER BY q.updated_at DESC
    `).all(userId, ...teamIds) as Array<Record<string, unknown>>;
    
    return rows.map(rowToSavedQuery);
  }
  
  // Just personal queries (no team)
  const rows = database.prepare(`
    SELECT 
      q.*,
      u.email as user_email,
      u.name as user_name,
      t.name as team_name,
      t.slug as team_slug
    FROM saved_queries q
    LEFT JOIN users u ON q.user_id = u.id
    LEFT JOIN teams t ON q.team_id = t.id
    WHERE q.user_id = ? AND q.team_id IS NULL
    ORDER BY q.updated_at DESC
  `).all(userId) as Array<Record<string, unknown>>;
  
  return rows.map(rowToSavedQuery);
}

export function updateSavedQuery(id: string, updates: {
  name?: string;
  description?: string | null;
  sql?: string;
  teamId?: string | null;
  connectionId?: string | null;
  isPublic?: boolean;
}): SavedQuery | null {
  const database = getDb();
  const existing = getSavedQueryById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.sql !== undefined) {
    fields.push('sql = ?');
    values.push(updates.sql);
  }
  if (updates.teamId !== undefined) {
    fields.push('team_id = ?');
    values.push(updates.teamId);
  }
  if (updates.connectionId !== undefined) {
    fields.push('connection_id = ?');
    values.push(updates.connectionId);
  }
  if (updates.isPublic !== undefined) {
    fields.push('is_public = ?');
    values.push(updates.isPublic ? 1 : 0);
  }

  values.push(id);
  database.prepare(`UPDATE saved_queries SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return getSavedQueryById(id);
}

export function deleteSavedQuery(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM saved_queries WHERE id = ?').run(id);
  return result.changes > 0;
}

export function canUserAccessQuery(userId: string, queryId: string): boolean {
  const query = getSavedQueryById(queryId);
  if (!query) return false;
  
  // Owner can always access
  if (query.userId === userId) return true;
  
  // Check if query is in a team the user belongs to
  if (query.teamId) {
    const userTeams = getUserTeams(userId);
    return userTeams.some(t => t.id === query.teamId);
  }
  
  // Public queries can be accessed by anyone
  if (query.isPublic) return true;
  
  return false;
}

export function canUserModifyQuery(userId: string, queryId: string): boolean {
  const query = getSavedQueryById(queryId);
  if (!query) return false;
  
  // Only the owner can modify
  return query.userId === userId;
}
