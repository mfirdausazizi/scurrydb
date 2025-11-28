'use client';

import * as React from 'react';
import { Play, Copy, Trash2, Users, User, MessageSquare, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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

interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  sql: string;
  teamId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    email: string;
    name: string | null;
  };
  team?: {
    name: string;
  };
}

interface QueryCardProps {
  query: SavedQuery;
  currentUserId: string;
  onRun?: (sql: string) => void;
  onDelete?: (id: string) => void;
  commentCount?: number;
}

export function QueryCard({ query, currentUserId, onRun, onDelete, commentCount = 0 }: QueryCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const isOwner = query.userId === currentUserId;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(query.sql);
    toast.success('SQL copied to clipboard');
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/queries/${query.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Query deleted');
        onDelete?.(query.id);
      } else {
        toast.error('Failed to delete query');
      }
    } catch (error) {
      toast.error('Failed to delete query');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      <Card className="group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-medium">{query.name}</CardTitle>
              {query.description && (
                <CardDescription className="text-sm">{query.description}</CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRun && (
                  <DropdownMenuItem onClick={() => onRun(query.sql)}>
                    <Play className="h-4 w-4 mr-2" />
                    Run Query
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-2 mb-3">
            <pre className="text-xs font-mono overflow-x-auto max-h-[80px] text-muted-foreground">
              {query.sql.length > 150 ? query.sql.substring(0, 150) + '...' : query.sql}
            </pre>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {query.team ? (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  {query.team.name}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <User className="h-3 w-3" />
                  Personal
                </Badge>
              )}
              {commentCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {commentCount}
                </span>
              )}
            </div>
            <span>{formatDate(query.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete query?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{query.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
