import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getUserTeams } from './teams';

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

export type ActivityAction =
  | 'query_saved'
  | 'query_updated'
  | 'query_deleted'
  | 'query_shared'
  | 'comment_added'
  | 'connection_shared'
  | 'connection_unshared'
  | 'member_joined'
  | 'member_invited'
  | 'member_removed'
  | 'team_created'
  | 'data_inserted'
  | 'data_updated'
  | 'data_deleted';

export type ResourceType = 'query' | 'connection' | 'team' | 'member' | 'comment';

export interface Activity {
  id: string;
  teamId: string | null;
  userId: string;
  action: ActivityAction;
  resourceType: ResourceType | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
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

function rowToActivity(row: Record<string, unknown>): Activity {
  const activity: Activity = {
    id: row.id as string,
    teamId: row.team_id as string | null,
    userId: row.user_id as string,
    action: row.action as ActivityAction,
    resourceType: row.resource_type as ResourceType | null,
    resourceId: row.resource_id as string | null,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
    createdAt: new Date(row.created_at as string),
  };

  if (row.user_email) {
    activity.user = {
      id: row.user_id as string,
      email: row.user_email as string,
      name: row.user_name as string | null,
    };
  }

  if (row.team_name) {
    activity.team = {
      id: row.team_id as string,
      name: row.team_name as string,
      slug: row.team_slug as string,
    };
  }

  return activity;
}

export function logActivity(data: {
  teamId?: string | null;
  userId: string;
  action: ActivityAction;
  resourceType?: ResourceType | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Activity {
  const database = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  database.prepare(`
    INSERT INTO activities (id, team_id, user_id, action, resource_type, resource_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.teamId || null,
    data.userId,
    data.action,
    data.resourceType || null,
    data.resourceId || null,
    data.metadata ? JSON.stringify(data.metadata) : null,
    now
  );

  return getActivityById(id)!;
}

export function getActivityById(id: string): Activity | null {
  const database = getDb();
  const row = database.prepare(`
    SELECT 
      a.*,
      u.email as user_email,
      u.name as user_name,
      t.name as team_name,
      t.slug as team_slug
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN teams t ON a.team_id = t.id
    WHERE a.id = ?
  `).get(id);

  return row ? rowToActivity(row as Record<string, unknown>) : null;
}

export function getUserActivityFeed(userId: string, options?: {
  limit?: number;
  offset?: number;
  teamId?: string | null;
}): Activity[] {
  const database = getDb();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  if (options?.teamId) {
    // Get activities for a specific team
    const rows = database.prepare(`
      SELECT 
        a.*,
        u.email as user_email,
        u.name as user_name,
        t.name as team_name,
        t.slug as team_slug
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN teams t ON a.team_id = t.id
      WHERE a.team_id = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(options.teamId, limit, offset) as Array<Record<string, unknown>>;

    return rows.map(rowToActivity);
  }

  // Get user's personal activities + all team activities they have access to
  const userTeams = getUserTeams(userId);
  const teamIds = userTeams.map(t => t.id);

  if (teamIds.length === 0) {
    // Just personal activities (no team)
    const rows = database.prepare(`
      SELECT 
        a.*,
        u.email as user_email,
        u.name as user_name,
        t.name as team_name,
        t.slug as team_slug
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN teams t ON a.team_id = t.id
      WHERE a.user_id = ? AND a.team_id IS NULL
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as Array<Record<string, unknown>>;

    return rows.map(rowToActivity);
  }

  const placeholders = teamIds.map(() => '?').join(', ');
  const rows = database.prepare(`
    SELECT 
      a.*,
      u.email as user_email,
      u.name as user_name,
      t.name as team_name,
      t.slug as team_slug
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN teams t ON a.team_id = t.id
    WHERE (a.user_id = ? AND a.team_id IS NULL) OR a.team_id IN (${placeholders})
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, ...teamIds, limit, offset) as Array<Record<string, unknown>>;

  return rows.map(rowToActivity);
}

export function getActivityDescription(activity: Activity): string {
  const userName = activity.user?.name || activity.user?.email || 'Someone';
  const metadata = activity.metadata || {};

  switch (activity.action) {
    case 'query_saved':
      return `${userName} saved a query "${metadata.queryName || 'Untitled'}"`;
    case 'query_updated':
      return `${userName} updated query "${metadata.queryName || 'Untitled'}"`;
    case 'query_deleted':
      return `${userName} deleted query "${metadata.queryName || 'Untitled'}"`;
    case 'query_shared':
      return `${userName} shared query "${metadata.queryName || 'Untitled'}" with the team`;
    case 'comment_added':
      return `${userName} commented on "${metadata.queryName || 'a query'}"`;
    case 'connection_shared':
      return `${userName} shared connection "${metadata.connectionName || 'Untitled'}" with the team`;
    case 'connection_unshared':
      return `${userName} unshared connection "${metadata.connectionName || 'Untitled'}"`;
    case 'member_joined':
      return `${metadata.memberName || metadata.memberEmail || 'A new member'} joined the team`;
    case 'member_invited':
      return `${userName} invited ${metadata.inviteeEmail || 'someone'} to the team`;
    case 'member_removed':
      return `${userName} removed ${metadata.memberName || metadata.memberEmail || 'a member'} from the team`;
    case 'team_created':
      return `${userName} created the team "${metadata.teamName || 'Untitled'}"`;
    case 'data_inserted':
      return `${userName} inserted ${metadata.rowCount || 1} row(s) into "${metadata.tableName || 'a table'}"`;
    case 'data_updated':
      return `${userName} updated ${metadata.rowCount || 1} row(s) in "${metadata.tableName || 'a table'}"`;
    case 'data_deleted':
      return `${userName} deleted ${metadata.rowCount || 1} row(s) from "${metadata.tableName || 'a table'}"`;
    default:
      return `${userName} performed an action`;
  }
}

export function deleteOldActivities(daysToKeep: number = 90): number {
  const database = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = database.prepare('DELETE FROM activities WHERE created_at < ?').run(cutoffDate.toISOString());
  return result.changes;
}
