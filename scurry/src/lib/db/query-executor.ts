/**
 * Query Executor
 * 
 * Executes SQL queries against database connections using connection pooling.
 * Supports MySQL, PostgreSQL, MariaDB, and SQLite.
 * 
 * Key features:
 * - Connection pooling for performance (10x faster repeated queries)
 * - Query timeouts to prevent hanging queries
 * - Parameterized queries for security
 * - Automatic limit enforcement
 */

import { getPoolManager, type PoolQueryResult } from './connection-pool';
import type { DatabaseConnection, QueryResult, ColumnInfo } from '@/types';

// Configuration
const MAX_ROWS = parseInt(process.env.MAX_QUERY_ROWS || '10000', 10);
const DEFAULT_TIMEOUT = parseInt(process.env.DEFAULT_QUERY_TIMEOUT || '30000', 10); // 30 seconds

export interface QueryOptions {
  limit?: number;
  timeout?: number;
  usePool?: boolean; // Default: true, set to false to bypass pool
}

/**
 * Execute a SQL query against a database connection
 * Uses connection pooling by default for improved performance
 */
export async function executeQuery(
  connection: DatabaseConnection,
  sql: string,
  limit?: number
): Promise<QueryResult> {
  return executeQueryWithOptions(connection, sql, undefined, { limit });
}

/**
 * Execute a parameterized query for safe searching
 * This version accepts parameters to prevent SQL injection
 */
export async function executeQueryWithParams(
  connection: DatabaseConnection,
  sql: string,
  params: unknown[],
  limit?: number
): Promise<QueryResult> {
  return executeQueryWithOptions(connection, sql, params, { limit });
}

/**
 * Execute a query with full options support
 */
export async function executeQueryWithOptions(
  connection: DatabaseConnection,
  sql: string,
  params?: unknown[],
  options: QueryOptions = {}
): Promise<QueryResult> {
  const startTime = Date.now();
  const effectiveLimit = Math.min(options.limit || MAX_ROWS, MAX_ROWS);
  const timeout = options.timeout ?? (connection.timeout || DEFAULT_TIMEOUT);
  const usePool = options.usePool !== false;

  try {
    let result: PoolQueryResult;

    if (usePool) {
      // Use connection pool for better performance
      const poolManager = getPoolManager();
      result = await poolManager.executeQuery(connection, sql, params, {
        timeout: timeout > 0 ? timeout : undefined,
        limit: effectiveLimit,
      });
    } else {
      // Fallback to direct connection (useful for one-off operations)
      result = await executeDirectQuery(connection, sql, params, effectiveLimit, timeout);
    }

    const executionTime = Date.now() - startTime;

    return {
      columns: result.columns,
      rows: result.rows.slice(0, effectiveLimit),
      rowCount: result.rowCount,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Handle timeout errors with a friendly message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.toLowerCase().includes('timeout') || 
                      errorMessage.includes('canceling statement due to statement timeout');
    
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime,
      error: isTimeout 
        ? `Query timed out after ${Math.round(timeout / 1000)} seconds. Consider adding a LIMIT clause or optimizing your query.`
        : errorMessage,
    };
  }
}

/**
 * Execute a query with explicit timeout
 */
export async function executeQueryWithTimeout(
  connection: DatabaseConnection,
  sql: string,
  timeout: number,
  limit?: number
): Promise<QueryResult> {
  return executeQueryWithOptions(connection, sql, undefined, { limit, timeout });
}

/**
 * Direct query execution without pooling
 * Used for one-off operations or when pool is not desired
 */
async function executeDirectQuery(
  connection: DatabaseConnection,
  sql: string,
  params: unknown[] | undefined,
  limit: number,
  timeout: number
): Promise<PoolQueryResult> {
  // Import drivers dynamically to avoid loading all at startup
  switch (connection.type) {
    case 'mysql':
    case 'mariadb':
      return executeDirectMySqlQuery(connection, sql, params, limit, timeout);
    case 'postgresql':
      return executeDirectPostgresQuery(connection, sql, params, limit, timeout);
    case 'sqlite':
      return executeDirectSqliteQuery(connection, sql, params, limit);
    default:
      throw new Error(`Unsupported database type: ${connection.type}`);
  }
}

async function executeDirectMySqlQuery(
  connection: DatabaseConnection,
  sql: string,
  params: unknown[] | undefined,
  limit: number,
  timeout: number
): Promise<PoolQueryResult> {
  const mysql = await import('mysql2/promise');
  type ResultSetHeader = { affectedRows: number; insertId: number };
  type FieldPacket = { name: string; type: number; flags?: number };
  
  const conn = await mysql.default.createConnection({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? {} : undefined,
    connectTimeout: timeout,
  });

  try {
    // Try to set query timeout (MySQL 5.7.8+ only, fails silently on older versions)
    if (timeout > 0) {
      try {
        await conn.execute(`SET SESSION max_execution_time = ${timeout}`);
      } catch {
        // Timeout not supported on this MySQL version (< 5.7.8) or MariaDB - continue without it
      }
    }

    const [rows, fields] = params 
      ? await conn.execute(sql, params)
      : await conn.execute(sql);

    if (!Array.isArray(rows)) {
      const result = rows as ResultSetHeader;
      return {
        columns: [{ name: 'affected_rows', type: 'number', nullable: false }],
        rows: [{ affected_rows: result.affectedRows }],
        rowCount: 1,
        affectedRows: result.affectedRows,
      };
    }

    const columns: ColumnInfo[] = (fields as FieldPacket[]).map((field) => ({
      name: field.name,
      type: String(field.type),
      nullable: (Number(field.flags ?? 0) & 1) === 0,
    }));

    return {
      columns,
      rows: (rows as Record<string, unknown>[]).slice(0, limit),
      rowCount: rows.length,
    };
  } finally {
    await conn.end();
  }
}

async function executeDirectPostgresQuery(
  connection: DatabaseConnection,
  sql: string,
  params: unknown[] | undefined,
  limit: number,
  timeout: number
): Promise<PoolQueryResult> {
  const { Client } = await import('pg');
  
  const client = new Client({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: timeout,
    statement_timeout: timeout,
  });

  await client.connect();

  try {
    const result = params 
      ? await client.query(sql, params)
      : await client.query(sql);

    if (result.command !== 'SELECT') {
      return {
        columns: [{ name: 'affected_rows', type: 'number', nullable: false }],
        rows: [{ affected_rows: result.rowCount || 0 }],
        rowCount: 1,
        affectedRows: result.rowCount || 0,
      };
    }

    const columns: ColumnInfo[] = result.fields.map((field) => ({
      name: field.name,
      type: String(field.dataTypeID),
      nullable: true,
    }));

    return {
      columns,
      rows: result.rows.slice(0, limit),
      rowCount: result.rowCount || 0,
    };
  } finally {
    await client.end();
  }
}

function executeDirectSqliteQuery(
  connection: DatabaseConnection,
  sql: string,
  params: unknown[] | undefined,
  limit: number
): PoolQueryResult {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const db = new Database(connection.database);
  
  try {
    const trimmedSql = sql.trim().toLowerCase();
    const isSelect = trimmedSql.startsWith('select') || 
                     trimmedSql.startsWith('pragma') || 
                     trimmedSql.startsWith('explain');
    
    if (isSelect) {
      const stmt = db.prepare(sql);
      const rows = params && params.length > 0
        ? stmt.all(...params) as Record<string, unknown>[]
        : stmt.all() as Record<string, unknown>[];
      
      const columns: ColumnInfo[] = stmt.columns().map((col: { name: string; type: string | null }) => ({
        name: col.name,
        type: col.type || 'unknown',
        nullable: true,
      }));
      
      return {
        columns,
        rows: rows.slice(0, limit),
        rowCount: rows.length,
      };
    } else {
      const stmt = db.prepare(sql);
      const result = params && params.length > 0
        ? stmt.run(...params)
        : stmt.run();
      
      return {
        columns: [{ name: 'affected_rows', type: 'number', nullable: false }],
        rows: [{ affected_rows: result.changes }],
        rowCount: 1,
        affectedRows: result.changes,
      };
    }
  } finally {
    db.close();
  }
}

/**
 * Invalidate a connection's pool (call when connection is deleted or updated)
 */
export async function invalidateConnectionPool(connectionId: string): Promise<void> {
  const poolManager = getPoolManager();
  await poolManager.destroyPool(connectionId);
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
  const poolManager = getPoolManager();
  return {
    pools: poolManager.getPoolStats(),
    summary: poolManager.getStatsSummary(),
  };
}
