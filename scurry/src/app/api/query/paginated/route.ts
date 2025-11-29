/**
 * Paginated Query Execution API
 * 
 * Provides cursor-based pagination for large query results.
 * Automatically wraps queries with LIMIT/OFFSET for efficient pagination.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getConnectionById, isDDLQuery, invalidateSchemaCache } from '@/lib/db/app-db';
import { executeQuery } from '@/lib/db/query-executor';
import { getCurrentUser } from '@/lib/auth/session';
import { validateConnectionAccess } from '@/lib/db/teams';
import { getEffectivePermissions } from '@/lib/db/permissions';
import { validateQuery } from '@/lib/permissions/validator';
import {
  parsePaginationOptions,
  wrapQueryWithPagination,
  createPaginatedResult,
  type PaginatedResult,
} from '@/lib/db/pagination';

const paginatedQuerySchema = z.object({
  connectionId: z.string().uuid(),
  sql: z.string().min(1, 'SQL query is required'),
  cursor: z.string().nullable().optional(),
  pageSize: z.number().int().min(1).max(1000).optional().default(100),
  teamId: z.string().uuid().optional().nullable(),
  includeTotal: z.boolean().optional().default(false),
});

export interface PaginatedQueryResponse extends PaginatedResult<Record<string, unknown>> {
  columns: Array<{ name: string; type: string; nullable: boolean }>;
  executionTime: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = paginatedQuerySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { connectionId, sql, cursor, pageSize, teamId, includeTotal } = validationResult.data;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate connection access
    const accessValidation = await validateConnectionAccess(user.id, connectionId, teamId || null);
    if (!accessValidation.isValid) {
      return NextResponse.json(
        {
          data: [],
          columns: [],
          cursor: null,
          hasMore: false,
          executionTime: 0,
          error: accessValidation.error || 'Access denied',
        },
        { status: 403 }
      );
    }

    // Get connection
    const connection = teamId
      ? await getConnectionById(connectionId)
      : await getConnectionById(connectionId, user.id);

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Check permissions for team connections
    if (teamId) {
      const permission = await getEffectivePermissions(user.id, teamId, connectionId);
      const validation = validateQuery(sql, permission);

      if (!validation.allowed) {
        return NextResponse.json(
          {
            data: [],
            columns: [],
            cursor: null,
            hasMore: false,
            executionTime: 0,
            error: validation.reason || 'Permission denied',
          },
          { status: 403 }
        );
      }
    }

    // Parse pagination options
    const { offset, limit } = parsePaginationOptions({
      cursor: cursor || null,
      limit: pageSize,
    });

    // Wrap query with pagination (fetch one extra row to check if there's more)
    const paginatedSql = wrapQueryWithPagination(
      sql,
      limit + 1, // Fetch one extra to detect hasMore
      offset,
      connection.type
    );

    // Execute the paginated query
    const result = await executeQuery(connection, paginatedSql, limit + 1);

    if (result.error) {
      return NextResponse.json({
        data: [],
        columns: [],
        cursor: null,
        hasMore: false,
        executionTime: result.executionTime,
        error: result.error,
      });
    }

    // Check if there are more rows
    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

    // Get total count estimate if requested (expensive operation)
    let totalEstimate: number | undefined;
    if (includeTotal && offset === 0) {
      // Only get total on first page to avoid expensive counts
      totalEstimate = result.rowCount;
    }

    // Invalidate schema cache if DDL
    if (isDDLQuery(sql)) {
      await invalidateSchemaCache(connectionId);
    }

    // Create paginated response
    const paginatedResult = createPaginatedResult(rows, offset, limit, totalEstimate);

    const response: PaginatedQueryResponse = {
      ...paginatedResult,
      columns: result.columns,
      executionTime: result.executionTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Paginated query error:', error);
    return NextResponse.json(
      {
        data: [],
        columns: [],
        cursor: null,
        hasMore: false,
        executionTime: 0,
        error: error instanceof Error ? error.message : 'Failed to execute query',
      },
      { status: 500 }
    );
  }
}
