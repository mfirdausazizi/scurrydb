import { v4 as uuidv4 } from 'uuid';
import { getDbClient, getDbType, type DbRow } from './db-client';

// Types
export interface PermissionProfile {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileConnectionPermission {
  id: string;
  profileId: string;
  connectionId: string;
  canView: boolean;
  canEdit: boolean;
  allowedTables: string[] | null; // null means all tables
  createdAt: Date;
}

export interface ProfileColumnRestriction {
  id: string;
  profilePermissionId: string;
  tableName: string;
  hiddenColumns: string[];
}

export interface MemberPermissionAssignment {
  id: string;
  teamId: string;
  userId: string;
  profileId: string | null;
  customPermissions: CustomPermission[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomPermission {
  connectionId: string;
  canView: boolean;
  canEdit: boolean;
  allowedTables?: string[] | null;
  columnRestrictions?: Array<{
    tableName: string;
    hiddenColumns: string[];
  }>;
}

export interface EffectivePermission {
  connectionId: string;
  canView: boolean;
  canEdit: boolean;
  allowedTables: Set<string> | null; // null = all tables
  hiddenColumns: Map<string, Set<string>>; // table -> hidden columns
}

// Row converters
function rowToProfile(row: DbRow): PermissionProfile {
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    name: row.name as string,
    description: row.description as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function rowToConnectionPermission(row: DbRow): ProfileConnectionPermission {
  const dbType = getDbType();
  let allowedTables: string[] | null = null;
  
  if (row.allowed_tables) {
    if (dbType === 'postgres') {
      allowedTables = row.allowed_tables as string[];
    } else {
      allowedTables = JSON.parse(row.allowed_tables as string);
    }
  }
  
  return {
    id: row.id as string,
    profileId: row.profile_id as string,
    connectionId: row.connection_id as string,
    canView: dbType === 'postgres' ? Boolean(row.can_view) : Boolean(row.can_view),
    canEdit: dbType === 'postgres' ? Boolean(row.can_edit) : Boolean(row.can_edit),
    allowedTables,
    createdAt: new Date(row.created_at as string),
  };
}

function rowToColumnRestriction(row: DbRow): ProfileColumnRestriction {
  const dbType = getDbType();
  let hiddenColumns: string[];
  
  if (dbType === 'postgres') {
    hiddenColumns = row.hidden_columns as string[];
  } else {
    hiddenColumns = JSON.parse(row.hidden_columns as string);
  }
  
  return {
    id: row.id as string,
    profilePermissionId: row.profile_permission_id as string,
    tableName: row.table_name as string,
    hiddenColumns,
  };
}

function rowToMemberAssignment(row: DbRow): MemberPermissionAssignment {
  const dbType = getDbType();
  let customPermissions: CustomPermission[] | null = null;
  
  if (row.custom_permissions) {
    if (dbType === 'postgres') {
      customPermissions = row.custom_permissions as CustomPermission[];
    } else {
      customPermissions = JSON.parse(row.custom_permissions as string);
    }
  }
  
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    userId: row.user_id as string,
    profileId: row.profile_id as string | null,
    customPermissions,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// Permission Profile CRUD
export async function createPermissionProfile(data: {
  teamId: string;
  name: string;
  description?: string;
}): Promise<PermissionProfile> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const id = uuidv4();
  
  await client.execute(
    `INSERT INTO permission_profiles (id, team_id, name, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.teamId, data.name, data.description || null, now, now]
  );
  
  const profile = await getPermissionProfile(id);
  if (!profile) throw new Error('Failed to create permission profile');
  return profile;
}

export async function getPermissionProfile(id: string): Promise<PermissionProfile | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(
    'SELECT * FROM permission_profiles WHERE id = ?',
    [id]
  );
  return row ? rowToProfile(row) : null;
}

export async function getTeamPermissionProfiles(teamId: string): Promise<PermissionProfile[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(
    'SELECT * FROM permission_profiles WHERE team_id = ? ORDER BY name',
    [teamId]
  );
  return rows.map(rowToProfile);
}

export async function updatePermissionProfile(
  id: string,
  data: { name?: string; description?: string }
): Promise<PermissionProfile | null> {
  const client = getDbClient();
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];
  
  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  
  values.push(id);
  await client.execute(
    `UPDATE permission_profiles SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  return getPermissionProfile(id);
}

export async function deletePermissionProfile(id: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute('DELETE FROM permission_profiles WHERE id = ?', [id]);
  return result.changes > 0;
}

// Profile Connection Permissions CRUD
export async function addConnectionPermission(data: {
  profileId: string;
  connectionId: string;
  canView: boolean;
  canEdit: boolean;
  allowedTables?: string[] | null;
}): Promise<ProfileConnectionPermission> {
  const client = getDbClient();
  const dbType = getDbType();
  const now = new Date().toISOString();
  const id = uuidv4();
  
  const allowedTablesValue = data.allowedTables
    ? (dbType === 'postgres' ? JSON.stringify(data.allowedTables) : JSON.stringify(data.allowedTables))
    : null;
  
  const canViewValue = dbType === 'postgres' ? data.canView : (data.canView ? 1 : 0);
  const canEditValue = dbType === 'postgres' ? data.canEdit : (data.canEdit ? 1 : 0);
  
  await client.execute(
    `INSERT INTO profile_connection_permissions (id, profile_id, connection_id, can_view, can_edit, allowed_tables, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(profile_id, connection_id) DO UPDATE SET 
       can_view = excluded.can_view,
       can_edit = excluded.can_edit,
       allowed_tables = excluded.allowed_tables`,
    [id, data.profileId, data.connectionId, canViewValue, canEditValue, allowedTablesValue, now]
  );
  
  const permission = await getConnectionPermission(data.profileId, data.connectionId);
  if (!permission) throw new Error('Failed to add connection permission');
  return permission;
}

export async function getConnectionPermission(
  profileId: string,
  connectionId: string
): Promise<ProfileConnectionPermission | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(
    'SELECT * FROM profile_connection_permissions WHERE profile_id = ? AND connection_id = ?',
    [profileId, connectionId]
  );
  return row ? rowToConnectionPermission(row) : null;
}

export async function getProfileConnectionPermissions(
  profileId: string
): Promise<ProfileConnectionPermission[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(
    'SELECT * FROM profile_connection_permissions WHERE profile_id = ?',
    [profileId]
  );
  return rows.map(rowToConnectionPermission);
}

export async function deleteConnectionPermission(
  profileId: string,
  connectionId: string
): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute(
    'DELETE FROM profile_connection_permissions WHERE profile_id = ? AND connection_id = ?',
    [profileId, connectionId]
  );
  return result.changes > 0;
}

// Column Restrictions CRUD
export async function addColumnRestriction(data: {
  profilePermissionId: string;
  tableName: string;
  hiddenColumns: string[];
}): Promise<ProfileColumnRestriction> {
  const client = getDbClient();
  const dbType = getDbType();
  const id = uuidv4();
  
  const hiddenColumnsValue = dbType === 'postgres' 
    ? JSON.stringify(data.hiddenColumns) 
    : JSON.stringify(data.hiddenColumns);
  
  await client.execute(
    `INSERT INTO profile_column_restrictions (id, profile_permission_id, table_name, hidden_columns)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(profile_permission_id, table_name) DO UPDATE SET 
       hidden_columns = excluded.hidden_columns`,
    [id, data.profilePermissionId, data.tableName, hiddenColumnsValue]
  );
  
  const restriction = await getColumnRestriction(data.profilePermissionId, data.tableName);
  if (!restriction) throw new Error('Failed to add column restriction');
  return restriction;
}

export async function getColumnRestriction(
  profilePermissionId: string,
  tableName: string
): Promise<ProfileColumnRestriction | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(
    'SELECT * FROM profile_column_restrictions WHERE profile_permission_id = ? AND table_name = ?',
    [profilePermissionId, tableName]
  );
  return row ? rowToColumnRestriction(row) : null;
}

export async function getProfileColumnRestrictions(
  profilePermissionId: string
): Promise<ProfileColumnRestriction[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(
    'SELECT * FROM profile_column_restrictions WHERE profile_permission_id = ?',
    [profilePermissionId]
  );
  return rows.map(rowToColumnRestriction);
}

export async function deleteColumnRestriction(
  profilePermissionId: string,
  tableName: string
): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute(
    'DELETE FROM profile_column_restrictions WHERE profile_permission_id = ? AND table_name = ?',
    [profilePermissionId, tableName]
  );
  return result.changes > 0;
}

// Member Permission Assignments CRUD
export async function assignMemberPermission(data: {
  teamId: string;
  userId: string;
  profileId?: string | null;
  customPermissions?: CustomPermission[] | null;
}): Promise<MemberPermissionAssignment> {
  const client = getDbClient();
  const dbType = getDbType();
  const now = new Date().toISOString();
  const id = uuidv4();
  
  const customPermsValue = data.customPermissions
    ? (dbType === 'postgres' ? JSON.stringify(data.customPermissions) : JSON.stringify(data.customPermissions))
    : null;
  
  await client.execute(
    `INSERT INTO member_permission_assignments (id, team_id, user_id, profile_id, custom_permissions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(team_id, user_id) DO UPDATE SET 
       profile_id = excluded.profile_id,
       custom_permissions = excluded.custom_permissions,
       updated_at = excluded.updated_at`,
    [id, data.teamId, data.userId, data.profileId || null, customPermsValue, now, now]
  );
  
  const assignment = await getMemberPermissionAssignment(data.teamId, data.userId);
  if (!assignment) throw new Error('Failed to assign member permission');
  return assignment;
}

export async function getMemberPermissionAssignment(
  teamId: string,
  userId: string
): Promise<MemberPermissionAssignment | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(
    'SELECT * FROM member_permission_assignments WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );
  return row ? rowToMemberAssignment(row) : null;
}

export async function getTeamMemberAssignments(teamId: string): Promise<MemberPermissionAssignment[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(
    'SELECT * FROM member_permission_assignments WHERE team_id = ?',
    [teamId]
  );
  return rows.map(rowToMemberAssignment);
}

export async function deleteMemberPermissionAssignment(
  teamId: string,
  userId: string
): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute(
    'DELETE FROM member_permission_assignments WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );
  return result.changes > 0;
}

// Effective Permissions Calculation
export async function getEffectivePermissions(
  userId: string,
  teamId: string,
  connectionId: string
): Promise<EffectivePermission | null> {
  const client = getDbClient();
  
  // Get member assignment
  const assignment = await getMemberPermissionAssignment(teamId, userId);
  if (!assignment) return null;
  
  // Check custom permissions first
  if (assignment.customPermissions) {
    const customPerm = assignment.customPermissions.find(p => p.connectionId === connectionId);
    if (customPerm) {
      const hiddenColumns = new Map<string, Set<string>>();
      customPerm.columnRestrictions?.forEach(cr => {
        hiddenColumns.set(cr.tableName, new Set(cr.hiddenColumns));
      });
      
      return {
        connectionId,
        canView: customPerm.canView,
        canEdit: customPerm.canEdit,
        allowedTables: customPerm.allowedTables ? new Set(customPerm.allowedTables) : null,
        hiddenColumns,
      };
    }
  }
  
  // Fall back to profile permissions
  if (!assignment.profileId) return null;
  
  const connPerm = await getConnectionPermission(assignment.profileId, connectionId);
  if (!connPerm) return null;
  
  const columnRestrictions = await client.query<DbRow>(
    `SELECT * FROM profile_column_restrictions 
     WHERE profile_permission_id = (
       SELECT id FROM profile_connection_permissions 
       WHERE profile_id = ? AND connection_id = ?
     )`,
    [assignment.profileId, connectionId]
  );
  
  const hiddenColumns = new Map<string, Set<string>>();
  columnRestrictions.forEach(row => {
    const restriction = rowToColumnRestriction(row);
    hiddenColumns.set(restriction.tableName, new Set(restriction.hiddenColumns));
  });
  
  return {
    connectionId,
    canView: connPerm.canView,
    canEdit: connPerm.canEdit,
    allowedTables: connPerm.allowedTables ? new Set(connPerm.allowedTables) : null,
    hiddenColumns,
  };
}

export async function getAllEffectivePermissions(
  userId: string,
  teamId: string
): Promise<Map<string, EffectivePermission>> {
  const assignment = await getMemberPermissionAssignment(teamId, userId);
  if (!assignment) return new Map();
  
  const permissions = new Map<string, EffectivePermission>();
  
  // Handle custom permissions
  if (assignment.customPermissions) {
    assignment.customPermissions.forEach(customPerm => {
      const hiddenColumns = new Map<string, Set<string>>();
      customPerm.columnRestrictions?.forEach(cr => {
        hiddenColumns.set(cr.tableName, new Set(cr.hiddenColumns));
      });
      
      permissions.set(customPerm.connectionId, {
        connectionId: customPerm.connectionId,
        canView: customPerm.canView,
        canEdit: customPerm.canEdit,
        allowedTables: customPerm.allowedTables ? new Set(customPerm.allowedTables) : null,
        hiddenColumns,
      });
    });
  }
  
  // Handle profile permissions
  if (assignment.profileId) {
    const connPerms = await getProfileConnectionPermissions(assignment.profileId);
    
    for (const connPerm of connPerms) {
      // Skip if custom permission already exists
      if (permissions.has(connPerm.connectionId)) continue;
      
      const columnRestrictions = await getProfileColumnRestrictions(connPerm.id);
      const hiddenColumns = new Map<string, Set<string>>();
      columnRestrictions.forEach(cr => {
        hiddenColumns.set(cr.tableName, new Set(cr.hiddenColumns));
      });
      
      permissions.set(connPerm.connectionId, {
        connectionId: connPerm.connectionId,
        canView: connPerm.canView,
        canEdit: connPerm.canEdit,
        allowedTables: connPerm.allowedTables ? new Set(connPerm.allowedTables) : null,
        hiddenColumns,
      });
    }
  }
  
  return permissions;
}

