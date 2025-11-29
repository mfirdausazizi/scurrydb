/**
 * PostgreSQL Connection Pool Wrapper
 * 
 * Uses pg's built-in connection pooling for efficient connection reuse.
 * Provides a standardized interface for the ConnectionPoolManager.
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import type { DatabaseConnection, ColumnInfo } from '@/types';

export interface PostgresPoolConfig {
  min?: number;
  max?: number;
  idleTimeoutMs?: number;
  acquireTimeoutMs?: number;
}

export interface PostgresQueryResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  rowCount: number;
  affectedRows?: number;
}

const DEFAULT_CONFIG: PostgresPoolConfig = {
  min: 2,
  max: 10,
  idleTimeoutMs: 30000,
  acquireTimeoutMs: 10000,
};

export class PostgresPoolWrapper {
  private pool: Pool;
  private connectionId: string;
  private activeConnections: number = 0;

  constructor(connection: DatabaseConnection, config: PostgresPoolConfig = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    this.connectionId = connection.id;

    const poolConfig: PoolConfig = {
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
      min: mergedConfig.min,
      max: mergedConfig.max,
      idleTimeoutMillis: mergedConfig.idleTimeoutMs,
      connectionTimeoutMillis: mergedConfig.acquireTimeoutMs,
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors to prevent crashes
    this.pool.on('error', (err) => {
      console.error(`PostgreSQL pool error for connection ${this.connectionId}:`, err);
    });
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<PoolClient> {
    this.activeConnections++;
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      this.activeConnections--;
      throw error;
    }
  }

  /**
   * Release a connection back to the pool
   */
  release(client: PoolClient): void {
    this.activeConnections--;
    client.release();
  }

  /**
   * Execute a query using a pooled connection
   */
  async query(sql: string, params?: unknown[]): Promise<PostgresQueryResult> {
    const client = await this.acquire();
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
        nullable: true, // PostgreSQL doesn't expose nullability in query result
      }));

      return {
        columns,
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } finally {
      this.release(client);
    }
  }

  /**
   * Execute a query with a timeout
   */
  async queryWithTimeout(sql: string, params: unknown[] | undefined, timeoutMs: number): Promise<PostgresQueryResult> {
    const client = await this.acquire();
    try {
      // Set statement timeout for this session
      await client.query(`SET statement_timeout = '${timeoutMs}ms'`);
      
      const result = params 
        ? await client.query(sql, params)
        : await client.query(sql);

      // Reset timeout to default (0 = no limit)
      await client.query('SET statement_timeout = 0');

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
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      // Reset timeout even on error
      try {
        await client.query('SET statement_timeout = 0');
      } catch {
        // Ignore reset error
      }
      throw error;
    } finally {
      this.release(client);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): { active: number; idle: number; waiting: number } {
    return {
      active: this.activeConnections,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
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
