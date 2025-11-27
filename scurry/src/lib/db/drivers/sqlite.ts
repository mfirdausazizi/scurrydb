import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { DatabaseConnection } from '@/types';

export function testSqliteConnection(connection: DatabaseConnection): { success: boolean; message: string; version?: string } {
  try {
    const dbPath = connection.database;
    
    // Check if it's an in-memory database
    if (dbPath === ':memory:') {
      const db = new Database(':memory:');
      const result = db.prepare('SELECT sqlite_version() as version').get() as { version: string };
      db.close();
      return {
        success: true,
        message: 'Connected to in-memory SQLite database',
        version: `SQLite ${result.version}`,
      };
    }
    
    // Check if file exists (for existing databases)
    const fileExists = fs.existsSync(dbPath);
    
    if (!fileExists) {
      // Check if parent directory exists and is writable
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        return {
          success: false,
          message: `Directory does not exist: ${dir}`,
        };
      }
      
      // Try to create and immediately delete a test file to check write permissions
      try {
        fs.accessSync(dir, fs.constants.W_OK);
      } catch {
        return {
          success: false,
          message: `Cannot write to directory: ${dir}`,
        };
      }
    }
    
    // Try to open the database
    const db = new Database(dbPath);
    const result = db.prepare('SELECT sqlite_version() as version').get() as { version: string };
    db.close();
    
    return {
      success: true,
      message: fileExists ? 'Connected to existing SQLite database' : 'SQLite database will be created',
      version: `SQLite ${result.version}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to connect to SQLite database',
    };
  }
}

export function createSqliteConnection(connection: DatabaseConnection): Database.Database {
  return new Database(connection.database);
}
