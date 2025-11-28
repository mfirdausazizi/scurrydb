'use client';

import * as React from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface SaveQueryDialogProps {
  sql: string;
  connectionId?: string | null;
  onSaved?: (query: { id: string; name: string }) => void;
  trigger?: React.ReactNode;
}

export function SaveQueryDialog({ sql, connectionId, onSaved, trigger }: SaveQueryDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [teamId, setTeamId] = React.useState<string>('personal');
  const [saving, setSaving] = React.useState(false);
  const [loadingTeams, setLoadingTeams] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      fetchTeams();
    }
  }, [open]);

  const fetchTeams = async () => {
    setLoadingTeams(true);
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        // Filter to teams where user can save queries (not viewer)
        setTeams(data.filter((t: Team) => t.role !== 'viewer'));
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sql.trim()) {
      toast.error('Name and SQL are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          sql,
          connectionId: connectionId || undefined,
          teamId: teamId === 'personal' ? undefined : teamId,
        }),
      });

      if (response.ok) {
        const query = await response.json();
        toast.success('Query saved successfully');
        setOpen(false);
        setName('');
        setDescription('');
        setTeamId('personal');
        onSaved?.(query);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save query');
      }
    } catch (error) {
      toast.error('Failed to save query');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Query</DialogTitle>
          <DialogDescription>
            Save this query for later use. You can also share it with a team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Query"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What does this query do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team">Save to</Label>
              <Select value={teamId} onValueChange={setTeamId} disabled={loadingTeams}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select where to save" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal (only you)</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} (Team)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamId !== 'personal' && (
                <p className="text-xs text-muted-foreground">
                  Team members will be able to view and use this query.
                </p>
              )}
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">Query Preview</p>
              <pre className="text-xs font-mono overflow-x-auto max-h-[100px]">
                {sql.length > 200 ? sql.substring(0, 200) + '...' : sql}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Query
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
