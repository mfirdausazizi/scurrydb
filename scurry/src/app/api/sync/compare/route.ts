import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getConnectionById } from '@/lib/db/app-db';
import { fetchColumns } from '@/lib/db/schema-fetcher';
import { executeQuery } from '@/lib/db/query-executor';
import { validateConnectionAccess } from '@/lib/db/teams';
import { quoteIdentifier, type DatabaseType } from '@/lib/db/sql-utils';
import {
  calculateRowDiffs,
  calculateComparisonSummary,
} from '@/lib/sync/diff-calculator';
import type { CompareTablesRequest } from '@/types/sync';

const COMPARISON_LIMIT = 1000;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CompareTablesRequest = await request.json();
    const { sourceConnectionId, targetConnectionId, tableName, teamId } = body;

    if (!sourceConnectionId || !targetConnectionId || !tableName) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceConnectionId, targetConnectionId, tableName' },
        { status: 400 }
      );
    }

    // Validate access to both connections
    const [sourceAccess, targetAccess] = await Promise.all([
      validateConnectionAccess(user.id, sourceConnectionId, teamId || null),
      validateConnectionAccess(user.id, targetConnectionId, teamId || null),
    ]);

    if (!sourceAccess.isValid) {
      return NextResponse.json({ error: 'Access denied to source connection' }, { status: 403 });
    }
    if (!targetAccess.isValid) {
      return NextResponse.json({ error: 'Access denied to target connection' }, { status: 403 });
    }

    // Get both connections
    const sourceConnection = teamId
      ? await getConnectionById(sourceConnectionId)
      : await getConnectionById(sourceConnectionId, user.id);
    const targetConnection = teamId
      ? await getConnectionById(targetConnectionId)
      : await getConnectionById(targetConnectionId, user.id);

    if (!sourceConnection) {
      return NextResponse.json({ error: 'Source connection not found' }, { status: 404 });
    }
    if (!targetConnection) {
      return NextResponse.json({ error: 'Target connection not found' }, { status: 404 });
    }

    // Get table structure from source to find primary keys and columns
    const sourceColumns = await fetchColumns(sourceConnection, tableName);
    const primaryKeyColumns = sourceColumns
      .filter((c) => c.isPrimaryKey)
      .map((c) => c.name);

    if (primaryKeyColumns.length === 0) {
      return NextResponse.json(
        { error: 'Table has no primary key. Cannot compare without primary key.' },
        { status: 400 }
      );
    }

    // Get column names for comparison
    const columnNames = sourceColumns.map((c) => c.name);

    // Build query with proper escaping
    const sourceDbType = sourceConnection.type as DatabaseType;
    const targetDbType = targetConnection.type as DatabaseType;
    const sourceQuotedTable = quoteIdentifier(tableName, sourceDbType);
    const targetQuotedTable = quoteIdentifier(tableName, targetDbType);

    // Fetch data from both tables
    const [sourceResult, targetResult] = await Promise.all([
      executeQuery(sourceConnection, `SELECT * FROM ${sourceQuotedTable} LIMIT ${COMPARISON_LIMIT}`),
      executeQuery(targetConnection, `SELECT * FROM ${targetQuotedTable} LIMIT ${COMPARISON_LIMIT}`),
    ]);

    if (sourceResult.error) {
      return NextResponse.json(
        { error: `Source query failed: ${sourceResult.error}` },
        { status: 500 }
      );
    }
    if (targetResult.error) {
      return NextResponse.json(
        { error: `Target query failed: ${targetResult.error}` },
        { status: 500 }
      );
    }

    // Calculate diffs
    const diffs = calculateRowDiffs({
      primaryKeyColumns,
      sourceRows: sourceResult.rows,
      targetRows: targetResult.rows,
      columns: columnNames,
    });

    const summary = calculateComparisonSummary(diffs);

    return NextResponse.json({
      tableName,
      primaryKeyColumns,
      columns: columnNames,
      sourceRowCount: sourceResult.rows.length,
      targetRowCount: targetResult.rows.length,
      ...summary,
      diffs,
      truncated: sourceResult.rows.length >= COMPARISON_LIMIT || targetResult.rows.length >= COMPARISON_LIMIT,
    });
  } catch (error) {
    console.error('Error comparing tables:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compare tables' },
      { status: 500 }
    );
  }
}
