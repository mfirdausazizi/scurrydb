'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionName: string;
  onConfirm: () => Promise<void>;
}

export function DeleteConnectionDialog({
  open,
  onOpenChange,
  connectionName,
  onConfirm,
}: DeleteConnectionDialogProps) {
  const [confirmText, setConfirmText] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);

  const isConfirmed = confirmText === connectionName;

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    try {
      await onConfirm();
      setConfirmText('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete connection:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Connection</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            connection <strong>&quot;{connectionName}&quot;</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="confirm-name" className="text-sm text-muted-foreground">
            Type <strong>{connectionName}</strong> to confirm:
          </Label>
          <Input
            id="confirm-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={connectionName}
            className="mt-2"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Connection
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
