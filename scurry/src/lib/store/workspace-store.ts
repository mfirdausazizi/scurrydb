import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Team {
  id: string;
  name: string;
  slug: string;
  role: string;
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
    (set) => ({
      activeTeamId: null,
      activeTeam: null,

      setActiveTeam: (team) =>
        set({
          activeTeam: team,
          activeTeamId: team?.id ?? null,
        }),

      setActiveTeamId: (teamId) =>
        set({
          activeTeamId: teamId,
          // activeTeam will be updated by the component that fetches team data
        }),

      clearWorkspace: () =>
        set({
          activeTeamId: null,
          activeTeam: null,
        }),
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

