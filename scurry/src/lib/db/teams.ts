import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import type { TeamRole, ConnectionPermission } from '@/lib/validations/team';
import type { DatabaseConnection, DatabaseType } from '@/types';
import { decrypt } from '@/lib/utils/encryption';
import { getDbClient, getDbType, type DbRow } from './db-client';

// Types
export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  invitedBy: string | null;
  joinedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  team?: Team;
}

export interface SharedConnection {
  id: string;
  connectionId: string;
  teamId: string;
  sharedBy: string;
  permission: ConnectionPermission;
  createdAt: Date;
  connection?: DatabaseConnection;
}

export interface TeamWithMembership extends Team {
  role: TeamRole;
  memberCount: number;
}

// Row converters
function rowToTeam(row: DbRow): Team {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    ownerId: row.owner_id as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function rowToTeamMember(row: DbRow): TeamMember {
  const member: TeamMember = {
    id: row.id as string,
    teamId: row.team_id as string,
    userId: row.user_id as string,
    role: row.role as TeamRole,
    invitedBy: row.invited_by as string | null,
    joinedAt: new Date(row.joined_at as string),
  };
  
  if (row.user_email) {
    member.user = {
      id: row.user_id as string,
      email: row.user_email as string,
      name: row.user_name as string | null,
    };
  }
  
  return member;
}

function rowToTeamInvitation(row: DbRow): TeamInvitation {
  const invitation: TeamInvitation = {
    id: row.id as string,
    teamId: row.team_id as string,
    email: row.email as string,
    role: row.role as TeamRole,
    invitedBy: row.invited_by as string,
    token: row.token as string,
    expiresAt: new Date(row.expires_at as string),
    createdAt: new Date(row.created_at as string),
  };
  
  if (row.team_name) {
    invitation.team = {
      id: row.team_id as string,
      name: row.team_name as string,
      slug: row.team_slug as string,
      ownerId: row.team_owner_id as string,
      createdAt: new Date(row.team_created_at as string),
      updatedAt: new Date(row.team_updated_at as string),
    };
  }
  
  return invitation;
}

function rowToSharedConnection(row: DbRow): SharedConnection {
  const dbType = getDbType();
  const shared: SharedConnection = {
    id: row.id as string,
    connectionId: row.connection_id as string,
    teamId: row.team_id as string,
    sharedBy: row.shared_by as string,
    permission: row.permission as ConnectionPermission,
    createdAt: new Date(row.created_at as string),
  };
  
  if (row.conn_id) {
    shared.connection = {
      id: row.conn_id as string,
      name: row.conn_name as string,
      type: row.conn_type as DatabaseType,
      host: row.conn_host as string,
      port: row.conn_port as number,
      database: row.conn_database_name as string,
      username: row.conn_username as string,
      password: decrypt(row.conn_password as string),
      ssl: dbType === 'postgres' ? Boolean(row.conn_ssl) : Boolean(row.conn_ssl),
      color: row.conn_color as string | undefined,
      createdAt: new Date(row.conn_created_at as string),
      updatedAt: new Date(row.conn_updated_at as string),
    };
  }
  
  return shared;
}

// Team CRUD
export async function createTeam(data: { name: string; slug: string; ownerId: string }): Promise<Team> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const id = uuidv4();
  const memberId = uuidv4();
  
  // Create team
  await client.execute(
    `INSERT INTO teams (id, name, slug, owner_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.slug, data.ownerId, now, now]
  );
  
  // Add owner as member
  await client.execute(
    `INSERT INTO team_members (id, team_id, user_id, role, joined_at)
     VALUES (?, ?, ?, 'owner', ?)`,
    [memberId, id, data.ownerId, now]
  );
  
  const team = await getTeamById(id);
  if (!team) throw new Error('Failed to create team');
  return team;
}

export async function getTeamById(id: string): Promise<Team | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT * FROM teams WHERE id = ?', [id]);
  return row ? rowToTeam(row) : null;
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT * FROM teams WHERE slug = ?', [slug]);
  return row ? rowToTeam(row) : null;
}

export async function updateTeam(id: string, updates: { name?: string }): Promise<Team | null> {
  const client = getDbClient();
  const existing = await getTeamById(id);
  if (!existing) return null;
  
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  
  values.push(id);
  await client.execute(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`, values);
  
  return getTeamById(id);
}

export async function deleteTeam(id: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM teams WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function getUserTeams(userId: string): Promise<TeamWithMembership[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(`
    SELECT 
      t.*,
      tm.role,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ?
    ORDER BY t.name
  `, [userId]);
  
  return rows.map((row) => ({
    ...rowToTeam(row),
    role: row.role as TeamRole,
    memberCount: Number(row.member_count),
  }));
}

export async function isTeamSlugAvailable(slug: string): Promise<boolean> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT id FROM teams WHERE slug = ?', [slug]);
  return !row;
}

// Team Members
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(`
    SELECT 
      tm.*,
      u.email as user_email,
      u.name as user_name
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.role, u.email
  `, [teamId]);
  
  return rows.map((row) => rowToTeamMember(row));
}

export async function getTeamMember(teamId: string, userId: string): Promise<TeamMember | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(`
    SELECT 
      tm.*,
      u.email as user_email,
      u.name as user_name
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ? AND tm.user_id = ?
  `, [teamId, userId]);
  
  return row ? rowToTeamMember(row) : null;
}

export async function addTeamMember(data: { teamId: string; userId: string; role: TeamRole; invitedBy?: string }): Promise<TeamMember> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const id = uuidv4();
  
  await client.execute(
    `INSERT INTO team_members (id, team_id, user_id, role, invited_by, joined_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.teamId, data.userId, data.role, data.invitedBy || null, now]
  );
  
  const member = await getTeamMember(data.teamId, data.userId);
  if (!member) throw new Error('Failed to add team member');
  return member;
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: TeamRole): Promise<TeamMember | null> {
  const client = getDbClient();
  const result = await client.execute(
    `UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?`,
    [role, teamId, userId]
  );
  
  if (result.changes === 0) return null;
  return getTeamMember(teamId, userId);
}

export async function removeTeamMember(teamId: string, userId: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute(
    'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );
  return result.changes > 0;
}

export async function getUserRoleInTeam(teamId: string, userId: string): Promise<TeamRole | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(
    'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );
  return row ? (row.role as TeamRole) : null;
}

export function canManageTeam(role: TeamRole | null): boolean {
  return role === 'owner' || role === 'admin';
}

export function canDeleteTeam(role: TeamRole | null): boolean {
  return role === 'owner';
}

// Team Invitations
export async function createTeamInvitation(data: { teamId: string; email: string; role: TeamRole; invitedBy: string }): Promise<TeamInvitation> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const id = uuidv4();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  await client.execute(
    `INSERT INTO team_invitations (id, team_id, email, role, invited_by, token, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.teamId, data.email.toLowerCase(), data.role, data.invitedBy, token, expiresAt.toISOString(), now]
  );
  
  const invitation = await getTeamInvitationById(id);
  if (!invitation) throw new Error('Failed to create team invitation');
  return invitation;
}

export async function getTeamInvitationById(id: string): Promise<TeamInvitation | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>('SELECT * FROM team_invitations WHERE id = ?', [id]);
  return row ? rowToTeamInvitation(row) : null;
}

export async function getTeamInvitationByToken(token: string): Promise<TeamInvitation | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(`
    SELECT 
      ti.*,
      t.name as team_name,
      t.slug as team_slug,
      t.owner_id as team_owner_id,
      t.created_at as team_created_at,
      t.updated_at as team_updated_at
    FROM team_invitations ti
    JOIN teams t ON ti.team_id = t.id
    WHERE ti.token = ? AND ti.expires_at > ?
  `, [token, new Date().toISOString()]);
  
  return row ? rowToTeamInvitation(row) : null;
}

export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(`
    SELECT * FROM team_invitations WHERE team_id = ? AND expires_at > ? ORDER BY created_at DESC
  `, [teamId, new Date().toISOString()]);
  
  return rows.map((row) => rowToTeamInvitation(row));
}

export async function getPendingInvitationForEmail(teamId: string, email: string): Promise<TeamInvitation | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(`
    SELECT * FROM team_invitations WHERE team_id = ? AND email = ? AND expires_at > ?
  `, [teamId, email.toLowerCase(), new Date().toISOString()]);
  
  return row ? rowToTeamInvitation(row) : null;
}

export async function deleteTeamInvitation(id: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM team_invitations WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function acceptTeamInvitation(token: string, userId: string): Promise<TeamMember | null> {
  const invitation = await getTeamInvitationByToken(token);
  if (!invitation) return null;
  
  // Check if user is already a member
  const existingMember = await getTeamMember(invitation.teamId, userId);
  if (existingMember) {
    await deleteTeamInvitation(invitation.id);
    return existingMember;
  }
  
  // Add member
  const member = await addTeamMember({
    teamId: invitation.teamId,
    userId,
    role: invitation.role as TeamRole,
    invitedBy: invitation.invitedBy,
  });
  
  // Delete invitation
  await deleteTeamInvitation(invitation.id);
  
  return member;
}

// Shared Connections
export async function shareConnection(data: { connectionId: string; teamId: string; sharedBy: string; permission: ConnectionPermission }): Promise<SharedConnection> {
  const client = getDbClient();
  const dbType = getDbType();
  const now = new Date().toISOString();
  const id = uuidv4();
  
  if (dbType === 'postgres') {
    // PostgreSQL: Use ON CONFLICT DO UPDATE
    await client.execute(
      `INSERT INTO shared_connections (id, connection_id, team_id, shared_by, permission, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(connection_id, team_id) DO UPDATE SET permission = EXCLUDED.permission`,
      [id, data.connectionId, data.teamId, data.sharedBy, data.permission, now]
    );
  } else {
    // SQLite/Turso: Use INSERT OR REPLACE style
    await client.execute(
      `INSERT INTO shared_connections (id, connection_id, team_id, shared_by, permission, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(connection_id, team_id) DO UPDATE SET permission = excluded.permission`,
      [id, data.connectionId, data.teamId, data.sharedBy, data.permission, now]
    );
  }
  
  const shared = await getSharedConnection(data.connectionId, data.teamId);
  if (!shared) throw new Error('Failed to share connection');
  return shared;
}

export async function getSharedConnection(connectionId: string, teamId: string): Promise<SharedConnection | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(`
    SELECT 
      sc.*,
      c.id as conn_id,
      c.name as conn_name,
      c.type as conn_type,
      c.host as conn_host,
      c.port as conn_port,
      c.database_name as conn_database_name,
      c.username as conn_username,
      c.password as conn_password,
      c.ssl as conn_ssl,
      c.color as conn_color,
      c.created_at as conn_created_at,
      c.updated_at as conn_updated_at
    FROM shared_connections sc
    JOIN connections c ON sc.connection_id = c.id
    WHERE sc.connection_id = ? AND sc.team_id = ?
  `, [connectionId, teamId]);
  
  return row ? rowToSharedConnection(row) : null;
}

export async function getTeamSharedConnections(teamId: string): Promise<SharedConnection[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(`
    SELECT 
      sc.*,
      c.id as conn_id,
      c.name as conn_name,
      c.type as conn_type,
      c.host as conn_host,
      c.port as conn_port,
      c.database_name as conn_database_name,
      c.username as conn_username,
      c.password as conn_password,
      c.ssl as conn_ssl,
      c.color as conn_color,
      c.created_at as conn_created_at,
      c.updated_at as conn_updated_at
    FROM shared_connections sc
    JOIN connections c ON sc.connection_id = c.id
    WHERE sc.team_id = ?
    ORDER BY c.name
  `, [teamId]);
  
  return rows.map((row) => rowToSharedConnection(row));
}

export async function unshareConnection(connectionId: string, teamId: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute(
    'DELETE FROM shared_connections WHERE connection_id = ? AND team_id = ?',
    [connectionId, teamId]
  );
  return result.changes > 0;
}

export async function getUserAccessibleConnections(userId: string, teamIds: string[]): Promise<DatabaseConnection[]> {
  const client = getDbClient();
  const dbType = getDbType();
  
  if (teamIds.length === 0) {
    // Just personal connections
    const rows = await client.query<DbRow>('SELECT * FROM connections WHERE user_id = ? ORDER BY name', [userId]);
    return rows.map((row) => ({
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
    }));
  }
  
  // Build placeholders for team IDs
  const placeholders = teamIds.map((_, i) => {
    if (dbType === 'postgres') {
      return `$${i + 2}`; // Start from $2 since $1 is userId
    }
    return '?';
  }).join(', ');
  
  const params = dbType === 'postgres' 
    ? [userId, ...teamIds]
    : [userId, ...teamIds];
  
  const sql = dbType === 'postgres'
    ? `SELECT DISTINCT 
        c.id, c.name, c.type, c.host, c.port, c.database_name, c.username, c.password, c.ssl, c.color, c.created_at, c.updated_at
      FROM connections c
      LEFT JOIN shared_connections sc ON c.id = sc.connection_id
      WHERE c.user_id = $1 OR sc.team_id IN (${placeholders})
      ORDER BY c.name`
    : `SELECT DISTINCT 
        c.id, c.name, c.type, c.host, c.port, c.database_name, c.username, c.password, c.ssl, c.color, c.created_at, c.updated_at
      FROM connections c
      LEFT JOIN shared_connections sc ON c.id = sc.connection_id
      WHERE c.user_id = ? OR sc.team_id IN (${placeholders})
      ORDER BY c.name`;
  
  // For non-postgres, we need to use the standard query method
  const rows = await client.query<DbRow>(
    dbType === 'postgres' ? sql : sql,
    params
  );
  
  return rows.map((row) => ({
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
  }));
}
