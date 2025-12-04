'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { GuestConnectionForm } from '@/components/connections/guest-connection-form';
import { GuestConnectionCardGrid } from '@/components/connections/guest-connection-card-grid';
import { useGuestConnectionsStore, type GuestConnection } from '@/lib/store/guest-connections-store';
import { encryptForStorage } from '@/lib/utils/client-encryption';
import type { ConnectionFormData } from '@/lib/validations/connection';

export default function GuestConnectionsPage() {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingConnection, setEditingConnection] = React.useState<GuestConnection | undefined>();
  
  const connections = useGuestConnectionsStore((state) => state.connections);
  const addConnection = useGuestConnectionsStore((state) => state.addConnection);
  const updateConnection = useGuestConnectionsStore((state) => state.updateConnection);
  const removeConnection = useGuestConnectionsStore((state) => state.removeConnection);

  const handleCreate = async (data: ConnectionFormData) => {
    try {
      // Encrypt the password before storing
      const encryptedPassword = await encryptForStorage(data.password);
      
      // Encrypt SSH credentials if present
      let encryptedSsh: GuestConnection['ssh'] | undefined;
      if (data.ssh?.enabled) {
        encryptedSsh = {
          enabled: true,
          host: data.ssh.host || '',
          port: data.ssh.port || 22,
          username: data.ssh.username || '',
          authMethod: data.ssh.authMethod || 'password',
          encryptedPassword: data.ssh.password ? await encryptForStorage(data.ssh.password) : undefined,
          encryptedPrivateKey: data.ssh.privateKey ? await encryptForStorage(data.ssh.privateKey) : undefined,
          encryptedPassphrase: data.ssh.passphrase ? await encryptForStorage(data.ssh.passphrase) : undefined,
        };
      }

      const newConnection: GuestConnection = {
        id: uuidv4(),
        name: data.name,
        type: data.type,
        host: data.host,
        port: data.port,
        database: data.database,
        username: data.username,
        encryptedPassword,
        ssl: data.ssl,
        color: data.color,
        ssh: encryptedSsh,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addConnection(newConnection);
      toast.success('Connection saved locally');
      setFormOpen(false);
    } catch (error) {
      console.error('Failed to create connection:', error);
      toast.error('Failed to save connection');
    }
  };

  const handleUpdate = async (data: ConnectionFormData) => {
    if (!editingConnection) return;

    try {
      // Encrypt the password before storing
      const encryptedPassword = await encryptForStorage(data.password);
      
      // Encrypt SSH credentials if present
      let encryptedSsh: GuestConnection['ssh'] | undefined;
      if (data.ssh?.enabled) {
        encryptedSsh = {
          enabled: true,
          host: data.ssh.host || '',
          port: data.ssh.port || 22,
          username: data.ssh.username || '',
          authMethod: data.ssh.authMethod || 'password',
          encryptedPassword: data.ssh.password ? await encryptForStorage(data.ssh.password) : undefined,
          encryptedPrivateKey: data.ssh.privateKey ? await encryptForStorage(data.ssh.privateKey) : undefined,
          encryptedPassphrase: data.ssh.passphrase ? await encryptForStorage(data.ssh.passphrase) : undefined,
        };
      }

      updateConnection(editingConnection.id, {
        name: data.name,
        type: data.type,
        host: data.host,
        port: data.port,
        database: data.database,
        username: data.username,
        encryptedPassword,
        ssl: data.ssl,
        color: data.color,
        ssh: encryptedSsh,
      });

      toast.success('Connection updated');
      setEditingConnection(undefined);
      setFormOpen(false);
    } catch (error) {
      console.error('Failed to update connection:', error);
      toast.error('Failed to update connection');
    }
  };

  const handleEdit = (connection: GuestConnection) => {
    setEditingConnection(connection);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    removeConnection(id);
    toast.success('Connection deleted');
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingConnection(undefined);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/guest/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Connections</h1>
            <p className="text-muted-foreground">
              Manage your database connections (stored locally)
            </p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </Button>
      </div>

      {/* Connections Grid */}
      {connections.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <h3 className="text-lg font-medium mb-2">No connections yet</h3>
          <p className="text-muted-foreground mb-4">
            Add a database connection to get started
          </p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Connection
          </Button>
        </div>
      ) : (
        <GuestConnectionCardGrid
          connections={connections}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Connection Form Dialog */}
      <GuestConnectionForm
        open={formOpen}
        onOpenChange={handleFormClose}
        connection={editingConnection}
        onSubmit={editingConnection ? handleUpdate : handleCreate}
      />
    </div>
  );
}
