import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Team {
  id: string;
  name: string;
  slug: string;
  role: string;
}

// Workspace change listeners for cross-store communication
type WorkspaceChangeListener = (newTeamId: string | null, oldTeamId: string | null) => void;
const workspaceChangeListeners: Set<WorkspaceChangeListener> = new Set();

export function subscribeToWorkspaceChange(listener: WorkspaceChangeListener): () => void {
  workspaceChangeListeners.add(listener);
  return () => {
    workspaceChangeListeners.delete(listener);
  };
}

function notifyWorkspaceChange(newTeamId: string | null, oldTeamId: string | null) {
  workspaceChangeListeners.forEach(listener => listener(newTeamId, oldTeamId));
}

interface WorkspaceState {
  activeTeamId: string | null;
  activeTeam: Team | null;
  setActiveTeam: (team: Team | null) => void;
  setActiveTeamId: (teamId: string | null) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeTeamId: null,
      activeTeam: null,

      setActiveTeam: (team) => {
        const oldTeamId = get().activeTeamId;
        const newTeamId = team?.id ?? null;
        
        set({
          activeTeam: team,
          activeTeamId: newTeamId,
        });
        
        // Notify listeners if workspace actually changed
        if (oldTeamId !== newTeamId) {
          notifyWorkspaceChange(newTeamId, oldTeamId);
        }
      },

      setActiveTeamId: (teamId) => {
        const oldTeamId = get().activeTeamId;
        
        set({
          activeTeamId: teamId,
          // activeTeam will be updated by the component that fetches team data
        });
        
        // Notify listeners if workspace actually changed
        if (oldTeamId !== teamId) {
          notifyWorkspaceChange(teamId, oldTeamId);
        }
      },

      clearWorkspace: () => {
        const oldTeamId = get().activeTeamId;
        
        set({
          activeTeamId: null,
          activeTeam: null,
        });
        
        // Notify listeners if workspace actually changed
        if (oldTeamId !== null) {
          notifyWorkspaceChange(null, oldTeamId);
        }
      },
    }),
    {
      name: 'scurrydb-workspace',
      partialize: (state) => ({
        activeTeamId: state.activeTeamId,
        activeTeam: state.activeTeam,
      }),
    }
  )
);

