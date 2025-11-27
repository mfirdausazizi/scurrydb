import type { DatabaseConnection } from '@/types';
import { testMySqlConnection } from './mysql';
import { testPostgresConnection } from './postgresql';
import { testSqliteConnection } from './sqlite';

export async function testConnection(connection: DatabaseConnection): Promise<{ success: boolean; message: string; version?: string }> {
  switch (connection.type) {
    case 'mysql':
    case 'mariadb':
      return testMySqlConnection(connection);
    case 'postgresql':
      return testPostgresConnection(connection);
    case 'sqlite':
      return testSqliteConnection(connection);
    default:
      return {
        success: false,
        message: `Unsupported database type: ${connection.type}`,
      };
  }
}

export { testMySqlConnection, createMySqlPool } from './mysql';
export { testPostgresConnection, createPostgresPool } from './postgresql';
export { testSqliteConnection, createSqliteConnection } from './sqlite';
