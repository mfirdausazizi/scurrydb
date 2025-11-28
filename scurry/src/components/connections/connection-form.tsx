'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  connectionFormSchema,
  databaseTypes,
  defaultPorts,
  connectionColors,
  type ConnectionFormData,
} from '@/lib/validations/connection';
import type { DatabaseConnection } from '@/types';

interface ConnectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: Partial<DatabaseConnection>;
  onSubmit: (data: ConnectionFormData) => Promise<void>;
}

export function ConnectionForm({ open, onOpenChange, connection, onSubmit }: ConnectionFormProps) {
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      name: connection?.name || '',
      type: connection?.type || 'mysql',
      host: connection?.host || 'localhost',
      port: connection?.port || 3306,
      database: connection?.database || '',
      username: connection?.username || '',
      password: connection?.password || '',
      ssl: connection?.ssl || false,
      color: connection?.color || connectionColors[0],
    },
  });

  const watchedType = form.watch('type');
  const isSqlite = watchedType === 'sqlite';

  React.useEffect(() => {
    if (connection) {
      form.reset({
        name: connection.name || '',
        type: connection.type || 'mysql',
        host: connection.host || 'localhost',
        port: connection.port || 3306,
        database: connection.database || '',
        username: connection.username || '',
        password: connection.password || '',
        ssl: connection.ssl || false,
        color: connection.color || connectionColors[0],
      });
    }
  }, [connection, form]);

  const handleTypeChange = (type: typeof databaseTypes[number]) => {
    form.setValue('type', type);
    form.setValue('port', defaultPorts[type]);
    // Reset server-specific fields for SQLite
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
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save connection:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{connection?.id ? 'Edit Connection' : 'New Connection'}</DialogTitle>
          <DialogDescription>
            {connection?.id
              ? 'Update your database connection settings.'
              : 'Add a new database connection to ScurryDB.'}
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

            {testResult && (
              <div
                className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                  testResult.success
                    ? 'bg-forest/10 text-forest'
                    : 'bg-berry/10 text-berry'
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {connection?.id ? 'Save Changes' : 'Create Connection'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
