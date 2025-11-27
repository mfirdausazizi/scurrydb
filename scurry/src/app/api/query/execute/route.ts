import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getConnectionById } from '@/lib/db/app-db';
import { executeQuery } from '@/lib/db/query-executor';

const executeQuerySchema = z.object({
  connectionId: z.string().uuid(),
  sql: z.string().min(1, 'SQL query is required'),
  limit: z.number().int().min(1).max(10000).optional(),
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

    const { connectionId, sql, limit } = validationResult.data;

    const connection = getConnectionById(connectionId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
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
