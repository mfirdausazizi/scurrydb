'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle, XCircle, Info, KeyRound, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  connectionFormSchema,
  databaseTypes,
  defaultPorts,
  connectionColors,
  type ConnectionFormData,
} from '@/lib/validations/connection';
import type { GuestConnection } from '@/lib/store/guest-connections-store';
import { decryptFromStorage } from '@/lib/utils/client-encryption';

interface GuestConnectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: GuestConnection;
  onSubmit: (data: ConnectionFormData) => Promise<void>;
}

export function GuestConnectionForm({ open, onOpenChange, connection, onSubmit }: GuestConnectionFormProps) {
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [sshExpanded, setSshExpanded] = React.useState(false);
  const [decryptedPassword, setDecryptedPassword] = React.useState<string>('');
  const [serverIP, setServerIP] = React.useState<string | null>(null);

  const isEditing = !!connection?.id;

  // Decrypt password when editing
  React.useEffect(() => {
    if (connection?.encryptedPassword && open) {
      decryptFromStorage(connection.encryptedPassword).then(setDecryptedPassword);
    } else {
      setDecryptedPassword('');
    }
  }, [connection?.encryptedPassword, open]);

  const form = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      name: '',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      database: '',
      username: '',
      password: '',
      ssl: false,
      color: connectionColors[0],
      ssh: {
        enabled: false,
        host: '',
        port: 22,
        username: '',
        authMethod: 'password',
        password: '',
        privateKey: '',
        passphrase: '',
      },
    },
  });

  const watchedType = form.watch('type');
  const watchedHost = form.watch('host');
  const watchedPort = form.watch('port');
  const isSqlite = watchedType === 'sqlite';
  const isRemoteHost = !isSqlite && watchedHost && !['localhost', '127.0.0.1', ''].includes(watchedHost);

  // Fetch server IP when remote host is detected
  React.useEffect(() => {
    if (isRemoteHost && !serverIP) {
      fetch('/api/server-info')
        .then((res) => res.json())
        .then((data) => {
          if (data.ip) {
            setServerIP(data.ip);
          }
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, [isRemoteHost, serverIP]);

  // Reset form when connection changes or dialog opens
  React.useEffect(() => {
    if (open) {
      if (connection) {
        form.reset({
          name: connection.name || '',
          type: connection.type || 'mysql',
          host: connection.host || 'localhost',
          port: connection.port || 3306,
          database: connection.database || '',
          username: connection.username || '',
          password: decryptedPassword,
          ssl: connection.ssl || false,
          color: connection.color || connectionColors[0],
          ssh: {
            enabled: connection.ssh?.enabled || false,
            host: connection.ssh?.host || '',
            port: connection.ssh?.port || 22,
            username: connection.ssh?.username || '',
            authMethod: connection.ssh?.authMethod || 'password',
            password: '',
            privateKey: '',
            passphrase: '',
          },
        });
        setSshExpanded(connection.ssh?.enabled || false);
      } else {
        form.reset({
          name: '',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: '',
          username: '',
          password: '',
          ssl: false,
          color: connectionColors[0],
          ssh: {
            enabled: false,
            host: '',
            port: 22,
            username: '',
            authMethod: 'password',
            password: '',
            privateKey: '',
            passphrase: '',
          },
        });
        setSshExpanded(false);
      }
      setTestResult(null);
    }
  }, [connection, open, form, decryptedPassword]);

  // Update password field when decrypted
  React.useEffect(() => {
    if (decryptedPassword && connection) {
      form.setValue('password', decryptedPassword);
    }
  }, [decryptedPassword, connection, form]);

  const handleTypeChange = (type: typeof databaseTypes[number]) => {
    form.setValue('type', type);
    form.setValue('port', defaultPorts[type]);
    if (type === 'sqlite') {
      form.setValue('host', '');
      form.setValue('username', '');
      form.setValue('password', '');
      form.setValue('ssl', false);
    } else if (form.getValues('host') === '') {
      form.setValue('host', 'localhost');
    }
  };

  const handleTest = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setTesting(true);
    setTestResult(null);

    try {
      const data = form.getValues();
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (data: ConnectionFormData) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      setTestResult(null);
    } catch (error) {
      console.error('Failed to save connection:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Connection' : 'New Connection'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your database connection settings.'
              : 'Add a new database connection. Data is stored locally in your browser.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Database" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Database Type</FormLabel>
                  <Select value={field.value} onValueChange={handleTypeChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {databaseTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {connectionColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-8 w-8 rounded-md border-2 transition-all ${
                          field.value === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isSqlite && (
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Host</FormLabel>
                      <FormControl>
                        <Input placeholder="localhost" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {isRemoteHost && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Firewall Configuration Required</p>
                  <p className="text-xs mt-1 opacity-90">
                    Ensure your database server&apos;s firewall allows connections from ScurryDB&apos;s server
                    {serverIP ? (
                      <> IP <span className="font-mono font-semibold">{serverIP}</span></>
                    ) : (
                      ' IP'
                    )} on port {watchedPort || 'your database port'}.
                  </p>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="database"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isSqlite ? 'Database File Path' : 'Database Name'}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={isSqlite ? '/path/to/database.db' : 'my_database'} 
                      {...field} 
                    />
                  </FormControl>
                  {isSqlite && (
                    <p className="text-xs text-muted-foreground">
                      Enter the full path to the SQLite database file, or use :memory: for in-memory database
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isSqlite && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="root" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* SSH Tunnel Section */}
            {!isSqlite && (
              <>
                <Separator className="my-4" />
                <Collapsible open={sshExpanded} onOpenChange={setSshExpanded}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full text-left"
                    >
                      {sshExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <KeyRound className="h-4 w-4" />
                      <span className="font-medium text-sm">SSH Tunnel</span>
                      {form.watch('ssh.enabled') && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          Enabled
                        </Badge>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label htmlFor="ssh-enabled" className="text-sm font-medium">
                          Enable SSH Tunnel
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Connect to the database through an SSH tunnel
                        </p>
                      </div>
                      <FormField
                        control={form.control}
                        name="ssh.enabled"
                        render={({ field }) => (
                          <Switch
                            id="ssh-enabled"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                    
                    {form.watch('ssh.enabled') && (
                      <div className="space-y-4 pl-4 border-l-2 border-muted">
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="ssh.host"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>SSH Host</FormLabel>
                                <FormControl>
                                  <Input placeholder="ssh.example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ssh.port"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SSH Port</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="22"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.valueAsNumber || 22)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="ssh.username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SSH Username</FormLabel>
                              <FormControl>
                                <Input placeholder="ubuntu" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="ssh.authMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Authentication Method</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="password">Password</SelectItem>
                                  <SelectItem value="privateKey">Private Key</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {form.watch('ssh.authMethod') === 'password' && (
                          <FormField
                            control={form.control}
                            name="ssh.password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SSH Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        {form.watch('ssh.authMethod') === 'privateKey' && (
                          <>
                            <FormField
                              control={form.control}
                              name="ssh.privateKey"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Private Key</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                                      className="font-mono text-xs h-24"
                                      {...field}
                                    />
                                  </FormControl>
                                  <p className="text-xs text-muted-foreground">
                                    Paste your private key content here
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="ssh.passphrase"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Passphrase (Optional)</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="Key passphrase" {...field} />
                                  </FormControl>
                                  <p className="text-xs text-muted-foreground">
                                    Leave empty if your key is not encrypted
                                  </p>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {testResult && (
              <div
                className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                  testResult.success
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Connection'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
