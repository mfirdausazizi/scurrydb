import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getConnectionById } from '@/lib/db/app-db';
import { executeQuery } from '@/lib/db/query-executor';
import { getCurrentUser } from '@/lib/auth/session';
import { validateConnectionAccess } from '@/lib/db/teams';
import { getEffectivePermissions } from '@/lib/db/permissions';
import { validateQuery } from '@/lib/permissions/validator';

const executeQuerySchema = z.object({
  connectionId: z.string().uuid(),
  sql: z.string().min(1, 'SQL query is required'),
  limit: z.number().int().min(1).max(10000).optional(),
  teamId: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = executeQuerySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { connectionId, sql, limit, teamId } = validationResult.data;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate connection access based on workspace context
    const accessValidation = await validateConnectionAccess(user.id, connectionId, teamId || null);
    if (!accessValidation.isValid) {
      return NextResponse.json(
        { 
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime: 0,
          error: accessValidation.error || 'Access denied',
          permissionError: true,
        },
        { status: 403 }
      );
    }

    // Get connection - for team connections, we need to fetch without user filter
    const connection = teamId 
      ? await getConnectionById(connectionId) 
      : await getConnectionById(connectionId, user.id);
      
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Check permissions if this is a team connection
    if (teamId) {
      const permission = await getEffectivePermissions(user.id, teamId, connectionId);
      const validation = validateQuery(sql, permission);
      
      if (!validation.allowed) {
        return NextResponse.json(
          { 
            columns: [],
            rows: [],
            rowCount: 0,
            executionTime: 0,
            error: validation.reason || 'Permission denied',
            permissionError: true,
            violationType: validation.violationType,
          },
          { status: 403 }
        );
      }
    }

    const result = await executeQuery(connection, sql, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Query execution error:', error);
    return NextResponse.json(
      { 
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        error: error instanceof Error ? error.message : 'Failed to execute query' 
      },
      { status: 500 }
    );
  }
}
