import mysql from 'mysql2/promise';
import { Client } from 'pg';
import Database from 'better-sqlite3';
import type { DatabaseConnection, QueryResult, ColumnInfo } from '@/types';

const MAX_ROWS = 10000;

export async function executeQuery(
  connection: DatabaseConnection,
  sql: string,
  limit?: number
): Promise<QueryResult> {
  const startTime = Date.now();
  const effectiveLimit = Math.min(limit || MAX_ROWS, MAX_ROWS);

  try {
    switch (connection.type) {
      case 'mysql':
      case 'mariadb':
        return await executeMySqlQuery(connection, sql, effectiveLimit, startTime);
      case 'postgresql':
        return await executePostgresQuery(connection, sql, effectiveLimit, startTime);
      case 'sqlite':
        return executeSqliteQuery(connection, sql, effectiveLimit, startTime);
      default:
        throw new Error(`Unsupported database type: ${connection.type}`);
    }
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function executeMySqlQuery(
  connection: DatabaseConnection,
  sql: string,
  limit: number,
  startTime: number
): Promise<QueryResult> {
  const conn = await mysql.createConnection({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? {} : undefined,
  });

  try {
    const [rows, fields] = await conn.execute(sql);
    const executionTime = Date.now() - startTime;

    if (!Array.isArray(rows)) {
      // Non-SELECT query (INSERT, UPDATE, DELETE, etc.)
      const result = rows as mysql.ResultSetHeader;
      return {
        columns: [{ name: 'affected_rows', type: 'number', nullable: false }],
        rows: [{ affected_rows: result.affectedRows }],
        rowCount: 1,
        executionTime,
      };
    }

    const columns: ColumnInfo[] = (fields as mysql.FieldPacket[]).map((field) => ({
      name: field.name,
      type: String(field.type),
      nullable: (Number(field.flags ?? 0) & 1) === 0, // NOT_NULL_FLAG = 1
    }));

    const limitedRows = (rows as Record<string, unknown>[]).slice(0, limit);

    return {
      columns,
      rows: limitedRows,
      rowCount: rows.length,
      executionTime,
    };
  } finally {
    await conn.end();
  }
}

async function executePostgresQuery(
  connection: DatabaseConnection,
  sql: string,
  limit: number,
  startTime: number
): Promise<QueryResult> {
  const client = new Client({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const result = await client.query(sql);
    const executionTime = Date.now() - startTime;

    if (result.command !== 'SELECT') {
      return {
        columns: [{ name: 'affected_rows', type: 'number', nullable: false }],
        rows: [{ affected_rows: result.rowCount || 0 }],
        rowCount: 1,
        executionTime,
      };
    }

    const columns: ColumnInfo[] = result.fields.map((field) => ({
      name: field.name,
      type: String(field.dataTypeID),
      nullable: true,
    }));

    const limitedRows = result.rows.slice(0, limit);

    return {
      columns,
      rows: limitedRows,
      rowCount: result.rowCount || 0,
      executionTime,
    };
  } finally {
    await client.end();
  }
}

function executeSqliteQuery(
  connection: DatabaseConnection,
  sql: string,
  limit: number,
  startTime: number
): QueryResult {
  const db = new Database(connection.database);
  
  try {
    const trimmedSql = sql.trim().toLowerCase();
    const isSelect = trimmedSql.startsWith('select') || trimmedSql.startsWith('pragma') || trimmedSql.startsWith('explain');
    
    if (isSelect) {
      const stmt = db.prepare(sql);
      const rows = stmt.all() as Record<string, unknown>[];
      const executionTime = Date.now() - startTime;
      
      // Get column info from the first row or statement
      const columns: ColumnInfo[] = stmt.columns().map((col) => ({
        name: col.name,
        type: col.type || 'unknown',
        nullable: true,
      }));
      
      const limitedRows = rows.slice(0, limit);
      
      return {
        columns,
        rows: limitedRows,
        rowCount: rows.length,
        executionTime,
      };
    } else {
      // Non-SELECT query (INSERT, UPDATE, DELETE, etc.)
      const result = db.prepare(sql).run();
      const executionTime = Date.now() - startTime;
      
      return {
        columns: [{ name: 'affected_rows', type: 'number', nullable: false }],
        rows: [{ affected_rows: result.changes }],
        rowCount: 1,
        executionTime,
      };
    }
  } finally {
    db.close();
  }
}
