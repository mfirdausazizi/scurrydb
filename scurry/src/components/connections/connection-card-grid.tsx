'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  Database, 
  Plus, 
  Search, 
  FileCode, 
  MoreVertical, 
  Pencil, 
  CheckCircle, 
  XCircle,
  Loader2,
  Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { DatabaseConnection } from '@/types';

type SafeConnection = Omit<DatabaseConnection, 'password'> & {
  isShared?: boolean;
};

interface ConnectionCardGridProps {
  connections: SafeConnection[];
  loading?: boolean;
  teamId?: string | null;
  isTeamWorkspace?: boolean;
  onEdit?: (connection: SafeConnection) => void;
}

const dbTypeLabels: Record<string, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlite: 'SQLite',
};

export function ConnectionCardGrid({ 
  connections, 
  loading = false,
  teamId,
  isTeamWorkspace = false,
  onEdit 
}: ConnectionCardGridProps) {
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [testResults, setTestResults] = React.useState<Record<string, { success: boolean; message: string }>>({});

  const handleTestConnection = async (connectionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setTestingId(connectionId);
    try {
      const response = await fetch(`/api/connections/${connectionId}/test`, {
        method: 'POST',
      });
      const result = await response.json();
      setTestResults(prev => ({ ...prev, [connectionId]: result }));
      
      if (result.success) {
        toast.success('Connection successful');
      } else {
        toast.error('Connection failed', { description: result.message });
      }
      
      // Clear result after 5 seconds
      setTimeout(() => {
        setTestResults(prev => {
          const newResults = { ...prev };
          delete newResults[connectionId];
          return newResults;
        });
      }, 5000);
    } catch {
      toast.error('Failed to test connection');
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[180px] animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {connections.map((connection) => {
        const testResult = testResults[connection.id];
        const isTesting = testingId === connection.id;
        const canEdit = !connection.isShared;
        const browseUrl = `/browse?connection=${connection.id}${connection.isShared && teamId ? `&teamId=${teamId}` : ''}`;
        const queryUrl = `/query?connection=${connection.id}${connection.isShared && teamId ? `&teamId=${teamId}` : ''}`;

        return (
          <Card 
            key={connection.id} 
            className="group relative overflow-hidden hover:border-primary/50 transition-colors"
          >
            {/* Color accent bar */}
            <div 
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: connection.color || '#8B5A2B' }}
            />
            
            <CardContent className="p-4 pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div 
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: connection.color || '#8B5A2B' }}
                  />
                  <h3 className="font-semibold truncate">{connection.name}</h3>
                  {connection.isShared && (
                    <span title="Shared connection">
                      <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </span>
                  )}
                </div>
                
                {/* Test result indicator */}
                {testResult && (
                  <div className={`${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                )}
                
                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handleTestConnection(connection.id, e as unknown as React.MouseEvent)}>
                      {isTesting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Test Connection
                    </DropdownMenuItem>
                    {canEdit && onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(connection)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-4">
                <Badge variant="secondary" className="text-xs">
                  {dbTypeLabels[connection.type] || connection.type}
                </Badge>
                <p className="text-sm text-muted-foreground truncate">
                  {connection.host}:{connection.port}
                </p>
                {connection.database && (
                  <p className="text-xs text-muted-foreground truncate">
                    {connection.database}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={browseUrl}>
                    <Search className="mr-2 h-4 w-4" />
                    Browse
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href={queryUrl}>
                    <FileCode className="mr-2 h-4 w-4" />
                    Query
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add Connection Card */}
      <Card className="border-dashed hover:border-primary/50 transition-colors">
        <CardContent className="p-4 h-full flex flex-col items-center justify-center min-h-[180px]">
          <Link 
            href="/connections" 
            className="flex flex-col items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">Add Connection</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
