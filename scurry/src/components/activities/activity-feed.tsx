'use client';

import * as React from 'react';
import {
  FileCode,
  MessageSquare,
  Share2,
  UserPlus,
  Users,
  Database,
  Trash2,
  Loader2,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Activity {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    email: string;
    name: string | null;
  };
  team?: {
    name: string;
  };
}

interface ActivityFeedProps {
  teamId?: string;
  limit?: number;
  className?: string;
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  query_saved: FileCode,
  query_updated: FileCode,
  query_deleted: Trash2,
  query_shared: Share2,
  comment_added: MessageSquare,
  connection_shared: Database,
  connection_unshared: Database,
  member_joined: UserPlus,
  member_invited: UserPlus,
  member_removed: Users,
  team_created: Users,
};

export function ActivityFeed({ teamId, limit = 20, className }: ActivityFeedProps) {
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchActivities();
  }, [teamId]);

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams();
      if (teamId) params.set('teamId', teamId);
      params.set('limit', String(limit));

      const response = await fetch(`/api/activities?${params}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityDescription = (activity: Activity): string => {
    const userName = activity.user?.name || activity.user?.email || 'Someone';
    const metadata = activity.metadata || {};

    switch (activity.action) {
      case 'query_saved':
        return `saved query "${metadata.queryName || 'Untitled'}"`;
      case 'query_updated':
        return `updated query "${metadata.queryName || 'Untitled'}"`;
      case 'query_deleted':
        return `deleted query "${metadata.queryName || 'Untitled'}"`;
      case 'query_shared':
        return `shared query "${metadata.queryName || 'Untitled'}" with the team`;
      case 'comment_added':
        return `commented on "${metadata.queryName || 'a query'}"`;
      case 'connection_shared':
        return `shared connection "${metadata.connectionName || 'Untitled'}"`;
      case 'connection_unshared':
        return `unshared connection "${metadata.connectionName || 'Untitled'}"`;
      case 'member_joined':
        return 'joined the team';
      case 'member_invited':
        return `invited ${metadata.inviteeEmail || 'someone'}`;
      case 'member_removed':
        return `removed ${metadata.memberName || metadata.memberEmail || 'a member'}`;
      case 'team_created':
        return `created the team`;
      default:
        return 'performed an action';
    }
  };

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

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <ScrollArea className={className}>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = actionIcons[activity.action] || FileCode;
          const userName = activity.user?.name || activity.user?.email || 'Someone';

          return (
            <div key={activity.id} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{userName}</span>{' '}
                  <span className="text-muted-foreground">{getActivityDescription(activity)}</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <time className="text-xs text-muted-foreground">
                    {formatRelativeTime(activity.createdAt)}
                  </time>
                  {activity.team && (
                    <span className="text-xs text-muted-foreground">
                      in {activity.team.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
