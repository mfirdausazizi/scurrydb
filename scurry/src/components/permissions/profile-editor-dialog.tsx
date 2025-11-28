'use client';

import * as React from 'react';
import { Loader2, Plus, Trash2, Database, Eye, Edit2, Table, Columns } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SharedConnection {
  id: string;
  connectionId: string;
  permission: string;
  connection?: {
    id: string;
    name: string;
    type: string;
    host: string;
  };
}

interface ConnectionPermission {
  id: string;
  profileId: string;
  connectionId: string;
  canView: boolean;
  canEdit: boolean;
  allowedTables: string[] | null;
  columnRestrictions?: Array<{
    tableName: string;
    hiddenColumns: string[];
  }>;
}

interface Profile {
  id: string;
  name: string;
  description: string | null;
  connections?: ConnectionPermission[];
}

interface ProfileEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  profile: Profile | null;
  onSaved?: () => void;
}

export function ProfileEditorDialog({
  open,
  onOpenChange,
  teamId,
  profile,
  onSaved,
}: ProfileEditorDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [sharedConnections, setSharedConnections] = React.useState<SharedConnection[]>([]);
  const [permissions, setPermissions] = React.useState<ConnectionPermission[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>('');

  React.useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, profile?.id, teamId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch shared connections for the team
      const connResponse = await fetch(`/api/teams/${teamId}/connections`);
      if (connResponse.ok) {
        const data = await connResponse.json();
        setSharedConnections(data);
      }

      // If editing, load profile details
      if (profile) {
        setName(profile.name);
        setDescription(profile.description || '');
        
        const profileResponse = await fetch(`/api/teams/${teamId}/permissions/${profile.id}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setPermissions(profileData.connections || []);
        }
      } else {
        setName('');
        setDescription('');
        setPermissions([]);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConnection = async () => {
    if (!selectedConnectionId || !profile) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/permissions/${profile.id}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          canView: true,
          canEdit: false,
        }),
      });

      if (response.ok) {
        const newPerm = await response.json();
        setPermissions([...permissions, newPerm]);
        setSelectedConnectionId('');
        toast.success('Connection added');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add connection');
      }
    } catch (error) {
      toast.error('Failed to add connection');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!profile) return;

    try {
      const response = await fetch(
        `/api/teams/${teamId}/permissions/${profile.id}/connections?connectionId=${connectionId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setPermissions(permissions.filter(p => p.connectionId !== connectionId));
        toast.success('Connection removed');
      } else {
        toast.error('Failed to remove connection');
      }
    } catch (error) {
      toast.error('Failed to remove connection');
    }
  };

  const handleUpdatePermission = async (connectionId: string, updates: Partial<ConnectionPermission>) => {
    if (!profile) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/permissions/${profile.id}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          ...updates,
        }),
      });

      if (response.ok) {
        setPermissions(permissions.map(p => 
          p.connectionId === connectionId ? { ...p, ...updates } : p
        ));
      } else {
        toast.error('Failed to update permission');
      }
    } catch (error) {
      toast.error('Failed to update permission');
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/permissions/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (response.ok) {
        toast.success('Profile saved');
        onSaved?.();
        onOpenChange(false);
      } else {
        toast.error('Failed to save profile');
      }
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const availableConnections = sharedConnections.filter(
    sc => !permissions.some(p => p.connectionId === sc.connectionId)
  );

  const getConnectionName = (connectionId: string) => {
    const conn = sharedConnections.find(sc => sc.connectionId === connectionId);
    return conn?.connection?.name || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {profile ? `Edit Profile: ${profile.name}` : 'Create Profile'}
          </DialogTitle>
          <DialogDescription>
            Configure which connections this profile can access and set permissions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Details */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Profile Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sales Team Access"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this profile allows"
                />
              </div>
            </div>

            {/* Connection Permissions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Connection Permissions</Label>
              </div>

              {/* Add Connection */}
              {availableConnections.length > 0 && (
                <div className="flex gap-2">
                  <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a connection to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableConnections.map((sc) => (
                        <SelectItem key={sc.connectionId} value={sc.connectionId}>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            {sc.connection?.name || 'Unknown'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddConnection} disabled={!selectedConnectionId || saving}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              )}

              {/* Permissions List */}
              {permissions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No connections added</p>
                  <p className="text-sm">Add connections to configure access permissions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {permissions.map((perm) => (
                    <Card key={perm.connectionId}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            {getConnectionName(perm.connectionId)}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleRemoveConnection(perm.connectionId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4 pt-0">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`view-${perm.connectionId}`}
                              checked={perm.canView}
                              onCheckedChange={(checked: boolean) =>
                                handleUpdatePermission(perm.connectionId, { canView: checked })
                              }
                            />
                            <Label htmlFor={`view-${perm.connectionId}`} className="flex items-center gap-1 text-sm">
                              <Eye className="h-3 w-3" />
                              View
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`edit-${perm.connectionId}`}
                              checked={perm.canEdit}
                              onCheckedChange={(checked: boolean) =>
                                handleUpdatePermission(perm.connectionId, { canEdit: checked })
                              }
                            />
                            <Label htmlFor={`edit-${perm.connectionId}`} className="flex items-center gap-1 text-sm">
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </Label>
                          </div>
                        </div>
                        
                        {/* Table/Column restrictions info */}
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="gap-1">
                            <Table className="h-3 w-3" />
                            {perm.allowedTables ? `${perm.allowedTables.length} tables` : 'All tables'}
                          </Badge>
                          {perm.columnRestrictions && perm.columnRestrictions.length > 0 && (
                            <Badge variant="outline" className="gap-1">
                              <Columns className="h-3 w-3" />
                              {perm.columnRestrictions.length} column restrictions
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveProfile} disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

