'use client';

import * as React from 'react';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user?: {
    email: string;
    name: string | null;
  };
}

interface QueryCommentsProps {
  queryId: string;
  currentUserId: string;
}

export function QueryComments({ queryId, currentUserId }: QueryCommentsProps) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newComment, setNewComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetchComments();
  }, [queryId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/queries/${queryId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/queries/${queryId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments((prev) => [...prev, comment]);
        setNewComment('');
        toast.success('Comment added');
      } else {
        toast.error('Failed to add comment');
      }
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const response = await fetch(`/api/queries/${queryId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        toast.success('Comment deleted');
      } else {
        toast.error('Failed to delete comment');
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No comments yet.</p>
            <p className="text-xs">Be the first to add a comment!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {(comment.user?.name || comment.user?.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {comment.user?.name || comment.user?.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                    </div>
                  </div>
                  {comment.userId === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm mt-2 ml-9 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <Button type="submit" size="icon" disabled={submitting || !newComment.trim()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
