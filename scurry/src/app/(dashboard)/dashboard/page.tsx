'use client';

import * as React from 'react';
import Link from 'next/link';
import { Database, Plus, Users, Activity, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useConnections, useWorkspaceContext } from '@/hooks';
import { ActivityFeed } from '@/components/activities';
import { ConnectionForm, ConnectionCardGrid } from '@/components/connections';
import { RecentQueries } from '@/components/queries';
import type { ConnectionFormData } from '@/lib/validations/connection';
import type { DatabaseConnection } from '@/types';

type SafeConnection = Omit<DatabaseConnection, 'password'> & {
  isShared?: boolean;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { teamId: activeTeamId, isTeamWorkspace } = useWorkspaceContext();
  const { connections, loading, refetch } = useConnections({ teamId: activeTeamId });
  
  const [editingConnection, setEditingConnection] = React.useState<SafeConnection | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [userName, setUserName] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Fetch current user info for greeting
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.name || data.email) {
          setUserName(data.name || data.email.split('@')[0]);
        }
      })
      .catch(() => {
        // Ignore errors
      });
  }, []);

  const handleEditConnection = (connection: SafeConnection) => {
    setEditingConnection(connection);
    setFormOpen(true);
  };

  const handleUpdateConnection = async (data: ConnectionFormData) => {
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
    refetch();
  };

  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {getGreeting()}{userName ? `, ${userName}` : ''}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {connections.length === 0 
            ? 'Get started by adding your first database connection.'
            : 'Select a connection to start exploring your data.'}
        </p>
      </div>

      {/* Connections Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {isTeamWorkspace ? 'Team Connections' : 'Your Connections'}
            </h2>
            {isTeamWorkspace && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                Shared
              </span>
            )}
          </div>
          {!isTeamWorkspace && (
            <Button asChild size="sm" variant="outline">
              <Link href="/connections">
                <Plus className="mr-2 h-4 w-4" />
                Add New
              </Link>
            </Button>
          )}
          {isTeamWorkspace && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/teams/${activeTeamId}/settings`}>
                <Users className="mr-2 h-4 w-4" />
                Team Settings
              </Link>
            </Button>
          )}
        </div>

        {!loading && connections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                {isTeamWorkspace ? (
                  <Users className="h-8 w-8 text-primary" />
                ) : (
                  <Database className="h-8 w-8 text-primary" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {isTeamWorkspace ? 'No shared connections' : 'No connections yet'}
              </h3>
              <p className="text-muted-foreground text-center max-w-sm mb-4">
                {isTeamWorkspace 
                  ? 'Team admins can share connections from team settings.'
                  : 'Connect to your first database to start browsing schemas and running queries.'}
              </p>
              {isTeamWorkspace ? (
                <Button asChild>
                  <Link href={`/teams/${activeTeamId}/settings`}>
                    <Users className="mr-2 h-4 w-4" />
                    Go to Team Settings
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/connections">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Connection
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <ConnectionCardGrid 
            connections={connections}
            loading={loading}
            teamId={activeTeamId}
            isTeamWorkspace={isTeamWorkspace}
            onEdit={handleEditConnection}
          />
        )}
      </section>

      {/* Recent Queries & Activity Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentQueries limit={5} />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="/activity">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityFeed limit={5} className="max-h-[200px]" />
          </CardContent>
        </Card>
      </div>

      {/* Edit Connection Dialog */}
      <ConnectionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingConnection(null);
        }}
        connection={editingConnection as DatabaseConnection | undefined}
        onSubmit={handleUpdateConnection}
      />
    </div>
  );
}
