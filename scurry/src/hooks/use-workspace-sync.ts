'use client';

import * as React from 'react';
import { useWorkspaceStore, subscribeToWorkspaceChange } from '@/lib/store/workspace-store';
import { useConnectionStore } from '@/lib/store/connection-store';
import { useQueryStore } from '@/lib/store/query-store';

/**
 * Hook to sync state when workspace changes.
 * This should be used in the layout or a top-level component to ensure
 * connection-related state is properly reset when switching workspaces.
 */
export function useWorkspaceSync() {
  const { activeTeamId } = useWorkspaceStore();
  const resetConnectionState = useConnectionStore((state) => state.resetForWorkspaceChange);
  const resetQueryState = useQueryStore((state) => state.resetForWorkspaceChange);

  React.useEffect(() => {
    const unsubscribe = subscribeToWorkspaceChange((newTeamId, oldTeamId) => {
      // Reset connection and query state when workspace changes
      resetConnectionState();
      resetQueryState();
      
      console.log(`Workspace changed from ${oldTeamId || 'personal'} to ${newTeamId || 'personal'}`);
    });

    return unsubscribe;
  }, [resetConnectionState, resetQueryState]);

  return { activeTeamId };
}

/**
 * Hook to validate if a connection belongs to the current workspace.
 * Returns a function that checks if a given connection ID is valid for the current context.
 */
export function useConnectionValidator() {
  const { activeTeamId } = useWorkspaceStore();
  const { activeConnectionWorkspaceId } = useConnectionStore();

  const isConnectionValid = React.useCallback(
    (connectionWorkspaceId: string | null) => {
      // If both are null, it's a personal connection in personal context
      if (activeTeamId === null && connectionWorkspaceId === null) {
        return true;
      }
      // If both match, the connection belongs to the current workspace
      return activeTeamId === connectionWorkspaceId;
    },
    [activeTeamId]
  );

  const isCurrentConnectionValid = React.useMemo(() => {
    return isConnectionValid(activeConnectionWorkspaceId);
  }, [isConnectionValid, activeConnectionWorkspaceId]);

  return { isConnectionValid, isCurrentConnectionValid, activeTeamId };
}

/**
 * Hook to get the current workspace context for API calls.
 * Returns the teamId that should be passed to API endpoints.
 */
export function useWorkspaceContext() {
  const { activeTeamId, activeTeam } = useWorkspaceStore();

  return {
    teamId: activeTeamId,
    teamName: activeTeam?.name ?? null,
    isTeamWorkspace: activeTeamId !== null,
  };
}
