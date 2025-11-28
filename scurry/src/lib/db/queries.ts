import { v4 as uuidv4 } from 'uuid';
import { getUserTeams } from './teams';
import { getDbClient, getDbType, type DbRow } from './db-client';

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

function rowToSavedQuery(row: DbRow): SavedQuery {
  const dbType = getDbType();
  const query: SavedQuery = {
    id: row.id as string,
    userId: row.user_id as string,
    teamId: row.team_id as string | null,
    connectionId: row.connection_id as string | null,
    name: row.name as string,
    description: row.description as string | null,
    sql: row.sql as string,
    isPublic: dbType === 'postgres' ? Boolean(row.is_public) : Boolean(row.is_public),
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

export async function createSavedQuery(data: {
  userId: string;
  teamId?: string | null;
  connectionId?: string | null;
  name: string;
  description?: string | null;
  sql: string;
  isPublic?: boolean;
}): Promise<SavedQuery> {
  const client = getDbClient();
  const dbType = getDbType();
  const now = new Date().toISOString();
  const id = uuidv4();

  const isPublicValue = dbType === 'postgres' 
    ? (data.isPublic || false) 
    : (data.isPublic ? 1 : 0);

  await client.execute(
    `INSERT INTO saved_queries (id, user_id, team_id, connection_id, name, description, sql, is_public, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.userId,
      data.teamId || null,
      data.connectionId || null,
      data.name,
      data.description || null,
      data.sql,
      isPublicValue,
      now,
      now
    ]
  );

  const query = await getSavedQueryById(id);
  if (!query) throw new Error('Failed to create saved query');
  return query;
}

export async function getSavedQueryById(id: string): Promise<SavedQuery | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(`
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
  `, [id]);

  return row ? rowToSavedQuery(row) : null;
}

export async function getUserSavedQueries(userId: string, options?: {
  teamId?: string | null;
  includeTeamQueries?: boolean;
}): Promise<SavedQuery[]> {
  const client = getDbClient();
  const dbType = getDbType();
  
  if (options?.teamId) {
    // Get queries for a specific team
    const rows = await client.query<DbRow>(`
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
    `, [options.teamId]);
    
    return rows.map(rowToSavedQuery);
  }
  
  if (options?.includeTeamQueries) {
    // Get user's personal queries + all team queries they have access to
    const userTeams = await getUserTeams(userId);
    const teamIds = userTeams.map(t => t.id);
    
    if (teamIds.length === 0) {
      // Just personal queries
      const rows = await client.query<DbRow>(`
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
      `, [userId]);
      
      return rows.map(rowToSavedQuery);
    }
    
    const placeholders = teamIds.map((_, i) => {
      if (dbType === 'postgres') {
        return `$${i + 2}`;
      }
      return '?';
    }).join(', ');

    const params = [userId, ...teamIds];
    
    const sql = dbType === 'postgres'
      ? `SELECT 
          q.*,
          u.email as user_email,
          u.name as user_name,
          t.name as team_name,
          t.slug as team_slug
        FROM saved_queries q
        LEFT JOIN users u ON q.user_id = u.id
        LEFT JOIN teams t ON q.team_id = t.id
        WHERE (q.user_id = $1 AND q.team_id IS NULL) OR q.team_id IN (${placeholders})
        ORDER BY q.updated_at DESC`
      : `SELECT 
          q.*,
          u.email as user_email,
          u.name as user_name,
          t.name as team_name,
          t.slug as team_slug
        FROM saved_queries q
        LEFT JOIN users u ON q.user_id = u.id
        LEFT JOIN teams t ON q.team_id = t.id
        WHERE (q.user_id = ? AND q.team_id IS NULL) OR q.team_id IN (${placeholders})
        ORDER BY q.updated_at DESC`;
    
    const rows = await client.query<DbRow>(sql, params);
    return rows.map(rowToSavedQuery);
  }
  
  // Just personal queries (no team)
  const rows = await client.query<DbRow>(`
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
  `, [userId]);
  
  return rows.map(rowToSavedQuery);
}

export async function updateSavedQuery(id: string, updates: {
  name?: string;
  description?: string | null;
  sql?: string;
  teamId?: string | null;
  connectionId?: string | null;
  isPublic?: boolean;
}): Promise<SavedQuery | null> {
  const client = getDbClient();
  const dbType = getDbType();
  const existing = await getSavedQueryById(id);
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
    values.push(dbType === 'postgres' ? updates.isPublic : (updates.isPublic ? 1 : 0));
  }

  values.push(id);
  await client.execute(`UPDATE saved_queries SET ${fields.join(', ')} WHERE id = ?`, values);

  return getSavedQueryById(id);
}

export async function deleteSavedQuery(id: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM saved_queries WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function canUserAccessQuery(userId: string, queryId: string): Promise<boolean> {
  const query = await getSavedQueryById(queryId);
  if (!query) return false;
  
  // Owner can always access
  if (query.userId === userId) return true;
  
  // Check if query is in a team the user belongs to
  if (query.teamId) {
    const userTeams = await getUserTeams(userId);
    return userTeams.some(t => t.id === query.teamId);
  }
  
  // Public queries can be accessed by anyone
  if (query.isPublic) return true;
  
  return false;
}

export async function canUserModifyQuery(userId: string, queryId: string): Promise<boolean> {
  const query = await getSavedQueryById(queryId);
  if (!query) return false;
  
  // Only the owner can modify
  return query.userId === userId;
}
