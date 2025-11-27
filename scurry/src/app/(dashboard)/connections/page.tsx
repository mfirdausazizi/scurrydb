'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Database, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectionForm, ConnectionCard, DeleteConnectionDialog } from '@/components/connections';
import type { ConnectionFormData } from '@/lib/validations/connection';
import type { DatabaseConnection } from '@/types';

type SafeConnection = Omit<DatabaseConnection, 'password'>;

export default function ConnectionsPage() {
  const router = useRouter();
  const [connections, setConnections] = React.useState<SafeConnection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingConnection, setEditingConnection] = React.useState<SafeConnection | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [connectionToDelete, setConnectionToDelete] = React.useState<SafeConnection | null>(null);

  const fetchConnections = React.useCallback(async () => {
    try {
      const response = await fetch('/api/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, []);

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
    router.push(`/browse?connection=${connection.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
