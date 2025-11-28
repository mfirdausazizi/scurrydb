'use client';

import Link from 'next/link';
import { Database, Plus, FileCode, Search, Activity, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConnections } from '@/hooks';
import { ActivityFeed } from '@/components/activities';
import { useWorkspaceStore } from '@/lib/store/workspace-store';

export default function DashboardPage() {
  const { activeTeamId, activeTeam } = useWorkspaceStore();
  const { connections, loading } = useConnections({ teamId: activeTeamId });
  const isTeamWorkspace = !!activeTeamId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to ScurryDB! Manage your database connections and run queries.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              {isTeamWorkspace && <Users className="h-3 w-3" />}
              {isTeamWorkspace ? 'Team Connections' : 'Connections'}
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : connections.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {isTeamWorkspace ? 'Shared connections in this team' : 'Database connections configured'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isTeamWorkspace ? (
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href={`/teams/${activeTeamId}/settings`}>
                  <Users className="mr-2 h-4 w-4" />
                  Team Settings
                </Link>
              </Button>
            ) : (
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/connections">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Connection
                </Link>
              </Button>
            )}
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/query">
                <FileCode className="mr-2 h-4 w-4" />
                New Query
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Browse</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Explore your database schema and data.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/browse">Open Browser</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {!loading && connections.length === 0 && (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {isTeamWorkspace ? <Users className="h-6 w-6 text-primary" /> : <Database className="h-6 w-6 text-primary" />}
            </div>
            <CardTitle>
              {isTeamWorkspace ? 'No shared connections' : 'No connections yet'}
            </CardTitle>
            <CardDescription>
              {isTeamWorkspace 
                ? 'Team admins can share connections in team settings.'
                : 'Get started by adding your first database connection.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
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
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {connections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isTeamWorkspace && <Users className="h-4 w-4" />}
                {isTeamWorkspace ? 'Team Connections' : 'Recent Connections'}
              </CardTitle>
              <CardDescription>
                {isTeamWorkspace ? 'Shared connections in this team' : 'Your configured database connections'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {connections.slice(0, 5).map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: connection.color || '#8B5A2B' }}
                      />
                      <div>
                        <p className="font-medium">{connection.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {connection.type} - {connection.host}:{connection.port}
                        </p>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/browse?connection=${connection.id}${isTeamWorkspace ? `&teamId=${activeTeamId}` : ''}`}>
                        Connect
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent actions and team updates</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ActivityFeed limit={10} className="max-h-[300px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
