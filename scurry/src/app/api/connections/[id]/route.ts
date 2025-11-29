import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById, updateConnection, deleteConnection } from '@/lib/db/app-db';
import { connectionFormSchema } from '@/lib/validations/connection';
import { getCurrentUser } from '@/lib/auth/session';
import { invalidateConnectionPool } from '@/lib/db/query-executor';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const connection = await getConnectionById(id, user?.id);
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    // Don't send password
    const { password: _password, ...safeConnection } = connection;
    return NextResponse.json(safeConnection);
  } catch (error) {
    console.error('Failed to fetch connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    // Verify ownership
    const existing = await getConnectionById(id, user.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    
    // Partial validation for updates
    const validationResult = connectionFormSchema.partial().safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const updated = await updateConnection(id, validationResult.data);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    // Invalidate the connection pool since connection details may have changed
    await invalidateConnectionPool(id);
    
    const { password: _password, ...safeConnection } = updated;
    return NextResponse.json(safeConnection);
  } catch (error) {
    console.error('Failed to update connection:', error);
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    // Verify ownership
    const existing = await getConnectionById(id, user.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    const deleted = await deleteConnection(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    // Clean up the connection pool
    await invalidateConnectionPool(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
