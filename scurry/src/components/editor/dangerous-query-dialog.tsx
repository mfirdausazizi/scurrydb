'use client';

import * as React from 'react';
import { AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  type DangerousQueryInfo,
  getDangerLevelInfo,
} from '@/lib/sql/dangerous-query-detector';

interface DangerousQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queryInfo: DangerousQueryInfo;
  sql: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DangerousQueryDialog({
  open,
  onOpenChange,
  queryInfo,
  sql,
  onConfirm,
  onCancel,
}: DangerousQueryDialogProps) {
  const [confirmationText, setConfirmationText] = React.useState('');
  const [warningAcknowledged, setWarningAcknowledged] = React.useState(false);

  const levelInfo = getDangerLevelInfo(queryInfo.level);
  const isCritical = queryInfo.level === 'critical';
  
  // For critical operations, user must type the object name exactly
  const isConfirmationValid = isCritical
    ? confirmationText.toLowerCase() === (queryInfo.affectedObject || '').toLowerCase()
    : warningAcknowledged;

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setConfirmationText('');
      setWarningAcknowledged(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (isConfirmationValid) {
      onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isConfirmationValid) {
      handleConfirm();
    }
  };

  const Icon = isCritical ? AlertTriangle : AlertCircle;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className={`flex items-center gap-3 ${levelInfo.color}`}>
            <div className={`p-2 rounded-full ${levelInfo.bgColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg">
              {levelInfo.title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              {/* Warning message */}
              <div className={`rounded-lg p-3 ${levelInfo.bgColor}`}>
                <p className={`text-sm font-medium ${levelInfo.color}`}>
                  {queryInfo.message}
                </p>
              </div>

              {/* Query preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Query to execute:</p>
                <pre className="text-xs font-mono bg-muted/50 p-3 rounded-lg overflow-x-auto max-h-32 text-foreground whitespace-pre-wrap break-all">
                  {sql}
                </pre>
              </div>

              {/* Confirmation input for critical operations */}
              {isCritical && queryInfo.affectedObject && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    To confirm, type <span className="font-mono font-semibold text-foreground">{queryInfo.affectedObject}</span> below:
                  </p>
                  <Input
                    placeholder={queryInfo.affectedObject}
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono"
                    autoFocus
                  />
                </div>
              )}

              {/* Checkbox acknowledgment for warnings */}
              {!isCritical && (
                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="acknowledge-warning"
                    checked={warningAcknowledged}
                    onCheckedChange={(checked) => setWarningAcknowledged(!!checked)}
                  />
                  <label
                    htmlFor="acknowledge-warning"
                    className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
                  >
                    I understand this operation may affect multiple rows and cannot be easily undone.
                  </label>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <Button
            variant={isCritical ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={!isConfirmationValid}
            className="gap-2"
          >
            <ShieldAlert className="h-4 w-4" />
            {isCritical ? 'Delete Permanently' : 'Execute Query'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
