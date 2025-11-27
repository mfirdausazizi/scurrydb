import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllConnections, createConnection } from '@/lib/db/app-db';
import { connectionSchema } from '@/lib/validations/connection';

export async function GET() {
  try {
    const connections = getAllConnections();
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
    const body = await request.json();
    const validationResult = connectionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const connection = createConnection({
      id: uuidv4(),
      ...validationResult.data,
    });
    
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
