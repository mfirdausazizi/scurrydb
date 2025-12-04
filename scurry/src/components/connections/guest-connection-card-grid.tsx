'use client';

import * as React from 'react';
import Link from 'next/link';
import { Database, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import type { GuestConnection } from '@/lib/store/guest-connections-store';

interface GuestConnectionCardGridProps {
  connections: GuestConnection[];
  onEdit: (connection: GuestConnection) => void;
  onDelete: (id: string) => void;
}

const databaseIcons: Record<string, string> = {
  mysql: '🐬',
  postgresql: '🐘',
  mariadb: '🦭',
  sqlite: '🪶',
};

export function GuestConnectionCardGrid({
  connections,
  onEdit,
  onDelete,
}: GuestConnectionCardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {connections.map((connection) => (
        <Card
          key={connection.id}
          className="relative overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Color indicator */}
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{ backgroundColor: connection.color || '#8B5A2B' }}
          />

          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{databaseIcons[connection.type] || '🗄️'}</span>
                <div>
                  <CardTitle className="text-lg">{connection.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {connection.type}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Connection Details */}
            <div className="text-sm text-muted-foreground space-y-1">
              {connection.type !== 'sqlite' ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {connection.host}:{connection.port}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs">Database: </span>
                    <span className="font-mono text-xs">{connection.database}</span>
                  </div>
                  <div>
                    <span className="text-xs">User: </span>
                    <span className="font-mono text-xs">{connection.username}</span>
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-xs">File: </span>
                  <span className="font-mono text-xs truncate block">{connection.database}</span>
                </div>
              )}
              {connection.ssh?.enabled && (
                <Badge variant="secondary" className="text-xs">
                  SSH Tunnel
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button asChild variant="default" size="sm" className="flex-1">
                <Link href={`/guest/browse?connection=${connection.id}`}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Browse
                </Link>
              </Button>
              <Button variant="outline" size="icon" onClick={() => onEdit(connection)}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Connection</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{connection.name}&quot;? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(connection.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
