import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DatabaseConnection } from '@/types';

interface ConnectionState {
  connections: DatabaseConnection[];
  activeConnectionId: string | null;
  sidebarOpen: boolean;
  
  addConnection: (connection: DatabaseConnection) => void;
  updateConnection: (id: string, updates: Partial<DatabaseConnection>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  getActiveConnection: () => DatabaseConnection | null;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      connections: [],
      activeConnectionId: null,
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
        })),

      setActiveConnection: (id) =>
        set({ activeConnectionId: id }),

      setSidebarOpen: (open) =>
        set({ sidebarOpen: open }),

      getActiveConnection: () => {
        const state = get();
        return (
          state.connections.find((conn) => conn.id === state.activeConnectionId) ||
          null
        );
      },
    }),
    {
      name: 'scurrydb-connections',
      partialize: (state) => ({
        connections: state.connections,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
