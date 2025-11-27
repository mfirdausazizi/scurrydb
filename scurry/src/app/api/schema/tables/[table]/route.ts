import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById } from '@/lib/db/app-db';
import { fetchColumns, fetchIndexes } from '@/lib/db/schema-fetcher';

type RouteParams = { params: Promise<{ table: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { table } = await params;
    const connectionId = request.nextUrl.searchParams.get('connectionId');

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

    const [columns, indexes] = await Promise.all([
      fetchColumns(connection, table),
      fetchIndexes(connection, table),
    ]);

    return NextResponse.json({ columns, indexes });
  } catch (error) {
    console.error('Failed to fetch table structure:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch table structure' },
      { status: 500 }
    );
  }
}
