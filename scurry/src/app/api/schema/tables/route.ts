import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById } from '@/lib/db/app-db';
import { fetchTables } from '@/lib/db/schema-fetcher';

export async function GET(request: NextRequest) {
  try {
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

    const tables = await fetchTables(connection);
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Failed to fetch tables:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
