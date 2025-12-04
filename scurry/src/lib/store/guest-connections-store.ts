import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DatabaseConnection, DatabaseType } from '@/types';

/**
 * Guest connection stored in localStorage
 * Password is stored encrypted (see client-encryption.ts)
 */
export interface GuestConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  encryptedPassword: string; // Encrypted password
  ssl?: boolean;
  color?: string;
  timeout?: number;
  ssh?: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    authMethod: 'password' | 'privateKey';
    encryptedPassword?: string;
    encryptedPrivateKey?: string;
    encryptedPassphrase?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface GuestConnectionsState {
  connections: GuestConnection[];
  activeConnectionId: string | null;
  
  // Actions
  addConnection: (connection: GuestConnection) => void;
  updateConnection: (id: string, updates: Partial<GuestConnection>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  getConnection: (id: string) => GuestConnection | undefined;
  getActiveConnection: () => GuestConnection | null;
  clearAllConnections: () => void;
}

export const useGuestConnectionsStore = create<GuestConnectionsState>()(
  persist(
    (set, get) => ({
      connections: [],
      activeConnectionId: null,

      addConnection: (connection) =>
        set((state) => ({
          connections: [...state.connections, connection],
        })),

      updateConnection: (id, updates) =>
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id
              ? { ...conn, ...updates, updatedAt: new Date().toISOString() }
              : conn
          ),
        })),

      removeConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((conn) => conn.id !== id),
          activeConnectionId:
            state.activeConnectionId === id ? null : state.activeConnectionId,
        })),

      setActiveConnection: (id) =>
        set({ activeConnectionId: id }),

      getConnection: (id) => {
        return get().connections.find((conn) => conn.id === id);
      },

      getActiveConnection: () => {
        const state = get();
        return state.connections.find((conn) => conn.id === state.activeConnectionId) || null;
      },

      clearAllConnections: () =>
        set({
          connections: [],
          activeConnectionId: null,
        }),
    }),
    {
      name: 'scurrydb-guest-connections',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * Convert a GuestConnection to DatabaseConnection format for API calls
 * This requires the decrypted password to be passed in
 */
export function guestConnectionToApiFormat(
  conn: GuestConnection,
  decryptedPassword: string,
  decryptedSshPassword?: string,
  decryptedSshPrivateKey?: string,
  decryptedSshPassphrase?: string
): DatabaseConnection {
  return {
    id: conn.id,
    name: conn.name,
    type: conn.type,
    host: conn.host,
    port: conn.port,
    database: conn.database,
    username: conn.username,
    password: decryptedPassword,
    ssl: conn.ssl,
    color: conn.color,
    timeout: conn.timeout,
    ssh: conn.ssh?.enabled
      ? {
          enabled: true,
          host: conn.ssh.host,
          port: conn.ssh.port,
          username: conn.ssh.username,
          authMethod: conn.ssh.authMethod,
          password: decryptedSshPassword,
          privateKey: decryptedSshPrivateKey,
          passphrase: decryptedSshPassphrase,
        }
      : undefined,
    createdAt: new Date(conn.createdAt),
    updatedAt: new Date(conn.updatedAt),
  };
}

/**
 * Get connections list without passwords (for display)
 */
export function useSafeGuestConnections() {
  return useGuestConnectionsStore((state) =>
    state.connections.map(({ encryptedPassword: _, ...rest }) => rest)
  );
}
