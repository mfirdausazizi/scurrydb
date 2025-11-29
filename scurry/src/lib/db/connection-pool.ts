/**
 * Connection Pool Manager
 * 
 * Manages a collection of database connection pools with LRU eviction.
 * Provides a unified interface for all database types (MySQL, PostgreSQL, SQLite).
 * 
 * Key features:
 * - LRU eviction when max pools is reached
 * - Per-database-type pool configuration
 * - Health checking and automatic reconnection
 * - Graceful cleanup on connection deletion
 */

import { MySQLPoolWrapper, type MySQLQueryResult } from './pools/mysql-pool';
import { PostgresPoolWrapper, type PostgresQueryResult } from './pools/postgres-pool';
import { SQLitePoolWrapper, type SQLiteQueryResult } from './pools/sqlite-pool';
import { getTunnelManager } from './ssh-tunnel';
import type { DatabaseConnection, ColumnInfo } from '@/types';

// Union type for all pool wrappers
export type PoolWrapper = MySQLPoolWrapper | PostgresPoolWrapper | SQLitePoolWrapper;
export type PoolQueryResult = MySQLQueryResult | PostgresQueryResult | SQLiteQueryResult;

export interface PoolConfig {
  mysql?: {
    min?: number;
    max?: number;
    idleTimeoutMs?: number;
    acquireTimeoutMs?: number;
  };
  postgresql?: {
    min?: number;
    max?: number;
    idleTimeoutMs?: number;
    acquireTimeoutMs?: number;
  };
  sqlite?: {
    timeout?: number;
  };
}

export interface PoolStats {
  connectionId: string;
  type: string;
  active: number;
  idle: number;
  waiting: number;
  lastAccess: number;
}

// Default configuration
const DEFAULT_MAX_POOLS = parseInt(process.env.MAX_CONNECTION_POOLS || '50', 10);
const DEFAULT_POOL_CONFIG: PoolConfig = {
  mysql: {
    min: 2,
    max: parseInt(process.env.MYSQL_POOL_MAX || '10', 10),
    idleTimeoutMs: 30000,
    acquireTimeoutMs: 10000,
  },
  postgresql: {
    min: 2,
    max: parseInt(process.env.POSTGRES_POOL_MAX || '10', 10),
    idleTimeoutMs: 30000,
    acquireTimeoutMs: 10000,
  },
  sqlite: {
    timeout: 30000,
  },
};

class ConnectionPoolManager {
  private pools: Map<string, PoolWrapper> = new Map();
  private lastAccess: Map<string, number> = new Map();
  private connectionTypes: Map<string, string> = new Map();
  private readonly maxPools: number;
  private readonly poolConfig: PoolConfig;

  constructor(maxPools: number = DEFAULT_MAX_POOLS, config: PoolConfig = DEFAULT_POOL_CONFIG) {
    this.maxPools = maxPools;
    this.poolConfig = { ...DEFAULT_POOL_CONFIG, ...config };
  }

  /**
   * Get or create a pool for the given database connection
   */
  async getPool(connection: DatabaseConnection): Promise<PoolWrapper> {
    const key = connection.id;
    
    // Update last access time
    this.lastAccess.set(key, Date.now());

    // Return existing pool if available
    if (this.pools.has(key)) {
      return this.pools.get(key)!;
    }

    // Check if we need to evict old pools
    if (this.pools.size >= this.maxPools) {
      await this.evictLRU();
    }

    // Handle SSH tunneling if enabled
    let effectiveConnection = connection;
    if (connection.ssh?.enabled && connection.type !== 'sqlite') {
      const tunnelManager = getTunnelManager();
      const localPort = await tunnelManager.createTunnel(
        connection.id,
        connection.ssh,
        connection.host,
        connection.port
      );
      
      // Create a modified connection that points to the tunnel
      effectiveConnection = {
        ...connection,
        host: '127.0.0.1',
        port: localPort,
      };
    }

    // Create new pool based on database type
    const pool = this.createPool(effectiveConnection);
    this.pools.set(key, pool);
    this.connectionTypes.set(key, connection.type);

    return pool;
  }

  /**
   * Create a pool based on database type
   */
  private createPool(connection: DatabaseConnection): PoolWrapper {
    switch (connection.type) {
      case 'mysql':
      case 'mariadb':
        return new MySQLPoolWrapper(connection, this.poolConfig.mysql);
      case 'postgresql':
        return new PostgresPoolWrapper(connection, this.poolConfig.postgresql);
      case 'sqlite':
        return new SQLitePoolWrapper(connection, this.poolConfig.sqlite);
      default:
        throw new Error(`Unsupported database type: ${connection.type}`);
    }
  }

  /**
   * Execute a query using the appropriate pool
   */
  async executeQuery(
    connection: DatabaseConnection,
    sql: string,
    params?: unknown[],
    options?: { timeout?: number; limit?: number }
  ): Promise<PoolQueryResult> {
    const pool = await this.getPool(connection);
    const timeout = options?.timeout;

    let result: PoolQueryResult;
    
    if (timeout && timeout > 0) {
      result = await pool.queryWithTimeout(sql, params, timeout);
    } else {
      result = await pool.query(sql, params);
    }

    // Apply limit if specified
    if (options?.limit && result.rows.length > options.limit) {
      result.rows = result.rows.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Evict the least recently used pool
   */
  private async evictLRU(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.lastAccess) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.destroyPool(oldestKey);
    }
  }

  /**
   * Destroy a specific pool
   */
  async destroyPool(connectionId: string): Promise<void> {
    const pool = this.pools.get(connectionId);
    if (pool) {
      try {
        await pool.destroy();
      } catch (error) {
        console.error(`Error destroying pool for connection ${connectionId}:`, error);
      }
      this.pools.delete(connectionId);
      this.lastAccess.delete(connectionId);
      this.connectionTypes.delete(connectionId);
      
      // Also destroy any SSH tunnel for this connection
      try {
        const tunnelManager = getTunnelManager();
        if (tunnelManager.hasTunnel(connectionId)) {
          await tunnelManager.destroyTunnel(connectionId);
        }
      } catch (error) {
        console.error(`Error destroying SSH tunnel for connection ${connectionId}:`, error);
      }
    }
  }

  /**
   * Check if a pool exists for a connection
   */
  hasPool(connectionId: string): boolean {
    return this.pools.has(connectionId);
  }

  /**
   * Get statistics for all pools
   */
  getPoolStats(): PoolStats[] {
    const stats: PoolStats[] = [];
    
    for (const [connectionId, pool] of this.pools) {
      const poolStats = pool.getStats();
      stats.push({
        connectionId,
        type: this.connectionTypes.get(connectionId) || 'unknown',
        ...poolStats,
        lastAccess: this.lastAccess.get(connectionId) || 0,
      });
    }

    return stats;
  }

  /**
   * Get statistics summary
   */
  getStatsSummary(): {
    totalPools: number;
    maxPools: number;
    totalActiveConnections: number;
    totalIdleConnections: number;
  } {
    const stats = this.getPoolStats();
    return {
      totalPools: stats.length,
      maxPools: this.maxPools,
      totalActiveConnections: stats.reduce((sum, s) => sum + s.active, 0),
      totalIdleConnections: stats.reduce((sum, s) => sum + s.idle, 0),
    };
  }

  /**
   * Health check a specific pool
   */
  async healthCheck(connectionId: string): Promise<boolean> {
    const pool = this.pools.get(connectionId);
    if (!pool) {
      return false;
    }
    return pool.healthCheck();
  }

  /**
   * Destroy all pools (for graceful shutdown)
   */
  async destroyAll(): Promise<void> {
    const connectionIds = Array.from(this.pools.keys());
    await Promise.all(connectionIds.map((id) => this.destroyPool(id)));
  }

  /**
   * Clean up idle pools that haven't been accessed in the specified time
   */
  async cleanupIdlePools(maxIdleTimeMs: number = 300000): Promise<number> {
    const now = Date.now();
    const toEvict: string[] = [];

    for (const [key, lastAccessTime] of this.lastAccess) {
      if (now - lastAccessTime > maxIdleTimeMs) {
        toEvict.push(key);
      }
    }

    await Promise.all(toEvict.map((id) => this.destroyPool(id)));
    return toEvict.length;
  }
}

// Singleton instance for global use
let poolManagerInstance: ConnectionPoolManager | null = null;

/**
 * Get the global pool manager instance
 */
export function getPoolManager(): ConnectionPoolManager {
  if (!poolManagerInstance) {
    poolManagerInstance = new ConnectionPoolManager();
  }
  return poolManagerInstance;
}

/**
 * Reset the pool manager (useful for testing)
 */
export async function resetPoolManager(): Promise<void> {
  if (poolManagerInstance) {
    await poolManagerInstance.destroyAll();
    poolManagerInstance = null;
  }
}

export { ConnectionPoolManager };
