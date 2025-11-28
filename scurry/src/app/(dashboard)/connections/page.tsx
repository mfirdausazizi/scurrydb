'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, Plus, Loader2, Users, Settings, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectionForm, ConnectionCard, DeleteConnectionDialog } from '@/components/connections';
import { useWorkspaceContext } from '@/hooks';
import type { ConnectionFormData } from '@/lib/validations/connection';
import type { DatabaseConnection } from '@/types';

type SafeConnection = Omit<DatabaseConnection, 'password'> & {
  permission?: string;
  isShared?: boolean;
};

export default function ConnectionsPage() {
  const router = useRouter();
  const { teamId, isTeamWorkspace } = useWorkspaceContext();
  const [connections, setConnections] = React.useState<SafeConnection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingConnection, setEditingConnection] = React.useState<SafeConnection | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [connectionToDelete, setConnectionToDelete] = React.useState<SafeConnection | null>(null);

  const fetchConnections = React.useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      if (teamId) {
        // Fetch team shared connections
        response = await fetch(`/api/teams/${teamId}/connections`);
        if (response.ok) {
          const data = await response.json();
          // Transform shared connections to include connection details
          const transformedConnections = data.map((sc: { connection?: SafeConnection; permission?: string }) => ({
            ...sc.connection,
            permission: sc.permission,
            isShared: true,
          })).filter((c: SafeConnection | undefined) => c);
          setConnections(transformedConnections);
        }
      } else {
        // Fetch personal connections
        response = await fetch('/api/connections');
        if (response.ok) {
          const data = await response.json();
          setConnections(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  React.useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleCreate = async (data: ConnectionFormData) => {
    const response = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create connection');
    }

    toast.success('Connection created successfully');
    fetchConnections();
  };

  const handleUpdate = async (data: ConnectionFormData) => {
    if (!editingConnection) return;

    const response = await fetch(`/api/connections/${editingConnection.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update connection');
    }

    toast.success('Connection updated successfully');
    setEditingConnection(null);
    fetchConnections();
  };

  const handleDelete = async () => {
    if (!connectionToDelete) return;

    const response = await fetch(`/api/connections/${connectionToDelete.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete connection');
    }

    toast.success('Connection deleted successfully');
    setConnectionToDelete(null);
    fetchConnections();
  };

  const handleConnect = (connection: SafeConnection) => {
    const params = new URLSearchParams({ connection: connection.id });
    if (teamId) params.set('teamId', teamId);
    router.push(`/browse?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Team workspace view - show shared connections (read-only management)
  if (isTeamWorkspace) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7" />
              Team Connections
            </h1>
            <p className="text-muted-foreground">
              Shared database connections for this team.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/teams/${teamId}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Manage in Team Settings
            </Link>
          </Button>
        </div>

        {connections.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>No shared connections</CardTitle>
              <CardDescription>
                Team admins can share connections in team settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link href={`/teams/${teamId}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Go to Team Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onConnect={() => handleConnect(connection)}
                isShared={true}
                permission={connection.permission}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Personal workspace view - full connection management
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
          <p className="text-muted-foreground">
            Manage your database connections.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {connections.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>No connections yet</CardTitle>
            <CardDescription>
              Get started by adding your first database connection.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              onEdit={() => {
                setEditingConnection(connection);
                setFormOpen(true);
              }}
              onDelete={() => {
                setConnectionToDelete(connection);
                setDeleteDialogOpen(true);
              }}
              onConnect={() => handleConnect(connection)}
            />
          ))}
        </div>
      )}

      <ConnectionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingConnection(null);
        }}
        connection={editingConnection || undefined}
        onSubmit={editingConnection ? handleUpdate : handleCreate}
      />

      <DeleteConnectionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        connectionName={connectionToDelete?.name || ''}
        onConfirm={handleDelete}
      />
    </div>
  );
}
