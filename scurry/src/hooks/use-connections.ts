'use client';

import * as React from 'react';
import type { DatabaseConnection } from '@/types';

type SafeConnection = Omit<DatabaseConnection, 'password'>;

interface UseConnectionsReturn {
  connections: SafeConnection[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useConnections(): UseConnectionsReturn {
  const [connections, setConnections] = React.useState<SafeConnection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchConnections = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/connections');
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }
      const data = await response.json();
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return { connections, loading, error, refetch: fetchConnections };
}
