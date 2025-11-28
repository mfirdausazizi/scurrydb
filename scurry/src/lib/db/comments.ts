import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = process.env.APP_DB_PATH || path.join(process.cwd(), 'data', 'scurrydb.db');

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

export interface QueryComment {
  id: string;
  queryId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

function rowToComment(row: Record<string, unknown>): QueryComment {
  const comment: QueryComment = {
    id: row.id as string,
    queryId: row.query_id as string,
    userId: row.user_id as string,
    content: row.content as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };

  if (row.user_email) {
    comment.user = {
      id: row.user_id as string,
      email: row.user_email as string,
      name: row.user_name as string | null,
    };
  }

  return comment;
}

export function createComment(data: {
  queryId: string;
  userId: string;
  content: string;
}): QueryComment {
  const database = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  database.prepare(`
    INSERT INTO query_comments (id, query_id, user_id, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.queryId, data.userId, data.content, now, now);

  return getCommentById(id)!;
}

export function getCommentById(id: string): QueryComment | null {
  const database = getDb();
  const row = database.prepare(`
    SELECT 
      c.*,
      u.email as user_email,
      u.name as user_name
    FROM query_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(id);

  return row ? rowToComment(row as Record<string, unknown>) : null;
}

export function getQueryComments(queryId: string): QueryComment[] {
  const database = getDb();
  const rows = database.prepare(`
    SELECT 
      c.*,
      u.email as user_email,
      u.name as user_name
    FROM query_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.query_id = ?
    ORDER BY c.created_at ASC
  `).all(queryId) as Array<Record<string, unknown>>;

  return rows.map(rowToComment);
}

export function updateComment(id: string, content: string): QueryComment | null {
  const database = getDb();
  const now = new Date().toISOString();
  
  const result = database.prepare(`
    UPDATE query_comments SET content = ?, updated_at = ? WHERE id = ?
  `).run(content, now, id);

  if (result.changes === 0) return null;
  return getCommentById(id);
}

export function deleteComment(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM query_comments WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getCommentCount(queryId: string): number {
  const database = getDb();
  const row = database.prepare('SELECT COUNT(*) as count FROM query_comments WHERE query_id = ?').get(queryId) as { count: number };
  return row.count;
}
