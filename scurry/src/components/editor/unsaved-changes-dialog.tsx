'use client';

import * as React from 'react';
import { FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabTitle: string;
  sql: string;
  onSave?: () => void; // Optional save handler
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  tabTitle,
  sql,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <div className="p-2 rounded-full bg-amber-50 dark:bg-amber-950/50">
              <FileWarning className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg">
              Unsaved Changes
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">
                The tab &quot;{tabTitle}&quot; has unsaved changes. Do you want to save before closing?
              </p>
              
              {/* Query preview */}
              <div className="bg-muted/50 p-3 rounded-lg max-h-32 overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
                  {sql.slice(0, 500)}
                  {sql.length > 500 && '...'}
                </pre>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDiscard}>
            Don&apos;t Save
          </Button>
          {onSave && (
            <Button onClick={onSave}>
              Save
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
