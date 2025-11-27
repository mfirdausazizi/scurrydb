import { Client, Pool } from 'pg';
import type { DatabaseConnection } from '@/types';

export async function testPostgresConnection(connection: DatabaseConnection): Promise<{ success: boolean; message: string; version?: string }> {
  const client = new Client({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    const version = result.rows[0]?.version;
    
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
    await client.end();
  }
}

export function createPostgresPool(connection: DatabaseConnection): Pool {
  return new Pool({
    host: connection.host,
    port: connection.port,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}
