'use client';

import * as React from 'react';
import { MoreHorizontal, Pencil, Trash2, Play, Loader2, CheckCircle, XCircle, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { DatabaseConnection } from '@/types';

interface ConnectionCardProps {
  connection: Omit<DatabaseConnection, 'password'>;
  onEdit?: () => void;
  onDelete?: () => void;
  onConnect: () => void;
  isShared?: boolean;
  isOwner?: boolean;
  permission?: string;
}

export function ConnectionCard({ 
  connection, 
  onEdit, 
  onDelete, 
  onConnect,
  isShared = false,
  isOwner = false,
  permission,
}: ConnectionCardProps) {
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`/api/connections/${connection.id}/test`, {
        method: 'POST',
      });
      const result = await response.json();
      setTestResult(result);
      // Clear result after 5 seconds
      setTimeout(() => setTestResult(null), 5000);
    } catch {
      setTestResult({ success: false, message: 'Failed to test' });
    } finally {
      setTesting(false);
    }
  };

  const typeLabels: Record<string, string> = {
    mysql: 'MySQL',
    postgresql: 'PostgreSQL',
    mariadb: 'MariaDB',
    sqlite: 'SQLite',
  };

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <div
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: connection.color || '#8B5A2B' }}
      />
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
            style={{ backgroundColor: connection.color || '#8B5A2B' }}
          >
            {connection.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold leading-none">{connection.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {connection.host}:{connection.port}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onConnect}>
              <Play className="mr-2 h-4 w-4" />
              Connect
            </DropdownMenuItem>
            {(!isShared || isOwner) && (
              <DropdownMenuItem onClick={handleTest} disabled={testing}>
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </DropdownMenuItem>
            )}
            {onEdit && onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{typeLabels[connection.type] || connection.type}</Badge>
            <span className="text-sm text-muted-foreground">{connection.database}</span>
            {isShared && (
              <Badge variant="outline" className="gap-1">
                <Share2 className="h-3 w-3" />
                {isOwner ? 'You shared' : 'Shared'}
              </Badge>
            )}
            {permission && (
              <Badge variant={permission === 'write' ? 'default' : 'secondary'}>
                {permission === 'write' ? 'Read/Write' : 'Read Only'}
              </Badge>
            )}
          </div>
          {testResult && (
            <div
              className={`flex items-center gap-1 text-xs ${
                testResult.success ? 'text-forest' : 'text-berry'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {testResult.success ? 'Connected' : 'Failed'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
