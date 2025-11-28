import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById } from '@/lib/db/app-db';
import { testConnection } from '@/lib/db/drivers';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const connection = await getConnectionById(id);
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    const result = await testConnection(connection);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to test connection:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to test connection' },
      { status: 500 }
    );
  }
}
