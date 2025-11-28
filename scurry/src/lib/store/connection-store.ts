import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DatabaseConnection } from '@/types';

interface ConnectionState {
  connections: DatabaseConnection[];
  activeConnectionId: string | null;
  activeConnectionWorkspaceId: string | null; // Track which workspace the active connection belongs to
  sidebarOpen: boolean;
  
  addConnection: (connection: DatabaseConnection) => void;
  updateConnection: (id: string, updates: Partial<DatabaseConnection>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null, workspaceId?: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  getActiveConnection: () => DatabaseConnection | null;
  clearActiveConnection: () => void;
  resetForWorkspaceChange: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      connections: [],
      activeConnectionId: null,
      activeConnectionWorkspaceId: null,
      sidebarOpen: true,

      addConnection: (connection) =>
        set((state) => ({
          connections: [...state.connections, connection],
        })),

      updateConnection: (id, updates) =>
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id ? { ...conn, ...updates, updatedAt: new Date() } : conn
          ),
        })),

      removeConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((conn) => conn.id !== id),
          activeConnectionId:
            state.activeConnectionId === id ? null : state.activeConnectionId,
          activeConnectionWorkspaceId:
            state.activeConnectionId === id ? null : state.activeConnectionWorkspaceId,
        })),

      setActiveConnection: (id, workspaceId = null) =>
        set({ 
          activeConnectionId: id,
          activeConnectionWorkspaceId: workspaceId,
        }),

      setSidebarOpen: (open) =>
        set({ sidebarOpen: open }),

      getActiveConnection: () => {
        const state = get();
        return (
          state.connections.find((conn) => conn.id === state.activeConnectionId) ||
          null
        );
      },

      clearActiveConnection: () =>
        set({
          activeConnectionId: null,
          activeConnectionWorkspaceId: null,
        }),

      resetForWorkspaceChange: () =>
        set({
          activeConnectionId: null,
          activeConnectionWorkspaceId: null,
        }),
    }),
    {
      name: 'scurrydb-connections',
      partialize: (state) => ({
        connections: state.connections,
        sidebarOpen: state.sidebarOpen,
        // Don't persist activeConnectionId - it should be reset on workspace change
      }),
    }
  )
);
