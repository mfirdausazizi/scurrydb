'use client';

import Link from 'next/link';
import { Database, Plus, FileCode, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConnectionStore } from '@/lib/store';

export default function DashboardPage() {
  const { connections } = useConnectionStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Scurry! Manage your database connections and run queries.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.length}</div>
            <p className="text-xs text-muted-foreground">
              Database connections configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/connections">
                <Plus className="mr-2 h-4 w-4" />
                Add Connection
              </Link>
            </Button>
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

      {connections.length === 0 && (
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
            <Button asChild>
              <Link href="/connections">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Connection
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Connections</CardTitle>
            <CardDescription>Your configured database connections</CardDescription>
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
                    <Link href={`/browse?connection=${connection.id}`}>
                      Connect
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
