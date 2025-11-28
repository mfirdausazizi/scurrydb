import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllConnections, createConnection } from '@/lib/db/app-db';
import { connectionFormSchema } from '@/lib/validations/connection';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const connections = await getAllConnections(user?.id);
    // Don't send passwords to client
    const safeConnections = connections.map(({ password: _password, ...rest }) => rest);
    return NextResponse.json(safeConnections);
  } catch (error) {
    console.error('Failed to fetch connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const validationResult = connectionFormSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const connection = await createConnection({
      id: uuidv4(),
      ...validationResult.data,
    }, user.id);
    
    // Don't send password back
    const { password: _password, ...safeConnection } = connection;
    return NextResponse.json(safeConnection, { status: 201 });
  } catch (error) {
    console.error('Failed to create connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}
