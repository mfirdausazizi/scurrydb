/**
 * Chunked Query Execution API
 * 
 * Executes queries and returns results in chunks to reduce memory usage.
 * Useful for large result sets that would otherwise cause memory issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getConnectionById, isDDLQuery, invalidateSchemaCache } from '@/lib/db/app-db';
import { executeQuery } from '@/lib/db/query-executor';
import { getCurrentUser } from '@/lib/auth/session';
import { validateConnectionAccess } from '@/lib/db/teams';
import { getEffectivePermissions } from '@/lib/db/permissions';
import { validateQuery } from '@/lib/permissions/validator';
import { wrapQueryWithPagination, hasLimitClause } from '@/lib/db/pagination';
import type { ColumnInfo } from '@/types';

const chunkedQuerySchema = z.object({
  connectionId: z.string().uuid(),
  sql: z.string().min(1, 'SQL query is required'),
  chunkSize: z.number().int().min(100).max(5000).optional().default(1000),
  chunkIndex: z.number().int().min(0).optional().default(0),
  teamId: z.string().uuid().optional().nullable(),
});

export interface ChunkedQueryResponse {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  chunkIndex: number;
  chunkSize: number;
  rowsInChunk: number;
  hasMore: boolean;
  executionTime: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = chunkedQuerySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { connectionId, sql, chunkSize, chunkIndex, teamId } = validationResult.data;

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
          columns: [],
          rows: [],
          chunkIndex,
          chunkSize,
          rowsInChunk: 0,
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
            columns: [],
            rows: [],
            chunkIndex,
            chunkSize,
            rowsInChunk: 0,
            hasMore: false,
            executionTime: 0,
            error: validation.reason || 'Permission denied',
          },
          { status: 403 }
        );
      }
    }

    // Calculate offset for this chunk
    const offset = chunkIndex * chunkSize;

    // If the original query doesn't have a LIMIT, wrap it for chunking
    // Fetch one extra row to detect if there are more chunks
    let chunkedSql: string;
    if (hasLimitClause(sql)) {
      // Query already has LIMIT - just execute as-is for first chunk
      // and return hasMore: false
      if (chunkIndex > 0) {
        // Can't chunk a query that already has LIMIT
        return NextResponse.json({
          columns: [],
          rows: [],
          chunkIndex,
          chunkSize,
          rowsInChunk: 0,
          hasMore: false,
          executionTime: 0,
          error: 'Cannot chunk a query that already has LIMIT clause',
        });
      }
      chunkedSql = sql;
    } else {
      chunkedSql = wrapQueryWithPagination(
        sql,
        chunkSize + 1, // Fetch one extra to detect hasMore
        offset,
        connection.type
      );
    }

    // Execute the chunked query
    const result = await executeQuery(connection, chunkedSql, chunkSize + 1);

    if (result.error) {
      return NextResponse.json({
        columns: [],
        rows: [],
        chunkIndex,
        chunkSize,
        rowsInChunk: 0,
        hasMore: false,
        executionTime: result.executionTime,
        error: result.error,
      });
    }

    // Determine if there are more chunks
    const hasMore = result.rows.length > chunkSize;
    const rows = hasMore ? result.rows.slice(0, chunkSize) : result.rows;

    // Invalidate schema cache if DDL
    if (isDDLQuery(sql)) {
      await invalidateSchemaCache(connectionId);
    }

    const response: ChunkedQueryResponse = {
      columns: result.columns,
      rows,
      chunkIndex,
      chunkSize,
      rowsInChunk: rows.length,
      hasMore,
      executionTime: result.executionTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chunked query error:', error);
    return NextResponse.json(
      {
        columns: [],
        rows: [],
        chunkIndex: 0,
        chunkSize: 0,
        rowsInChunk: 0,
        hasMore: false,
        executionTime: 0,
        error: error instanceof Error ? error.message : 'Failed to execute query',
      },
      { status: 500 }
    );
  }
}
