'use client';

import * as React from 'react';
import type { DatabaseConnection } from '@/types';

type SafeConnection = Omit<DatabaseConnection, 'password'> & {
  permission?: string;
  isShared?: boolean;
};

interface UseConnectionsOptions {
  teamId?: string | null;
}

interface UseConnectionsReturn {
  connections: SafeConnection[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useConnections(options: UseConnectionsOptions = {}): UseConnectionsReturn {
  const { teamId } = options;
  const [connections, setConnections] = React.useState<SafeConnection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchConnections = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (teamId) {
        // Fetch team shared connections
        response = await fetch(`/api/teams/${teamId}/connections`);
        if (!response.ok) {
          throw new Error('Failed to fetch team connections');
        }
        const data = await response.json();
        // Transform shared connections to include connection details
        const transformedConnections = data.map((sc: { connection?: SafeConnection; permission?: string }) => ({
          ...sc.connection,
          permission: sc.permission,
          isShared: true,
        })).filter((c: SafeConnection | undefined) => c);
        setConnections(transformedConnections);
      } else {
        // Fetch personal connections
        response = await fetch('/api/connections');
        if (!response.ok) {
          throw new Error('Failed to fetch connections');
        }
        const data = await response.json();
        setConnections(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  React.useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return { connections, loading, error, refetch: fetchConnections };
}
