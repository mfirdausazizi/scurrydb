import mysql from 'mysql2/promise';
import type { DatabaseConnection } from '@/types';

export async function testMySqlConnection(connection: DatabaseConnection): Promise<{ success: boolean; message: string; version?: string }> {
  let conn: mysql.Connection | null = null;
  
  try {
    conn = await mysql.createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: connection.password,
      database: connection.database,
      ssl: connection.ssl ? {} : undefined,
      connectTimeout: 10000,
    });
    
    const [rows] = await conn.execute('SELECT VERSION() as version');
    const version = (rows as Array<{ version: string }>)[0]?.version;
    
    return {
      success: true,
      message: 'Connection successful',
      version,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Connection failed: ${message}`,
    };
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

export async function createMySqlPool(connection: DatabaseConnection): Promise<mysql.Pool> {
  return mysql.createPool({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? {} : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}
