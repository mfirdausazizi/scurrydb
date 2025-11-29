/**
 * MCP API Key Management
 * 
 * Provides functions for creating, validating, and managing API keys
 * for MCP (Model Context Protocol) server authentication.
 */

import { v4 as uuidv4 } from 'uuid';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getDbClient, type DbRow } from './db-client';

// Key generation settings
const KEY_PREFIX = 'scurry_'; // Prefix for easy identification
const KEY_LENGTH = 32; // 32 bytes = 64 hex characters
const KEY_SECRET = process.env.ENCRYPTION_KEY || 'default-key-secret';

export interface MCPApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string; // First 8 characters of the key for display
  permissions: string[]; // ['read', 'write', 'admin']
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

interface MCPApiKeyWithHash extends MCPApiKey {
  keyHash: string;
}

function rowToMCPApiKey(row: DbRow): MCPApiKey {
  let permissions: string[] = ['read'];
  try {
    const permStr = row.permissions as string;
    permissions = permStr ? JSON.parse(permStr) : ['read'];
  } catch {
    permissions = ['read'];
  }

  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    keyPrefix: row.key_prefix as string,
    permissions,
    createdAt: new Date(row.created_at as string),
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string) : null,
  };
}

/**
 * Generates a secure API key
 * Returns both the raw key (to show once) and its hash (to store)
 */
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const rawKey = randomBytes(KEY_LENGTH).toString('hex');
  const fullKey = `${KEY_PREFIX}${rawKey}`;
  
  const hash = createHmac('sha256', KEY_SECRET)
    .update(fullKey)
    .digest('hex');
  
  const prefix = fullKey.substring(0, 12);
  
  return { key: fullKey, hash, prefix };
}

/**
 * Hashes an API key for comparison
 */
function hashApiKey(key: string): string {
  return createHmac('sha256', KEY_SECRET)
    .update(key)
    .digest('hex');
}

/**
 * Creates a new MCP API key for a user
 */
export async function createMCPApiKey(data: {
  userId: string;
  name: string;
  permissions?: string[];
  expiresInDays?: number;
}): Promise<{ apiKey: MCPApiKey; rawKey: string }> {
  const client = getDbClient();
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const { key, hash, prefix } = generateApiKey();
  
  const expiresAt = data.expiresInDays
    ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  
  const permissions = data.permissions || ['read'];
  
  await client.execute(
    `INSERT INTO mcp_api_keys (id, user_id, name, key_hash, key_prefix, permissions, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.userId,
      data.name,
      hash,
      prefix,
      JSON.stringify(permissions),
      now,
      expiresAt,
    ]
  );
  
  const apiKey: MCPApiKey = {
    id,
    userId: data.userId,
    name: data.name,
    keyPrefix: prefix,
    permissions,
    createdAt: new Date(now),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    lastUsedAt: null,
  };
  
  return { apiKey, rawKey: key };
}

/**
 * Validates an API key and returns the associated user info
 */
export async function validateMCPApiKey(key: string): Promise<{
  valid: boolean;
  userId?: string;
  permissions?: string[];
  error?: string;
}> {
  if (!key || !key.startsWith(KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format' };
  }
  
  const client = getDbClient();
  const keyHash = hashApiKey(key);
  
  const row = await client.queryOne<DbRow>(
    `SELECT * FROM mcp_api_keys 
     WHERE key_hash = ? 
     AND (expires_at IS NULL OR expires_at > ?)`,
    [keyHash, new Date().toISOString()]
  );
  
  if (!row) {
    return { valid: false, error: 'Invalid or expired API key' };
  }
  
  // Update last used timestamp
  await client.execute(
    'UPDATE mcp_api_keys SET last_used_at = ? WHERE id = ?',
    [new Date().toISOString(), row.id]
  );
  
  let permissions: string[] = ['read'];
  try {
    const permStr = row.permissions as string;
    permissions = permStr ? JSON.parse(permStr) : ['read'];
  } catch {
    permissions = ['read'];
  }
  
  return {
    valid: true,
    userId: row.user_id as string,
    permissions,
  };
}

/**
 * Gets all API keys for a user (without the actual key)
 */
export async function getUserMCPApiKeys(userId: string): Promise<MCPApiKey[]> {
  const client = getDbClient();
  const rows = await client.query<DbRow>(
    'SELECT * FROM mcp_api_keys WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(rowToMCPApiKey);
}

/**
 * Gets a specific API key by ID
 */
export async function getMCPApiKeyById(id: string, userId: string): Promise<MCPApiKey | null> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(
    'SELECT * FROM mcp_api_keys WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return row ? rowToMCPApiKey(row) : null;
}

/**
 * Revokes (deletes) an API key
 */
export async function revokeMCPApiKey(id: string, userId: string): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute(
    'DELETE FROM mcp_api_keys WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.changes > 0;
}

/**
 * Updates an API key's permissions
 */
export async function updateMCPApiKeyPermissions(
  id: string,
  userId: string,
  permissions: string[]
): Promise<boolean> {
  const client = getDbClient();
  const result = await client.execute(
    'UPDATE mcp_api_keys SET permissions = ? WHERE id = ? AND user_id = ?',
    [JSON.stringify(permissions), id, userId]
  );
  return result.changes > 0;
}

/**
 * Checks if a user has any API keys
 */
export async function userHasMCPApiKeys(userId: string): Promise<boolean> {
  const client = getDbClient();
  const row = await client.queryOne<DbRow>(
    'SELECT COUNT(*) as count FROM mcp_api_keys WHERE user_id = ?',
    [userId]
  );
  return row ? (row.count as number) > 0 : false;
}

/**
 * Deletes expired API keys (maintenance task)
 */
export async function deleteExpiredMCPApiKeys(): Promise<number> {
  const client = getDbClient();
  const result = await client.execute(
    'DELETE FROM mcp_api_keys WHERE expires_at IS NOT NULL AND expires_at < ?',
    [new Date().toISOString()]
  );
  return result.changes;
}
