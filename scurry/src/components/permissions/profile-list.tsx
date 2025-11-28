'use client';

import * as React from 'react';
import { Shield, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ProfileEditorDialog } from './profile-editor-dialog';

interface Profile {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

interface ProfileListProps {
  teamId: string;
  canManage: boolean;
}

export function ProfileList({ teamId, canManage }: ProfileListProps) {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState<Profile | null>(null);

  React.useEffect(() => {
    fetchProfiles();
  }, [teamId]);

  const fetchProfiles = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/permissions`);
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/permissions/${deleteId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Profile deleted');
        setProfiles(profiles.filter(p => p.id !== deleteId));
        setDeleteId(null);
      } else {
        toast.error('Failed to delete profile');
      }
    } catch (error) {
      toast.error('Failed to delete profile');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No permission profiles yet</p>
        <p className="text-sm mt-2">Create a profile to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{profile.name}</p>
                {profile.description && (
                  <p className="text-sm text-muted-foreground">{profile.description}</p>
                )}
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setEditingProfile(profile)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(profile.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permission Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the profile and any member assignments using it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProfileEditorDialog
        open={editingProfile !== null}
        onOpenChange={(open) => !open && setEditingProfile(null)}
        teamId={teamId}
        profile={editingProfile}
        onSaved={() => {
          setEditingProfile(null);
          fetchProfiles();
        }}
      />
    </>
  );
}

