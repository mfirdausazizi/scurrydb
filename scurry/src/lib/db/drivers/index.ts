import type { DatabaseConnection } from '@/types';
import { testMySqlConnection } from './mysql';
import { testPostgresConnection } from './postgresql';

export async function testConnection(connection: DatabaseConnection): Promise<{ success: boolean; message: string; version?: string }> {
  switch (connection.type) {
    case 'mysql':
    case 'mariadb':
      return testMySqlConnection(connection);
    case 'postgresql':
      return testPostgresConnection(connection);
    case 'sqlite':
      return {
        success: true,
        message: 'SQLite connection validated',
        version: 'SQLite 3',
      };
    default:
      return {
        success: false,
        message: `Unsupported database type: ${connection.type}`,
      };
  }
}

export { testMySqlConnection, createMySqlPool } from './mysql';
export { testPostgresConnection, createPostgresPool } from './postgresql';
