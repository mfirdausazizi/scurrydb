import { NextRequest, NextResponse } from 'next/server';
import { getConnectionById, updateConnection, deleteConnection } from '@/lib/db/app-db';
import { connectionSchema } from '@/lib/validations/connection';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const connection = getConnectionById(id);
    
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
    const { id } = await params;
    const body = await request.json();
    
    // Partial validation for updates
    const validationResult = connectionSchema.partial().safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const updated = updateConnection(id, validationResult.data);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
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
    const { id } = await params;
    const deleted = deleteConnection(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
