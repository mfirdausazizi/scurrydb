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
  sharedBy?: string;
  userId?: string;
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
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  // Fetch current user ID
  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const user = await response.json();
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const fetchConnections = React.useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      if (teamId) {
        // Fetch team shared connections
        response = await fetch(`/api/teams/${teamId}/connections`);
        if (response.ok) {
          const data = await response.json();
          // Transform shared connections to include connection details and sharedBy
          const transformedConnections = data.map((sc: { 
            connection?: SafeConnection; 
            permission?: string;
            sharedBy?: string;
          }) => ({
            ...sc.connection,
            permission: sc.permission,
            isShared: true,
            sharedBy: sc.sharedBy,
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
    // Create the connection (owned by user)
    const response = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create connection');
    }

    const connection = await response.json();

    // If in team workspace, auto-share with team
    if (teamId) {
      try {
        const shareResponse = await fetch(`/api/teams/${teamId}/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            connectionId: connection.id, 
            permission: 'read',
          }),
        });
        
        if (shareResponse.ok) {
          toast.success('Connection created and shared with team');
        } else {
          toast.success('Connection created (sharing failed - you can share it manually in team settings)');
        }
      } catch {
        toast.success('Connection created (sharing failed - you can share it manually in team settings)');
      }
    } else {
      toast.success('Connection created successfully');
    }
    
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

  // Check if user owns a shared connection (they shared it)
  const isConnectionOwner = (connection: SafeConnection) => {
    return connection.sharedBy === currentUserId;
  };

  // Team workspace view - show shared connections with ability to create new ones
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
          <div className="flex items-center gap-2">
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
            <Button asChild variant="outline">
              <Link href={`/teams/${teamId}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Sharing
              </Link>
            </Button>
          </div>
        </div>

        {connections.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>No shared connections</CardTitle>
              <CardDescription>
                Create a new connection to share with your team, or share existing connections in team settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-2">
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Connection
              </Button>
              <Button asChild variant="outline">
                <Link href={`/teams/${teamId}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Share Existing
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => {
              const isOwner = isConnectionOwner(connection);
              return (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onConnect={() => handleConnect(connection)}
                  onEdit={isOwner ? () => {
                    setEditingConnection(connection);
                    setFormOpen(true);
                  } : undefined}
                  onDelete={isOwner ? () => {
                    setConnectionToDelete(connection);
                    setDeleteDialogOpen(true);
                  } : undefined}
                  isShared={true}
                  isOwner={isOwner}
                  permission={connection.permission}
                />
              );
            })}
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
