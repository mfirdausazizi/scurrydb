import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserRoleInTeam, canManageTeam } from '@/lib/db/teams';
import {
  getPermissionProfile,
  addConnectionPermission,
  deleteConnectionPermission,
  addColumnRestriction,
} from '@/lib/db/permissions';
import { connectionPermissionSchema, columnRestrictionSchema } from '@/lib/validations/team';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, profileId } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profile = await getPermissionProfile(profileId);
    if (!profile || profile.teamId !== id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = connectionPermissionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const connectionPerm = await addConnectionPermission({
      profileId,
      connectionId: validationResult.data.connectionId,
      canView: validationResult.data.canView,
      canEdit: validationResult.data.canEdit,
      allowedTables: validationResult.data.allowedTables,
    });

    // Add column restrictions if provided
    if (body.columnRestrictions && Array.isArray(body.columnRestrictions)) {
      for (const restriction of body.columnRestrictions) {
        const restrictionValidation = columnRestrictionSchema.safeParse(restriction);
        if (restrictionValidation.success) {
          await addColumnRestriction({
            profilePermissionId: connectionPerm.id,
            tableName: restrictionValidation.data.tableName,
            hiddenColumns: restrictionValidation.data.hiddenColumns,
          });
        }
      }
    }

    return NextResponse.json(connectionPerm, { status: 201 });
  } catch (error) {
    console.error('Failed to add connection permission:', error);
    return NextResponse.json(
      { error: 'Failed to add connection permission' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; profileId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, profileId } = await params;
    const role = await getUserRoleInTeam(id, user.id);
    
    if (!canManageTeam(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profile = await getPermissionProfile(profileId);
    if (!profile || profile.teamId !== id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    await deleteConnectionPermission(profileId, connectionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete connection permission:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection permission' },
      { status: 500 }
    );
  }
}

