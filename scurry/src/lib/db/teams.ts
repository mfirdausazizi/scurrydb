import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import type { TeamRole, ConnectionPermission } from '@/lib/validations/team';
import type { DatabaseConnection, DatabaseType } from '@/types';
import { decrypt } from '@/lib/utils/encryption';

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
function rowToTeam(row: Record<string, unknown>): Team {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    ownerId: row.owner_id as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function rowToTeamMember(row: Record<string, unknown>): TeamMember {
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

function rowToTeamInvitation(row: Record<string, unknown>): TeamInvitation {
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

function rowToSharedConnection(row: Record<string, unknown>): SharedConnection {
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
      ssl: Boolean(row.conn_ssl),
      color: row.conn_color as string | undefined,
      createdAt: new Date(row.conn_created_at as string),
      updatedAt: new Date(row.conn_updated_at as string),
    };
  }
  
  return shared;
}

// Team CRUD
export function createTeam(data: { name: string; slug: string; ownerId: string }): Team {
  const database = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();
  
  database.transaction(() => {
    // Create team
    database.prepare(`
      INSERT INTO teams (id, name, slug, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.slug, data.ownerId, now, now);
    
    // Add owner as member
    database.prepare(`
      INSERT INTO team_members (id, team_id, user_id, role, joined_at)
      VALUES (?, ?, ?, 'owner', ?)
    `).run(uuidv4(), id, data.ownerId, now);
  })();
  
  return getTeamById(id)!;
}

export function getTeamById(id: string): Team | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  return row ? rowToTeam(row as Record<string, unknown>) : null;
}

export function getTeamBySlug(slug: string): Team | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM teams WHERE slug = ?').get(slug);
  return row ? rowToTeam(row as Record<string, unknown>) : null;
}

export function updateTeam(id: string, updates: { name?: string }): Team | null {
  const database = getDb();
  const existing = getTeamById(id);
  if (!existing) return null;
  
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  
  values.push(id);
  database.prepare(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  
  return getTeamById(id);
}

export function deleteTeam(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM teams WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getUserTeams(userId: string): TeamWithMembership[] {
  const database = getDb();
  const rows = database.prepare(`
    SELECT 
      t.*,
      tm.role,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ?
    ORDER BY t.name
  `).all(userId) as Array<Record<string, unknown>>;
  
  return rows.map((row) => ({
    ...rowToTeam(row),
    role: row.role as TeamRole,
    memberCount: row.member_count as number,
  }));
}

export function isTeamSlugAvailable(slug: string): boolean {
  const database = getDb();
  const row = database.prepare('SELECT id FROM teams WHERE slug = ?').get(slug);
  return !row;
}

// Team Members
export function getTeamMembers(teamId: string): TeamMember[] {
  const database = getDb();
  const rows = database.prepare(`
    SELECT 
      tm.*,
      u.email as user_email,
      u.name as user_name
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.role, u.email
  `).all(teamId) as Array<Record<string, unknown>>;
  
  return rows.map((row) => rowToTeamMember(row));
}

export function getTeamMember(teamId: string, userId: string): TeamMember | null {
  const database = getDb();
  const row = database.prepare(`
    SELECT 
      tm.*,
      u.email as user_email,
      u.name as user_name
    FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ? AND tm.user_id = ?
  `).get(teamId, userId);
  
  return row ? rowToTeamMember(row as Record<string, unknown>) : null;
}

export function addTeamMember(data: { teamId: string; userId: string; role: TeamRole; invitedBy?: string }): TeamMember {
  const database = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();
  
  database.prepare(`
    INSERT INTO team_members (id, team_id, user_id, role, invited_by, joined_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.teamId, data.userId, data.role, data.invitedBy || null, now);
  
  return getTeamMember(data.teamId, data.userId)!;
}

export function updateTeamMemberRole(teamId: string, userId: string, role: TeamRole): TeamMember | null {
  const database = getDb();
  const result = database.prepare(`
    UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?
  `).run(role, teamId, userId);
  
  if (result.changes === 0) return null;
  return getTeamMember(teamId, userId);
}

export function removeTeamMember(teamId: string, userId: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, userId);
  return result.changes > 0;
}

export function getUserRoleInTeam(teamId: string, userId: string): TeamRole | null {
  const database = getDb();
  const row = database.prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, userId) as { role: string } | undefined;
  return row ? (row.role as TeamRole) : null;
}

export function canManageTeam(role: TeamRole | null): boolean {
  return role === 'owner' || role === 'admin';
}

export function canDeleteTeam(role: TeamRole | null): boolean {
  return role === 'owner';
}

// Team Invitations
export function createTeamInvitation(data: { teamId: string; email: string; role: TeamRole; invitedBy: string }): TeamInvitation {
  const database = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  database.prepare(`
    INSERT INTO team_invitations (id, team_id, email, role, invited_by, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.teamId, data.email.toLowerCase(), data.role, data.invitedBy, token, expiresAt.toISOString(), now);
  
  return getTeamInvitationById(id)!;
}

export function getTeamInvitationById(id: string): TeamInvitation | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM team_invitations WHERE id = ?').get(id);
  return row ? rowToTeamInvitation(row as Record<string, unknown>) : null;
}

export function getTeamInvitationByToken(token: string): TeamInvitation | null {
  const database = getDb();
  const row = database.prepare(`
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
  `).get(token, new Date().toISOString());
  
  return row ? rowToTeamInvitation(row as Record<string, unknown>) : null;
}

export function getTeamInvitations(teamId: string): TeamInvitation[] {
  const database = getDb();
  const rows = database.prepare(`
    SELECT * FROM team_invitations WHERE team_id = ? AND expires_at > ? ORDER BY created_at DESC
  `).all(teamId, new Date().toISOString()) as Array<Record<string, unknown>>;
  
  return rows.map((row) => rowToTeamInvitation(row));
}

export function getPendingInvitationForEmail(teamId: string, email: string): TeamInvitation | null {
  const database = getDb();
  const row = database.prepare(`
    SELECT * FROM team_invitations WHERE team_id = ? AND email = ? AND expires_at > ?
  `).get(teamId, email.toLowerCase(), new Date().toISOString());
  
  return row ? rowToTeamInvitation(row as Record<string, unknown>) : null;
}

export function deleteTeamInvitation(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM team_invitations WHERE id = ?').run(id);
  return result.changes > 0;
}

export function acceptTeamInvitation(token: string, userId: string): TeamMember | null {
  const database = getDb();
  const invitation = getTeamInvitationByToken(token);
  if (!invitation) return null;
  
  // Check if user is already a member
  const existingMember = getTeamMember(invitation.teamId, userId);
  if (existingMember) {
    deleteTeamInvitation(invitation.id);
    return existingMember;
  }
  
  let member: TeamMember | null = null;
  
  database.transaction(() => {
    // Add member
    member = addTeamMember({
      teamId: invitation.teamId,
      userId,
      role: invitation.role as TeamRole,
      invitedBy: invitation.invitedBy,
    });
    
    // Delete invitation
    deleteTeamInvitation(invitation.id);
  })();
  
  return member;
}

// Shared Connections
export function shareConnection(data: { connectionId: string; teamId: string; sharedBy: string; permission: ConnectionPermission }): SharedConnection {
  const database = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();
  
  database.prepare(`
    INSERT INTO shared_connections (id, connection_id, team_id, shared_by, permission, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(connection_id, team_id) DO UPDATE SET permission = excluded.permission
  `).run(id, data.connectionId, data.teamId, data.sharedBy, data.permission, now);
  
  return getSharedConnection(data.connectionId, data.teamId)!;
}

export function getSharedConnection(connectionId: string, teamId: string): SharedConnection | null {
  const database = getDb();
  const row = database.prepare(`
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
  `).get(connectionId, teamId);
  
  return row ? rowToSharedConnection(row as Record<string, unknown>) : null;
}

export function getTeamSharedConnections(teamId: string): SharedConnection[] {
  const database = getDb();
  const rows = database.prepare(`
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
  `).all(teamId) as Array<Record<string, unknown>>;
  
  return rows.map((row) => rowToSharedConnection(row));
}

export function unshareConnection(connectionId: string, teamId: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM shared_connections WHERE connection_id = ? AND team_id = ?').run(connectionId, teamId);
  return result.changes > 0;
}

export function getUserAccessibleConnections(userId: string, teamIds: string[]): DatabaseConnection[] {
  const database = getDb();
  
  if (teamIds.length === 0) {
    // Just personal connections
    const rows = database.prepare('SELECT * FROM connections WHERE user_id = ? ORDER BY name').all(userId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
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
    }));
  }
  
  const placeholders = teamIds.map(() => '?').join(', ');
  const rows = database.prepare(`
    SELECT DISTINCT 
      c.id, c.name, c.type, c.host, c.port, c.database_name, c.username, c.password, c.ssl, c.color, c.created_at, c.updated_at
    FROM connections c
    LEFT JOIN shared_connections sc ON c.id = sc.connection_id
    WHERE c.user_id = ? OR sc.team_id IN (${placeholders})
    ORDER BY c.name
  `).all(userId, ...teamIds) as Array<Record<string, unknown>>;
  
  return rows.map((row) => ({
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
  }));
}
