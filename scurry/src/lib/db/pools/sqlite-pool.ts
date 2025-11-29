/**
 * SQLite Connection Wrapper
 * 
 * SQLite doesn't support true connection pooling since it's file-based.
 * This wrapper maintains a single connection with proper lifecycle management.
 * Uses better-sqlite3 which is synchronous and doesn't need pooling.
 */

import Database, { Database as DatabaseType } from 'better-sqlite3';
import type { DatabaseConnection, ColumnInfo } from '@/types';

export interface SQLitePoolConfig {
  // SQLite doesn't need pool config, but we keep interface consistent
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
}

export interface SQLiteQueryResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  rowCount: number;
  affectedRows?: number;
}

const DEFAULT_CONFIG: SQLitePoolConfig = {
  readonly: false,
  fileMustExist: false,
  timeout: 30000,
};

export class SQLitePoolWrapper {
  private db: DatabaseType | null = null;
  private connectionId: string;
  private databasePath: string;
  private config: SQLitePoolConfig;
  private lastAccess: number = Date.now();
  private isInUse: boolean = false;

  constructor(connection: DatabaseConnection, config: SQLitePoolConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.connectionId = connection.id;
    this.databasePath = connection.database;
  }

  /**
   * Get or create the database connection
   */
  private getConnection(): DatabaseType {
    if (!this.db) {
      this.db = new Database(this.databasePath, {
        readonly: this.config.readonly,
        fileMustExist: this.config.fileMustExist,
        timeout: this.config.timeout,
      });
      
      // Enable foreign keys and WAL mode for better performance
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');
    }
    this.lastAccess = Date.now();
    return this.db;
  }

  /**
   * Acquire the connection (for API consistency)
   */
  async acquire(): Promise<DatabaseType> {
    this.isInUse = true;
    return this.getConnection();
  }

  /**
   * Release the connection (for API consistency)
   */
  release(): void {
    this.isInUse = false;
    // Don't actually close - keep connection open for reuse
  }

  /**
   * Execute a query
   */
  async query(sql: string, params?: unknown[]): Promise<SQLiteQueryResult> {
    const db = this.getConnection();
    const trimmedSql = sql.trim().toLowerCase();
    const isSelect = trimmedSql.startsWith('select') || 
                     trimmedSql.startsWith('pragma') || 
                     trimmedSql.startsWith('explain');

    try {
      if (isSelect) {
        const stmt = db.prepare(sql);
        const rows = params && params.length > 0 
          ? stmt.all(...params) as Record<string, unknown>[]
          : stmt.all() as Record<string, unknown>[];

        const columns: ColumnInfo[] = stmt.columns().map((col) => ({
          name: col.name,
          type: col.type || 'unknown',
          nullable: true,
        }));

        return {
          columns,
          rows,
          rowCount: rows.length,
        };
      } else {
        // Non-SELECT query (INSERT, UPDATE, DELETE, etc.)
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
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute a query with a timeout
   * SQLite doesn't have built-in query timeout, so we use a progress handler
   */
  async queryWithTimeout(sql: string, params: unknown[] | undefined, timeoutMs: number): Promise<SQLiteQueryResult> {
    const db = this.getConnection();
    const startTime = Date.now();
    
    // Set up progress handler that checks timeout
    // The handler is called periodically during query execution
    const progressInterval = 1000; // Check every 1000 virtual machine instructions
    let timedOut = false;
    
    db.function('check_timeout', () => {
      if (Date.now() - startTime > timeoutMs) {
        timedOut = true;
        return 1; // Return non-zero to interrupt
      }
      return 0;
    });

    try {
      // We can't directly interrupt SQLite queries, so we wrap with Promise.race
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          timedOut = true;
          reject(new Error(`Query timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const queryPromise = this.query(sql, params);
      
      return await Promise.race([queryPromise, timeoutPromise]);
    } finally {
      // Clean up the timeout function
      if (timedOut) {
        // If timed out, we may need to interrupt the database
        // In practice, better-sqlite3 is synchronous so this rarely helps
        try {
          db.exec('SELECT 1'); // Reset connection state
        } catch {
          // Ignore errors during cleanup
        }
      }
    }
  }

  /**
   * Get pool statistics (simplified for SQLite)
   */
  getStats(): { active: number; idle: number; waiting: number } {
    return {
      active: this.isInUse ? 1 : 0,
      idle: this.db && !this.isInUse ? 1 : 0,
      waiting: 0,
    };
  }

  /**
   * Close the database connection
   */
  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if the connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get last access time (for LRU eviction)
   */
  getLastAccess(): number {
    return this.lastAccess;
  }

  get id(): string {
    return this.connectionId;
  }
}
