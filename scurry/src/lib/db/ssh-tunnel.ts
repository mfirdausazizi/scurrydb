/**
 * SSH Tunnel Manager
 * 
 * Manages SSH tunnels for database connections.
 * Creates local port forwards to remote database servers.
 * 
 * Features:
 * - Password and private key authentication
 * - Automatic port allocation
 * - Connection pooling integration
 * - Graceful cleanup
 */

import 'server-only';
import net from 'net';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SSH2Client = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SSH2ConnectConfig = any;

// Dynamic import to avoid Turbopack issues with native modules
async function getSSH2() {
  return import('ssh2');
}

export interface SSHConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'privateKey';
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

interface ActiveTunnel {
  client: SSH2Client;
  server: net.Server;
  localPort: number;
  targetHost: string;
  targetPort: number;
  connectionId: string;
}

class SSHTunnelManager {
  private tunnels: Map<string, ActiveTunnel> = new Map();
  private allocatedPorts: Set<number> = new Set();
  private portRangeStart = 49152;
  private portRangeEnd = 65535;

  /**
   * Create an SSH tunnel for a database connection
   * Returns the local port to connect to
   */
  async createTunnel(
    connectionId: string,
    sshConfig: SSHConfig,
    targetHost: string,
    targetPort: number
  ): Promise<number> {
    // Check if tunnel already exists
    const existingTunnel = this.tunnels.get(connectionId);
    if (existingTunnel) {
      // Verify tunnel is still alive
      if (this.isTunnelAlive(existingTunnel)) {
        return existingTunnel.localPort;
      }
      // Tunnel is dead, clean it up
      await this.destroyTunnel(connectionId);
    }

    // Allocate a local port
    const localPort = await this.allocatePort();

    // Create SSH connection config
    const connectConfig: SSH2ConnectConfig = {
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
      readyTimeout: 10000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3,
    };

    if (sshConfig.authMethod === 'password' && sshConfig.password) {
      connectConfig.password = sshConfig.password;
    } else if (sshConfig.authMethod === 'privateKey' && sshConfig.privateKey) {
      connectConfig.privateKey = sshConfig.privateKey;
      if (sshConfig.passphrase) {
        connectConfig.passphrase = sshConfig.passphrase;
      }
    }

    const ssh2 = await getSSH2();
    
    return new Promise((resolve, reject) => {
      const client = new ssh2.Client();
      let server: net.Server | null = null;

      const cleanup = () => {
        this.allocatedPorts.delete(localPort);
        if (server) {
          server.close();
        }
        client.end();
      };

      client.on('ready', () => {
        // Create local TCP server that forwards to remote via SSH
        server = net.createServer((socket) => {
          client.forwardOut(
            '127.0.0.1',
            localPort,
            targetHost,
            targetPort,
            (err, stream) => {
              if (err) {
                console.error(`SSH tunnel forward error for ${connectionId}:`, err);
                socket.end();
                return;
              }

              socket.pipe(stream);
              stream.pipe(socket);

              stream.on('close', () => {
                socket.end();
              });

              socket.on('close', () => {
                stream.end();
              });

              stream.on('error', (e: Error) => {
                console.error(`SSH stream error for ${connectionId}:`, e);
                socket.end();
              });

              socket.on('error', (e: Error) => {
                console.error(`Socket error for ${connectionId}:`, e);
                stream.end();
              });
            }
          );
        });

        server.listen(localPort, '127.0.0.1', () => {
          // Store the active tunnel
          this.tunnels.set(connectionId, {
            client,
            server: server!,
            localPort,
            targetHost,
            targetPort,
            connectionId,
          });

          resolve(localPort);
        });

        server.on('error', (err) => {
          console.error(`SSH tunnel server error for ${connectionId}:`, err);
          cleanup();
          reject(err);
        });
      });

      client.on('error', (err) => {
        console.error(`SSH client error for ${connectionId}:`, err);
        cleanup();
        reject(new Error(`SSH connection failed: ${err.message}`));
      });

      client.on('close', () => {
        console.log(`SSH connection closed for ${connectionId}`);
        // Don't reject here, just clean up
        if (this.tunnels.has(connectionId)) {
          this.tunnels.delete(connectionId);
        }
        this.allocatedPorts.delete(localPort);
      });

      client.on('end', () => {
        console.log(`SSH connection ended for ${connectionId}`);
      });

      // Connect with timeout
      const connectionTimeout = setTimeout(() => {
        cleanup();
        reject(new Error('SSH connection timeout'));
      }, 15000);

      client.once('ready', () => {
        clearTimeout(connectionTimeout);
      });

      client.connect(connectConfig);
    });
  }

  /**
   * Destroy an SSH tunnel
   */
  async destroyTunnel(connectionId: string): Promise<void> {
    const tunnel = this.tunnels.get(connectionId);
    if (!tunnel) {
      return;
    }

    try {
      tunnel.server.close();
      tunnel.client.end();
      this.allocatedPorts.delete(tunnel.localPort);
    } catch (error) {
      console.error(`Error destroying tunnel for ${connectionId}:`, error);
    } finally {
      this.tunnels.delete(connectionId);
    }
  }

  /**
   * Get the local port for a tunnel
   */
  getTunnelPort(connectionId: string): number | null {
    const tunnel = this.tunnels.get(connectionId);
    return tunnel?.localPort || null;
  }

  /**
   * Check if a tunnel exists
   */
  hasTunnel(connectionId: string): boolean {
    return this.tunnels.has(connectionId);
  }

  /**
   * Destroy all tunnels (for graceful shutdown)
   */
  async destroyAll(): Promise<void> {
    const connectionIds = Array.from(this.tunnels.keys());
    await Promise.all(connectionIds.map((id) => this.destroyTunnel(id)));
  }

  /**
   * Get tunnel statistics
   */
  getStats(): {
    totalTunnels: number;
    tunnels: Array<{
      connectionId: string;
      localPort: number;
      targetHost: string;
      targetPort: number;
    }>;
  } {
    const tunnels = Array.from(this.tunnels.values()).map((t) => ({
      connectionId: t.connectionId,
      localPort: t.localPort,
      targetHost: t.targetHost,
      targetPort: t.targetPort,
    }));

    return {
      totalTunnels: tunnels.length,
      tunnels,
    };
  }

  /**
   * Allocate an available local port
   */
  private async allocatePort(): Promise<number> {
    // Try to find an available port in the dynamic/private port range
    for (let port = this.portRangeStart; port <= this.portRangeEnd; port++) {
      if (this.allocatedPorts.has(port)) {
        continue;
      }

      if (await this.isPortAvailable(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }

    throw new Error('No available ports for SSH tunnel');
  }

  /**
   * Check if a port is available
   */
  private isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', () => {
        resolve(false);
      });

      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Check if a tunnel is still alive
   */
  private isTunnelAlive(tunnel: ActiveTunnel): boolean {
    // Check if the SSH client is still connected
    // The client's writable property indicates if it's still open
    try {
      return tunnel.server.listening;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let tunnelManagerInstance: SSHTunnelManager | null = null;

/**
 * Get the global tunnel manager instance
 */
export function getTunnelManager(): SSHTunnelManager {
  if (!tunnelManagerInstance) {
    tunnelManagerInstance = new SSHTunnelManager();
  }
  return tunnelManagerInstance;
}

/**
 * Reset the tunnel manager (useful for testing)
 */
export async function resetTunnelManager(): Promise<void> {
  if (tunnelManagerInstance) {
    await tunnelManagerInstance.destroyAll();
    tunnelManagerInstance = null;
  }
}

export { SSHTunnelManager };
