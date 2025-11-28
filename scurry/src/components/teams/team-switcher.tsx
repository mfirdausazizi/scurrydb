'use client';

import * as React from 'react';
import { ChevronsUpDown, Plus, Users, User, Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Team {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
}

interface TeamSwitcherProps {
  className?: string;
}

export function TeamSwitcher({ className }: TeamSwitcherProps) {
  const router = useRouter();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState('');
  const [newTeamSlug, setNewTeamSlug] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);

  React.useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamSlug.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName, slug: newTeamSlug }),
      });

      if (response.ok) {
        const team = await response.json();
        setTeams((prev) => [...prev, { ...team, role: 'owner', memberCount: 1 }]);
        setSelectedTeam({ ...team, role: 'owner', memberCount: 1 });
        setShowCreateDialog(false);
        setNewTeamName('');
        setNewTeamSlug('');
        toast.success('Team created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create team');
      }
    } catch (error) {
      toast.error('Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNameChange = (name: string) => {
    setNewTeamName(name);
    // Auto-generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    setNewTeamSlug(slug);
  };

  const handleSelectTeam = (team: Team | null) => {
    setSelectedTeam(team);
    // In a real app, you might want to store this in localStorage or context
    // and use it to filter connections/queries
  };

  if (isLoading) {
    return (
      <div className={className}>
        <Button variant="outline" className="w-full justify-between" disabled>
          <span className="truncate">Loading...</span>
        </Button>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`w-full justify-between ${className}`}>
            <div className="flex items-center gap-2 truncate">
              {selectedTeam ? (
                <>
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate">{selectedTeam.name}</span>
                </>
              ) : (
                <>
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">Personal</span>
                </>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleSelectTeam(null)}>
            <User className="mr-2 h-4 w-4" />
            <span>Personal</span>
            {!selectedTeam && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          
          {teams.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Teams</DropdownMenuLabel>
              {teams.map((team) => (
                <DropdownMenuItem key={team.id} onClick={() => handleSelectTeam(team)}>
                  <Users className="mr-2 h-4 w-4" />
                  <span className="truncate">{team.name}</span>
                  {selectedTeam?.id === team.id && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </>
          )}
          
          <DropdownMenuSeparator />
          
          {selectedTeam && (
            <DropdownMenuItem onClick={() => router.push(`/teams/${selectedTeam.id}/settings`)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Team Settings</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create Team</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new team</DialogTitle>
            <DialogDescription>
              Teams allow you to share connections and collaborate with others.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Team name</Label>
                <Input
                  id="name"
                  placeholder="My Team"
                  value={newTeamName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Team URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">scurry.app/teams/</span>
                  <Input
                    id="slug"
                    placeholder="my-team"
                    value={newTeamSlug}
                    onChange={(e) => setNewTeamSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens allowed.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !newTeamName.trim() || !newTeamSlug.trim()}>
                {isCreating ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
