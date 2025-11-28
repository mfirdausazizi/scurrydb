'use client';

import * as React from 'react';
import { Users, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  userId: string;
  role: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface Assignment {
  id: string;
  userId: string;
  profileId: string | null;
}

interface MemberAssignmentsProps {
  teamId: string;
  canManage: boolean;
}

export function MemberAssignments({ teamId, canManage }: MemberAssignmentsProps) {
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchMembers();
  }, [teamId]);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No team members yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{member.user?.name || member.user?.email}</p>
              <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
            </div>
          </div>
          {canManage && member.role !== 'owner' && (
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">No permissions assigned</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

