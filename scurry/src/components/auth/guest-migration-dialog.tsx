'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Database, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGuestConnectionsStore, type GuestConnection } from '@/lib/store/guest-connections-store';
import { useGuestModeStore } from '@/lib/store/guest-mode-store';
import { decryptFromStorage } from '@/lib/utils/client-encryption';

interface GuestMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestMigrationDialog({ open, onOpenChange }: GuestMigrationDialogProps) {
  const router = useRouter();
  const [migrating, setMigrating] = React.useState(false);
  const [migrationComplete, setMigrationComplete] = React.useState(false);
  const [migrationResult, setMigrationResult] = React.useState<{
    imported: number;
    total: number;
    errors?: string[];
  } | null>(null);

  const guestConnections = useGuestConnectionsStore((state) => state.connections);
  const clearAllConnections = useGuestConnectionsStore((state) => state.clearAllConnections);
  const exitGuestMode = useGuestModeStore((state) => state.exitGuestMode);

  const handleMigrate = async () => {
    setMigrating(true);

    try {
      // Decrypt all guest connections
      const decryptedConnections = await Promise.all(
        guestConnections.map(async (conn) => {
          const password = await decryptFromStorage(conn.encryptedPassword);
          
          let sshConfig: {
            enabled: boolean;
            host?: string;
            port?: number;
            username?: string;
            authMethod?: 'password' | 'privateKey';
            password?: string;
            privateKey?: string;
            passphrase?: string;
          } | undefined;

          if (conn.ssh?.enabled) {
            sshConfig = {
              enabled: true,
              host: conn.ssh.host,
              port: conn.ssh.port,
              username: conn.ssh.username,
              authMethod: conn.ssh.authMethod,
              password: conn.ssh.encryptedPassword 
                ? await decryptFromStorage(conn.ssh.encryptedPassword) 
                : undefined,
              privateKey: conn.ssh.encryptedPrivateKey 
                ? await decryptFromStorage(conn.ssh.encryptedPrivateKey) 
                : undefined,
              passphrase: conn.ssh.encryptedPassphrase 
                ? await decryptFromStorage(conn.ssh.encryptedPassphrase) 
                : undefined,
            };
          }

          return {
            name: conn.name,
            type: conn.type,
            host: conn.host,
            port: conn.port,
            database: conn.database,
            username: conn.username,
            password,
            ssl: conn.ssl,
            color: conn.color,
            timeout: conn.timeout,
            ssh: sshConfig,
          };
        })
      );

      // Send to API
      const response = await fetch('/api/connections/import-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connections: decryptedConnections }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import connections');
      }

      setMigrationResult({
        imported: result.imported?.length || 0,
        total: guestConnections.length,
        errors: result.errors?.map((e: { name: string; error: string }) => `${e.name}: ${e.error}`),
      });

      // Clear guest data
      clearAllConnections();
      exitGuestMode();

      setMigrationComplete(true);
      toast.success(`Imported ${result.imported?.length || 0} connections`);
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Failed to import connections', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    // Clear guest data without migrating
    clearAllConnections();
    exitGuestMode();
    onOpenChange(false);
    router.push('/dashboard');
  };

  const handleContinue = () => {
    onOpenChange(false);
    router.push('/dashboard');
  };

  if (migrationComplete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center">Migration Complete!</DialogTitle>
            <DialogDescription className="text-center">
              {migrationResult && (
                <>
                  Successfully imported {migrationResult.imported} of {migrationResult.total} connections.
                  {migrationResult.errors && migrationResult.errors.length > 0 && (
                    <span className="block mt-2 text-amber-600 dark:text-amber-400">
                      {migrationResult.errors.length} connection(s) could not be imported.
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleContinue} className="w-full">
              Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Import Guest Connections?</DialogTitle>
          <DialogDescription className="text-center">
            You have {guestConnections.length} connection{guestConnections.length === 1 ? '' : 's'} saved from guest mode.
            Would you like to import {guestConnections.length === 1 ? 'it' : 'them'} to your new account?
          </DialogDescription>
        </DialogHeader>

        {/* Connection Preview */}
        <div className="max-h-40 overflow-y-auto space-y-2 my-2">
          {guestConnections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm"
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: conn.color || '#8B5A2B' }}
              />
              <span className="font-medium truncate">{conn.name}</span>
              <span className="text-muted-foreground text-xs">({conn.type})</span>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-700 dark:text-amber-300">
            Your guest data will be cleared after import. If you skip, your guest connections will be lost.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={migrating}
            className="w-full sm:w-auto"
          >
            Skip & Start Fresh
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full sm:w-auto"
          >
            {migrating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>Import Connections</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to check if there are guest connections to migrate
 */
export function useHasGuestConnections(): boolean {
  const connections = useGuestConnectionsStore((state) => state.connections);
  const isGuestMode = useGuestModeStore((state) => state.isGuestMode);
  return isGuestMode && connections.length > 0;
}
