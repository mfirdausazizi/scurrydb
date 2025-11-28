'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileCode, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  sql: string;
  teamId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface RecentQueriesProps {
  limit?: number;
  className?: string;
}

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export function RecentQueries({ limit = 5, className }: RecentQueriesProps) {
  const router = useRouter();
  const [queries, setQueries] = React.useState<SavedQuery[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      const response = await fetch(`/api/queries?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setQueries(data.slice(0, limit));
      }
    } catch (error) {
      console.error('Failed to fetch queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQuery = (sql: string) => {
    // Store query in sessionStorage and navigate to query editor
    sessionStorage.setItem('runQuery', sql);
    router.push('/query');
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            Recent Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCode className="h-4 w-4" />
            Recent Queries
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href="/queries">
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {queries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No saved queries yet</p>
            <p className="text-xs mt-1">Save queries from the Query Editor</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {queries.map((query) => (
                <button
                  key={query.id}
                  onClick={() => handleRunQuery(query.sql)}
                  className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate flex-1">
                      {query.name}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(query.updatedAt)}
                    </span>
                  </div>
                  {query.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {query.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
