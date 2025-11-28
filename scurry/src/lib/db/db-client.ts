// Unified database client interface for both SQLite (local) and Turso (production)
import Database from 'better-sqlite3';
import { getTursoClient, isTursoEnabled } from './turso-adapter';
import type { Client as TursoClient, ResultSet } from '@libsql/client';

export interface DbRow {
  [key: string]: unknown;
}

export interface DbResult {
  changes: number;
  lastInsertRowid?: number | bigint;
}

export class UnifiedDbClient {
  private sqliteDb?: Database.Database;
  private tursoClient?: TursoClient;
  private useTurso: boolean;

  constructor(sqliteDb?: Database.Database) {
    this.useTurso = isTursoEnabled();
    
    if (this.useTurso) {
      this.tursoClient = getTursoClient();
    } else {
      this.sqliteDb = sqliteDb;
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<DbResult> {
    if (this.useTurso && this.tursoClient) {
      const result = await this.tursoClient.execute({
        sql,
        args: params || [],
      });
      return {
        changes: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid,
      };
    } else if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(sql);
      const result = stmt.run(...(params || []));
      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
      };
    }
    throw new Error('No database client available');
  }

  async query(sql: string, params?: unknown[]): Promise<DbRow[]> {
    if (this.useTurso && this.tursoClient) {
      const result = await this.tursoClient.execute({
        sql,
        args: params || [],
      });
      return result.rows as DbRow[];
    } else if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(sql);
      return stmt.all(...(params || [])) as DbRow[];
    }
    throw new Error('No database client available');
  }

  async queryOne(sql: string, params?: unknown[]): Promise<DbRow | null> {
    if (this.useTurso && this.tursoClient) {
      const result = await this.tursoClient.execute({
        sql,
        args: params || [],
      });
      return (result.rows[0] as DbRow) || null;
    } else if (this.sqliteDb) {
      const stmt = this.sqliteDb.prepare(sql);
      const row = stmt.get(...(params || []));
      return row ? (row as DbRow) : null;
    }
    throw new Error('No database client available');
  }

  async transaction<T>(callback: () => Promise<T> | T): Promise<T> {
    if (this.useTurso && this.tursoClient) {
      // Turso transactions
      return await this.tursoClient.batch([
        // Note: Turso handles transactions differently
        // You might need to implement this based on your needs
      ]) as T;
    } else if (this.sqliteDb) {
      // SQLite transaction
      const transaction = this.sqliteDb.transaction(callback);
      return transaction() as T;
    }
    throw new Error('No database client available');
  }

  exec(sql: string): void {
    if (this.useTurso && this.tursoClient) {
      // For exec operations with Turso, we need to execute synchronously
      // This is a limitation - Turso doesn't have a direct exec equivalent
      throw new Error('exec() is not supported with Turso. Use execute() instead.');
    } else if (this.sqliteDb) {
      this.sqliteDb.exec(sql);
    } else {
      throw new Error('No database client available');
    }
  }

  pragma(pragma: string): void {
    if (this.useTurso) {
      // Turso doesn't support all SQLite pragmas
      console.warn('Pragma not supported in Turso:', pragma);
      return;
    } else if (this.sqliteDb) {
      this.sqliteDb.pragma(pragma);
    }
  }
}
