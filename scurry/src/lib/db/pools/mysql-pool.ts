/**
 * MySQL Connection Pool Wrapper
 * 
 * Uses mysql2's built-in connection pooling for efficient connection reuse.
 * Provides a standardized interface for the ConnectionPoolManager.
 */

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, PoolOptions, FieldPacket, ResultSetHeader } from 'mysql2/promise';
import type { DatabaseConnection, ColumnInfo } from '@/types';

export interface MySQLPoolConfig {
  min?: number;
  max?: number;
  idleTimeoutMs?: number;
  acquireTimeoutMs?: number;
}

export interface MySQLQueryResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  rowCount: number;
  affectedRows?: number;
}

const DEFAULT_CONFIG: MySQLPoolConfig = {
  min: 2,
  max: 10,
  idleTimeoutMs: 30000,
  acquireTimeoutMs: 10000,
};

export class MySQLPoolWrapper {
  private pool: Pool;
  private connectionId: string;
  private activeConnections: number = 0;

  constructor(connection: DatabaseConnection, config: MySQLPoolConfig = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    this.connectionId = connection.id;

    const poolOptions: PoolOptions = {
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      ssl: connection.ssl ? {} : undefined,
      waitForConnections: true,
      connectionLimit: mergedConfig.max,
      queueLimit: 0, // Unlimited queue
      idleTimeout: mergedConfig.idleTimeoutMs,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    };

    this.pool = mysql.createPool(poolOptions);
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<PoolConnection> {
    this.activeConnections++;
    try {
      const connection = await this.pool.getConnection();
      return connection;
    } catch (error) {
      this.activeConnections--;
      throw error;
    }
  }

  /**
   * Release a connection back to the pool
   */
  release(connection: PoolConnection): void {
    this.activeConnections--;
    connection.release();
  }

  /**
   * Execute a query using a pooled connection
   */
  async query(sql: string, params?: unknown[]): Promise<MySQLQueryResult> {
    const connection = await this.acquire();
    try {
      const [rows, fields] = params 
        ? await connection.execute(sql, params)
        : await connection.execute(sql);

      if (!Array.isArray(rows)) {
        // Non-SELECT query (INSERT, UPDATE, DELETE, etc.)
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
        nullable: (Number(field.flags ?? 0) & 1) === 0, // NOT_NULL_FLAG = 1
      }));

      return {
        columns,
        rows: rows as Record<string, unknown>[],
        rowCount: rows.length,
      };
    } finally {
      this.release(connection);
    }
  }

  /**
   * Execute a query with a timeout
   */
  async queryWithTimeout(sql: string, params: unknown[] | undefined, timeoutMs: number): Promise<MySQLQueryResult> {
    const connection = await this.acquire();
    let timeoutSet = false;
    
    try {
      // Try to set session-level query timeout (MySQL 5.7.8+ only)
      // This fails silently on older MySQL versions and MariaDB
      try {
        await connection.execute(`SET SESSION max_execution_time = ${timeoutMs}`);
        timeoutSet = true;
      } catch {
        // Timeout not supported - continue without it
        // Could be MySQL < 5.7.8 or MariaDB
      }
      
      const [rows, fields] = params 
        ? await connection.execute(sql, params)
        : await connection.execute(sql);

      // Reset timeout only if it was successfully set
      if (timeoutSet) {
        try {
          await connection.execute('SET SESSION max_execution_time = 0');
        } catch {
          // Ignore reset errors
        }
      }

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
        rows: rows as Record<string, unknown>[],
        rowCount: rows.length,
      };
    } finally {
      this.release(connection);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): { active: number; idle: number; waiting: number } {
    const poolState = this.pool.pool;
    return {
      active: this.activeConnections,
      idle: poolState ? (poolState as { _freeConnections?: { length: number } })._freeConnections?.length || 0 : 0,
      waiting: poolState ? (poolState as { _connectionQueue?: { length: number } })._connectionQueue?.length || 0 : 0,
    };
  }

  /**
   * Close the pool and all connections
   */
  async destroy(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Check if the pool is healthy by executing a simple query
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  get id(): string {
    return this.connectionId;
  }
}
