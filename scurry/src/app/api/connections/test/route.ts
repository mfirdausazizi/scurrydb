import { NextRequest, NextResponse } from 'next/server';
import { connectionSchema } from '@/lib/validations/connection';
import { testConnection } from '@/lib/db/drivers';
import type { DatabaseConnection } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = connectionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid connection data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const connection: DatabaseConnection = {
      id: 'test',
      ...validationResult.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
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
