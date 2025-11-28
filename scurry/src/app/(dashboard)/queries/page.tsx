'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileCode, Search, Loader2, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QueryCard } from '@/components/queries';

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

interface Team {
  id: string;
  name: string;
  slug: string;
}

export default function QueriesPage() {
  const router = useRouter();
  const [queries, setQueries] = React.useState<SavedQuery[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterTeam, setFilterTeam] = React.useState<string>('all');

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [queriesRes, teamsRes, meRes] = await Promise.all([
        fetch('/api/queries?includeTeam=true'),
        fetch('/api/teams'),
        fetch('/api/auth/me'),
      ]);

      if (queriesRes.ok) {
        setQueries(await queriesRes.json());
      }
      if (teamsRes.ok) {
        setTeams(await teamsRes.json());
      }
      if (meRes.ok) {
        const user = await meRes.json();
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQuery = (sql: string) => {
    // Store query in sessionStorage and navigate to query editor
    sessionStorage.setItem('runQuery', sql);
    router.push('/query');
  };

  const handleDeleteQuery = (id: string) => {
    setQueries((prev) => prev.filter((q) => q.id !== id));
  };

  const filteredQueries = React.useMemo(() => {
    return queries.filter((query) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        query.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        query.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        query.sql.toLowerCase().includes(searchQuery.toLowerCase());

      // Team filter
      const matchesTeam =
        filterTeam === 'all' ||
        (filterTeam === 'personal' && !query.teamId) ||
        query.teamId === filterTeam;

      return matchesSearch && matchesTeam;
    });
  }, [queries, searchQuery, filterTeam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saved Queries</h1>
        <p className="text-muted-foreground">
          Your personal and team saved queries. Click on a query to run it.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Queries</SelectItem>
            <SelectItem value="personal">Personal Only</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredQueries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
          {queries.length === 0 ? (
            <>
              <h3 className="text-lg font-medium">No saved queries yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Save your first query from the Query Editor using the Save button.
              </p>
              <Button className="mt-4" onClick={() => router.push('/query')}>
                Go to Query Editor
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium">No matching queries</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Try adjusting your search or filter criteria.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQueries.map((query) => (
            <QueryCard
              key={query.id}
              query={query}
              currentUserId={currentUserId}
              onRun={handleRunQuery}
              onDelete={handleDeleteQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}
