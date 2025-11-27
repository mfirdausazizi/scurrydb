import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById } from '@/lib/db/app-db';
import { executeQuery } from '@/lib/db/query-executor';

type RouteParams = { params: Promise<{ table: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { table } = await params;
    const connectionId = request.nextUrl.searchParams.get('connectionId');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100', 10);

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    const connection = getConnectionById(connectionId);
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Escape table name to prevent SQL injection (basic escaping)
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '');
    const sql = `SELECT * FROM ${safeTable} LIMIT ${Math.min(limit, 1000)}`;

    const result = await executeQuery(connection, sql, Math.min(limit, 1000));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch table preview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch table preview' },
      { status: 500 }
    );
  }
}
