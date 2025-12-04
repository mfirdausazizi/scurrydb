'use client';

import Link from 'next/link';
import { Database, Plus, SquareTerminal, HardDrive, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useGuestConnectionsStore } from '@/lib/store/guest-connections-store';

export default function GuestDashboardPage() {
  const connections = useGuestConnectionsStore((state) => state.connections);

  return (
    <div className="container mx-auto max-w-6xl space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome to ScurryDB</h1>
        <p className="text-muted-foreground">
          You&apos;re exploring ScurryDB in guest mode. Add a database connection to get started.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Connections
            </CardTitle>
            <CardDescription>
              {connections.length === 0
                ? 'Add your first database connection'
                : `${connections.length} connection${connections.length === 1 ? '' : 's'} saved locally`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/guest/connections">
                <Plus className="h-4 w-4 mr-2" />
                {connections.length === 0 ? 'Add Connection' : 'Manage Connections'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" />
              Schema Browser
            </CardTitle>
            <CardDescription>
              Browse tables, columns, and indexes in your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" disabled={connections.length === 0}>
              <Link href="/guest/browse">
                <Database className="h-4 w-4 mr-2" />
                Browse Schema
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SquareTerminal className="h-5 w-5 text-primary" />
              Query Editor
            </CardTitle>
            <CardDescription>
              Write and execute SQL queries with syntax highlighting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full" disabled={connections.length === 0}>
              <Link href="/guest/query">
                <SquareTerminal className="h-4 w-4 mr-2" />
                Open Query Editor
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feature Highlights */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Get the Full Experience
          </CardTitle>
          <CardDescription>
            Create a free account to unlock all features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">What you can do now:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Connect to MySQL, PostgreSQL, MariaDB, SQLite
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Browse database schema
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Execute SQL queries
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  View query results
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">With a free account:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className="text-primary">+</span>
                  Sync data across devices
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">+</span>
                  Team collaboration & sharing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">+</span>
                  AI-powered SQL assistant
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">+</span>
                  Save queries & activity history
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button asChild>
              <Link href="/register">Create Free Account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Local Storage Info */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Your Data is Stored Locally
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            In guest mode, all your connections and settings are stored in your browser&apos;s local storage.
            This means:
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Your data stays private and never leaves your browser</li>
            <li>Clearing browser data will remove your saved connections</li>
            <li>You can&apos;t access your data from other devices</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
