import { v4 as uuidv4 } from 'uuid';
import { getDbClient, type DbRow } from './db-client';

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

function rowToComment(row: DbRow): QueryComment {
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

export async function createComment(data: {
  queryId: string;
  userId: string;
  content: string;
}): Promise<QueryComment> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const id = uuidv4();

  await client.execute(
    `INSERT INTO query_comments (id, query_id, user_id, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.queryId, data.userId, data.content, now, now]
  );

  const comment = await getCommentById(id);
  if (!comment) throw new Error('Failed to create comment');
  return comment;
}

export async function getCommentById(id: string): Promise<QueryComment | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(`
    SELECT 
      c.*,
      u.email as user_email,
      u.name as user_name
    FROM query_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `, [id]);

  return row ? rowToComment(row) : null;
}

export async function getQueryComments(queryId: string): Promise<QueryComment[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(`
    SELECT 
      c.*,
      u.email as user_email,
      u.name as user_name
    FROM query_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.query_id = ?
    ORDER BY c.created_at ASC
  `, [queryId]);

  return rows.map(rowToComment);
}

export async function updateComment(id: string, content: string): Promise<QueryComment | null> {
  const client = getDbClient();
  const now = new Date().toISOString();
  
  const result = await client.execute(
    `UPDATE query_comments SET content = ?, updated_at = ? WHERE id = ?`,
    [content, now, id]
  );

  if (result.changes === 0) return null;
  return getCommentById(id);
}

export async function deleteComment(id: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM query_comments WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function getCommentCount(queryId: string): Promise<number> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT COUNT(*) as count FROM query_comments WHERE query_id = ?', [queryId]);
  return row ? Number(row.count) : 0;
}
