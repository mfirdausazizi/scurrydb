# Granular Team Permissions - Implementation Summary

## Overview

This document summarizes the implementation of the granular permission system for ScurryDB, which allows team owners and admins to assign specific connections, tables, and columns to team members with view/edit access control and strict query enforcement.

## Database Schema Changes

### New Tables Added

1. **permission_profiles** - Reusable permission templates
   - Stores profile name, description, team association
   - Added to SQLite, Turso (SQLite), and PostgreSQL schemas

2. **profile_connection_permissions** - Connection assignments per profile
   - Links profiles to connections with view/edit flags
   - Stores allowed tables as JSON array (null = all tables)
   - Unique constraint on (profile_id, connection_id)

3. **profile_column_restrictions** - Hidden columns per table
   - Stores table name and array of hidden column names
   - Linked to profile_connection_permissions
   - Unique constraint on (profile_permission_id, table_name)

4. **member_permission_assignments** - User permission assignments
   - Links users to profiles or custom permissions
   - Custom permissions stored as JSON
   - Unique constraint on (team_id, user_id)

### Schema Files Updated
- `scurry/init-schema.sql` (SQLite)
- `scurry/init-schema-postgres.sql` (PostgreSQL)
- `scurry/src/lib/db/db-client.ts` (all three backends)

## Core Library Functions

### `/scurry/src/lib/db/permissions.ts`
Complete CRUD operations for:
- Permission profiles (create, read, update, delete)
- Connection permissions (add, get, delete)
- Column restrictions (add, get, delete)
- Member assignments (assign, get, delete)
- Effective permissions calculation (with inheritance)

Key function: `getEffectivePermissions()` - Calculates final permissions considering custom overrides and profile assignments.

### `/scurry/src/lib/permissions/validator.ts`
SQL query validation and filtering:
- `validateQuery()` - Validates SQL against permissions before execution
- `extractTableNames()` - Parses SQL to find referenced tables
- `extractColumnNames()` - Parses SQL to find referenced columns
- `isWriteQuery()` - Detects INSERT/UPDATE/DELETE operations
- `filterAllowedTables()` - Filters table lists by permissions
- `filterAllowedColumns()` - Filters column lists by permissions

## API Endpoints

### Permission Profiles
- `GET /api/teams/[id]/permissions` - List all profiles for a team
- `POST /api/teams/[id]/permissions` - Create new profile
- `GET /api/teams/[id]/permissions/[profileId]` - Get profile details with connections
- `PUT /api/teams/[id]/permissions/[profileId]` - Update profile
- `DELETE /api/teams/[id]/permissions/[profileId]` - Delete profile

### Connection Permissions
- `POST /api/teams/[id]/permissions/[profileId]/connections` - Add connection to profile
- `DELETE /api/teams/[id]/permissions/[profileId]/connections` - Remove connection

### Member Assignments
- `GET /api/teams/[id]/members/[userId]/permissions` - Get member's permissions
- `PUT /api/teams/[id]/members/[userId]/permissions` - Assign permissions to member
- `DELETE /api/teams/[id]/members/[userId]/permissions` - Remove member's permissions

## Query Enforcement

### Modified Endpoints

**`/api/query/execute`**
- Added `teamId` parameter to request
- Fetches effective permissions for user + team + connection
- Validates SQL query before execution
- Returns 403 with detailed error if permission denied
- Includes `permissionError` and `violationType` in error response

**`/api/schema/tables`**
- Added `teamId` parameter
- Filters table list based on allowed tables
- Returns only tables user has access to

**`/api/schema/tables/[table]`**
- Added `teamId` parameter
- Checks table access before fetching structure
- Filters columns based on hidden column restrictions
- Returns 403 if table access denied

## User Interface

### Permission Management Page
`/teams/[id]/permissions`

Two main tabs:
1. **Permission Profiles** - Create and manage reusable templates
2. **Member Assignments** - Assign profiles or custom permissions to members

### Components Created

1. **`ProfileList`** (`/components/permissions/profile-list.tsx`)
   - Lists all permission profiles
   - Edit and delete actions (admin only)
   - Empty state with helpful message

2. **`MemberAssignments`** (`/components/permissions/member-assignments.tsx`)
   - Lists team members with their permission status
   - Shows assigned profile or custom permissions
   - Assignment actions (admin only)

3. **`CreateProfileDialog`** (`/components/permissions/create-profile-dialog.tsx`)
   - Form to create new permission profile
   - Name and description fields
   - Form validation with Zod

## Validation Schemas

Added to `/scurry/src/lib/validations/team.ts`:
- `permissionProfileSchema` - Profile name and description
- `connectionPermissionSchema` - Connection access settings
- `columnRestrictionSchema` - Hidden columns per table
- `memberPermissionAssignmentSchema` - User assignment data

## Permission Model

### Inheritance Priority (Highest to Lowest)
1. Custom per-user overrides
2. Assigned permission profile
3. Default: No access to shared connections

### Access Levels
- **View**: Can read data, execute SELECT queries
- **Edit**: Can modify data (INSERT, UPDATE, DELETE, etc.)

### Restriction Levels
- **Connection**: Which connections a user can access
- **Table**: Which tables within a connection (null = all tables)
- **Column**: Which columns are hidden per table

### Enforcement Points
1. Query execution - SQL validated before running
2. Schema browser - Tables and columns filtered
3. AI query generation - Respects restrictions (future)
4. Export operations - Honor permissions (future)

## Security Considerations

1. **Query Validation**: All queries validated before execution, not just UI restrictions
2. **SELECT * Protection**: Blocked if any columns are hidden for that table
3. **Write Protection**: Separate permission for data modification
4. **Owner Bypass**: Team owners always have full access
5. **Audit Trail**: Permission changes logged in activity feed (future enhancement)

## Testing Recommendations

1. Test permission inheritance (custom overrides vs profile)
2. Test query validation with various SQL patterns
3. Test table/column filtering in schema browser
4. Test write operations with edit permission disabled
5. Test SELECT * blocking when columns are hidden
6. Test cross-table queries with mixed permissions
7. Test permission changes propagation to active users

## Future Enhancements

1. **Row-level security** - Filter rows based on conditions
2. **Time-based permissions** - Temporary access grants
3. **Permission templates** - Pre-built profiles for common roles
4. **Audit log** - Track all permission changes
5. **Permission preview** - Show what a user can see before assigning
6. **Bulk operations** - Assign permissions to multiple users at once
7. **SQL parser upgrade** - Use proper SQL parser library for better accuracy
8. **Permission testing** - UI to test queries against permissions

## Documentation Updates

- **PRD.md**: Added Phase 3.5 for Granular Permissions
- **PRD.md**: Updated Security Architecture section
- **PRD.md**: Added Granular Permission System architecture diagram
- **README.md**: Added Granular Permissions feature section
- **README.md**: Added v0.4.0 roadmap milestone

## Migration Notes

For existing deployments:
1. Database schema will auto-migrate on next startup
2. No existing data is affected
3. All team members start with no permission assignments
4. Owners/admins need to create profiles and assign permissions
5. Users without assignments cannot access shared team connections

## Summary

The granular permission system is fully implemented with:
- ✅ Database schema for all 3 backends (SQLite, Turso, PostgreSQL)
- ✅ Complete CRUD operations for profiles, permissions, and assignments
- ✅ SQL query validator with table/column extraction
- ✅ Query enforcement at execution time
- ✅ Schema filtering based on permissions
- ✅ Permission management UI
- ✅ API endpoints for all operations
- ✅ Documentation updates

The system provides enterprise-grade access control while maintaining ease of use for team administrators.

