import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectionById } from '@/lib/db/app-db';
import { validateConnectionAccess } from '@/lib/db/teams';
import { getPoolManager } from '@/lib/db/connection-pool';
import { parseSQLStatements } from '@/lib/import/sql-importer';

const importSchema = z.object({
  connectionId: z.string().uuid(),
  sql: z.string().min(1),
  stopOnError: z.boolean().default(false),
  teamId: z.string().uuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = importSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { connectionId, sql, stopOnError, teamId } = validation.data;

    // Validate connection access
    const accessValidation = await validateConnectionAccess(user.id, connectionId, teamId || null);
    if (!accessValidation.isValid) {
      return NextResponse.json({ error: accessValidation.error || 'Access denied' }, { status: 403 });
    }

    // Get connection
    const connection = teamId 
      ? await getConnectionById(connectionId) 
      : await getConnectionById(connectionId, user.id);
    
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Parse SQL statements
    const statements = parseSQLStatements(sql);
    
    if (statements.length === 0) {
      return NextResponse.json({ error: 'No SQL statements found' }, { status: 400 });
    }

    // Get pool manager
    const poolManager = getPoolManager();

    let executedStatements = 0;
    const errors: Array<{
      statement: string;
      error: string;
      statementIndex: number;
      line: number;
    }> = [];

    // Execute statements
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      try {
        await poolManager.executeQuery(connection, stmt.sql);
        executedStatements++;
      } catch (error) {
        const errorInfo = {
          statement: stmt.sql.slice(0, 200) + (stmt.sql.length > 200 ? '...' : ''),
          error: error instanceof Error ? error.message : 'Unknown error',
          statementIndex: i,
          line: stmt.startLine + 1,
        };
        
        errors.push(errorInfo);
        
        if (stopOnError) {
          return NextResponse.json({
            success: false,
            totalStatements: statements.length,
            executedStatements,
            errors,
            stoppedAt: i,
          });
        }
      }
    }

    const success = errors.length === 0;

    return NextResponse.json({
      success,
      totalStatements: statements.length,
      executedStatements,
      errors,
    });
  } catch (error) {
    console.error('SQL import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
