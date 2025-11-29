#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import Database from 'better-sqlite3';
import { createPool as createMysqlPool } from 'mysql2/promise';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createHmac } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================
// Authentication Configuration
// =============================================

interface AuthenticatedUser {
  userId: string;
  permissions: string[];
}

let authenticatedUser: AuthenticatedUser | null = null;

// Simple decryption for passwords (must match encryption.ts)
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for MCP server.\n' +
      'Set it in your Claude Desktop config or shell environment.\n' +
      'Generate a secure key with: openssl rand -hex 16'
    );
  }
  if (key.length < 16) {
    throw new Error('ENCRYPTION_KEY must be at least 16 characters long.');
  }
  return key;
}

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Authenticates the MCP server using an API key
 * Returns user info if valid, null otherwise
 */
async function authenticateMCPKey(apiKey: string | undefined): Promise<AuthenticatedUser | null> {
  if (!apiKey) {
    return null;
  }
  
  const KEY_PREFIX = 'scurry_';
  if (!apiKey.startsWith(KEY_PREFIX)) {
    return null;
  }
  
  const dbPath = getAppDbPath();
  if (!fs.existsSync(dbPath)) {
    return null;
  }
  
  const db = new Database(dbPath, { readonly: true });
  
  try {
    // Hash the API key
    const keyHash = createHmac('sha256', ENCRYPTION_KEY)
      .update(apiKey)
      .digest('hex');
    
    // Look up the key
    const row = db.prepare(
      `SELECT user_id, permissions FROM mcp_api_keys 
       WHERE key_hash = ? 
       AND (expires_at IS NULL OR expires_at > ?)`
    ).get(keyHash, new Date().toISOString()) as { user_id: string; permissions: string } | undefined;
    
    if (!row) {
      return null;
    }
    
    // Update last used timestamp (in a separate connection to avoid readonly issues)
    const dbWrite = new Database(dbPath, { readonly: false });
    dbWrite.prepare('UPDATE mcp_api_keys SET last_used_at = ? WHERE key_hash = ?')
      .run(new Date().toISOString(), keyHash);
    dbWrite.close();
    
    let permissions: string[] = ['read'];
    try {
      permissions = row.permissions ? JSON.parse(row.permissions) : ['read'];
    } catch {
      permissions = ['read'];
    }
    
    return {
      userId: row.user_id,
      permissions,
    };
  } finally {
    db.close();
  }
}

/**
 * Checks if the authenticated user has a specific permission
 */
function hasPermission(permission: string): boolean {
  if (!authenticatedUser) {
    return false;
  }
  return authenticatedUser.permissions.includes(permission) || 
         authenticatedUser.permissions.includes('admin');
}

function decrypt(encryptedData: string): string {
  try {
    const crypto = require('crypto');
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'scurrydb-salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedData;
  }
}

// Get app database path
function getAppDbPath(): string {
  const dbDir = process.env.SCURRYDB_DATA_DIR || path.join(process.cwd(), 'data');
  return path.join(dbDir, 'scurrydb.db');
}

// Get connections from app database
// Now filtered by authenticated user
function getConnections(): Array<{
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}> {
  const dbPath = getAppDbPath();
  if (!fs.existsSync(dbPath)) {
    return [];
  }

  const db = new Database(dbPath, { readonly: true });
  
  // If authenticated, only return user's connections
  // If not authenticated (legacy mode), return all connections
  let rows: Array<{
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database_name: string;
    username: string;
    password: string;
  }>;
  
  if (authenticatedUser) {
    rows = db.prepare('SELECT * FROM connections WHERE user_id = ? ORDER BY name')
      .all(authenticatedUser.userId) as typeof rows;
  } else {
    rows = db.prepare('SELECT * FROM connections ORDER BY name').all() as typeof rows;
  }

  db.close();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    host: row.host,
    port: row.port,
    database: row.database_name,
    username: row.username,
    password: decrypt(row.password),
  }));
}

// Execute query on connection
async function executeQuery(
  connectionId: string,
  sql: string
): Promise<{ columns: string[]; rows: Record<string, unknown>[]; rowCount: number }> {
  const connections = getConnections();
  const conn = connections.find((c) => c.id === connectionId);
  if (!conn) {
    throw new Error(`Connection not found: ${connectionId}`);
  }

  switch (conn.type) {
    case 'mysql':
    case 'mariadb': {
      const pool = createMysqlPool({
        host: conn.host,
        port: conn.port,
        user: conn.username,
        password: conn.password,
        database: conn.database,
      });
      const [rows, fields] = await pool.query(sql);
      await pool.end();
      const columns = Array.isArray(fields) ? fields.map((f: { name: string }) => f.name) : [];
      const resultRows = Array.isArray(rows) ? rows : [];
      return {
        columns,
        rows: resultRows as Record<string, unknown>[],
        rowCount: resultRows.length,
      };
    }

    case 'postgresql': {
      const client = new pg.Client({
        host: conn.host,
        port: conn.port,
        user: conn.username,
        password: conn.password,
        database: conn.database,
      });
      await client.connect();
      const result = await client.query(sql);
      await client.end();
      return {
        columns: result.fields.map((f) => f.name),
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    }

    case 'sqlite': {
      const db = new Database(conn.host, { readonly: false });
      const stmt = db.prepare(sql);
      if (sql.trim().toLowerCase().startsWith('select')) {
        const rows = stmt.all();
        const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
        db.close();
        return {
          columns,
          rows: rows as Record<string, unknown>[],
          rowCount: rows.length,
        };
      } else {
        const info = stmt.run();
        db.close();
        return {
          columns: ['changes', 'lastInsertRowid'],
          rows: [{ changes: info.changes, lastInsertRowid: info.lastInsertRowid }],
          rowCount: 1,
        };
      }
    }

    default:
      throw new Error(`Unsupported database type: ${conn.type}`);
  }
}

// Get schema for connection
async function getSchema(connectionId: string): Promise<string> {
  const connections = getConnections();
  const conn = connections.find((c) => c.id === connectionId);
  if (!conn) {
    throw new Error(`Connection not found: ${connectionId}`);
  }

  let tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }> = [];

  switch (conn.type) {
    case 'mysql':
    case 'mariadb': {
      const pool = createMysqlPool({
        host: conn.host,
        port: conn.port,
        user: conn.username,
        password: conn.password,
        database: conn.database,
      });

      const [tableRows] = await pool.query('SHOW TABLES');
      const tableNames = (tableRows as Array<Record<string, string>>).map(
        (row) => Object.values(row)[0]
      );

      for (const tableName of tableNames) {
        const [columns] = await pool.query(`DESCRIBE ${tableName}`);
        tables.push({
          name: tableName,
          columns: (columns as Array<{ Field: string; Type: string }>).map((col) => ({
            name: col.Field,
            type: col.Type,
          })),
        });
      }

      await pool.end();
      break;
    }

    case 'postgresql': {
      const client = new pg.Client({
        host: conn.host,
        port: conn.port,
        user: conn.username,
        password: conn.password,
        database: conn.database,
      });
      await client.connect();

      const tableResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);

      for (const row of tableResult.rows) {
        const colResult = await client.query(
          `
          SELECT column_name, data_type FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
        `,
          [row.table_name]
        );
        tables.push({
          name: row.table_name,
          columns: colResult.rows.map((col) => ({
            name: col.column_name,
            type: col.data_type,
          })),
        });
      }

      await client.end();
      break;
    }

    case 'sqlite': {
      const db = new Database(conn.host, { readonly: true });
      const tableRows = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as Array<{ name: string }>;

      for (const table of tableRows) {
        const columns = db.prepare(`PRAGMA table_info(${table.name})`).all() as Array<{
          name: string;
          type: string;
        }>;
        tables.push({
          name: table.name,
          columns: columns.map((col) => ({ name: col.name, type: col.type })),
        });
      }

      db.close();
      break;
    }
  }

  return tables
    .map((t) => {
      const cols = t.columns.map((c) => `  - ${c.name}: ${c.type}`).join('\n');
      return `TABLE: ${t.name}\n${cols}`;
    })
    .join('\n\n');
}

// Create and start the MCP server
async function main() {
  // =============================================
  // Authentication Check
  // =============================================
  
  const apiKey = process.env.SCURRYDB_API_KEY;
  
  if (apiKey) {
    // Authenticate using the provided API key
    authenticatedUser = await authenticateMCPKey(apiKey);
    
    if (!authenticatedUser) {
      console.error('Error: Invalid or expired API key');
      console.error('Generate a new API key in ScurryDB Settings > MCP API Keys');
      process.exit(1);
    }
    
    console.error(`Authenticated as user: ${authenticatedUser.userId}`);
    console.error(`Permissions: ${authenticatedUser.permissions.join(', ')}`);
  } else {
    // No API key - warn but allow for backwards compatibility
    console.error('Warning: SCURRYDB_API_KEY not set');
    console.error('Running in legacy mode - all connections accessible');
    console.error('For secure access, generate an API key in ScurryDB Settings > MCP API Keys');
    console.error('Then set SCURRYDB_API_KEY in your Claude Desktop configuration');
  }
  
  const server = new Server(
    {
      name: 'scurrydb-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_connections',
          description: 'List all available database connections in ScurryDB',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_schema',
          description: 'Get the database schema (tables and columns) for a connection',
          inputSchema: {
            type: 'object',
            properties: {
              connectionId: {
                type: 'string',
                description: 'The ID of the database connection',
              },
            },
            required: ['connectionId'],
          },
        },
        {
          name: 'execute_query',
          description: 'Execute a SQL query on a database connection',
          inputSchema: {
            type: 'object',
            properties: {
              connectionId: {
                type: 'string',
                description: 'The ID of the database connection',
              },
              sql: {
                type: 'string',
                description: 'The SQL query to execute',
              },
            },
            required: ['connectionId', 'sql'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_connections': {
          const connections = getConnections();
          const summary = connections.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            database: c.database,
          }));
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(summary, null, 2),
              },
            ],
          };
        }

        case 'get_schema': {
          const connectionId = (args as { connectionId: string }).connectionId;
          const schema = await getSchema(connectionId);
          return {
            content: [
              {
                type: 'text',
                text: schema,
              },
            ],
          };
        }

        case 'execute_query': {
          const { connectionId, sql } = args as { connectionId: string; sql: string };
          
          // Check write permission for non-SELECT queries
          const isReadOnly = sql.trim().toUpperCase().startsWith('SELECT') ||
                            sql.trim().toUpperCase().startsWith('EXPLAIN') ||
                            sql.trim().toUpperCase().startsWith('DESCRIBE') ||
                            sql.trim().toUpperCase().startsWith('SHOW');
          
          if (!isReadOnly && authenticatedUser && !hasPermission('write')) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Write permission required for this query type. Your API key only has read access.',
                },
              ],
              isError: true,
            };
          }
          
          const result = await executeQuery(connectionId, sql);
          return {
            content: [
              {
                type: 'text',
                text: `Query executed successfully.\n\nColumns: ${result.columns.join(', ')}\nRows returned: ${result.rowCount}\n\nResults:\n${JSON.stringify(result.rows, null, 2)}`,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });

  // List resources (connections as resources)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const connections = getConnections();
    return {
      resources: connections.map((c) => ({
        uri: `scurrydb://connection/${c.id}`,
        name: c.name,
        description: `${c.type} database: ${c.database}`,
        mimeType: 'application/json',
      })),
    };
  });

  // Read resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const match = uri.match(/^scurrydb:\/\/connection\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }

    const connectionId = match[1];
    const schema = await getSchema(connectionId);

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: schema,
        },
      ],
    };
  });

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('ScurryDB MCP Server started');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
