import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PendingChanges } from '@/types';

export interface TablePendingChanges {
  connectionId: string;
  tableName: string;
  primaryKeyColumns: string[];
  changes: PendingChanges;
}

interface PendingChangesState {
  pendingChanges: Record<string, TablePendingChanges>;
  
  setChangesForTable: (
    connectionId: string,
    tableName: string,
    primaryKeyColumns: string[],
    changes: PendingChanges
  ) => void;
  clearChangesForTable: (connectionId: string, tableName: string) => void;
  clearAllChanges: () => void;
}

const getKey = (connectionId: string, tableName: string) => `${connectionId}:${tableName}`;

export const usePendingChangesStore = create<PendingChangesState>()(
  persist(
    (set) => ({
      pendingChanges: {},

      setChangesForTable: (
        connectionId: string,
        tableName: string,
        primaryKeyColumns: string[],
        changes: PendingChanges
      ) => {
        const key = getKey(connectionId, tableName);
        const hasChanges = changes.updates.length > 0 || changes.inserts.length > 0 || changes.deletes.length > 0;

        set((state) => {
          if (!hasChanges) {
            const newPendingChanges = { ...state.pendingChanges };
            delete newPendingChanges[key];
            return { pendingChanges: newPendingChanges };
          }

          return {
            pendingChanges: {
              ...state.pendingChanges,
              [key]: {
                connectionId,
                tableName,
                primaryKeyColumns,
                changes,
              },
            },
          };
        });
      },

      clearChangesForTable: (connectionId: string, tableName: string) => {
        const key = getKey(connectionId, tableName);
        set((state) => {
          const newPendingChanges = { ...state.pendingChanges };
          delete newPendingChanges[key];
          return { pendingChanges: newPendingChanges };
        });
      },

      clearAllChanges: () => {
        set({ pendingChanges: {} });
      },
    }),
    {
      name: 'scurry-pending-changes',
      partialize: (state) => ({ pendingChanges: state.pendingChanges }),
    }
  )
);

// Helper functions to use outside of components (stable references)
export const getStoreKey = getKey;

// Default empty changes object (stable reference)
export const emptyChanges: PendingChanges = {
  updates: [],
  inserts: [],
  deletes: [],
};
