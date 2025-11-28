'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Shield, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileList } from '@/components/permissions/profile-list';
import { MemberAssignments } from '@/components/permissions/member-assignments';
import { CreateProfileDialog } from '@/components/permissions/create-profile-dialog';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
  role: string;
}

export default function PermissionsPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = React.useState<Team | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [profileListKey, setProfileListKey] = React.useState(0);

  React.useEffect(() => {
    fetchTeam();
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`);
      if (response.ok) {
        const data = await response.json();
        setTeam(data);
      } else {
        toast.error('Team not found');
      }
    } catch (error) {
      toast.error('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground">Team not found</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const canManage = team.role === 'owner' || team.role === 'admin';

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/teams/${teamId}/settings`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Permissions</h1>
            <p className="text-sm text-muted-foreground">{team.name}</p>
          </div>
        </div>
      </div>

      {!canManage && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="text-sm">View Only</CardTitle>
            <CardDescription>
              You can view permission settings but cannot make changes. Contact a team owner or admin to modify permissions.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles" className="gap-2">
            <Shield className="h-4 w-4" />
            Permission Profiles
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <Users className="h-4 w-4" />
            Member Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Permission Profiles</CardTitle>
                  <CardDescription>
                    Create reusable permission templates for your team members
                  </CardDescription>
                </div>
                {canManage && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProfileList key={profileListKey} teamId={teamId} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Assignments</CardTitle>
              <CardDescription>
                Assign permission profiles or custom permissions to team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemberAssignments teamId={teamId} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateProfileDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        teamId={teamId}
        onCreated={() => setProfileListKey((k) => k + 1)}
      />
    </div>
  );
}

