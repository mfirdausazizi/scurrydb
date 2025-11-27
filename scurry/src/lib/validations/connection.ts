import { z } from 'zod';

export const databaseTypes = ['mysql', 'postgresql', 'mariadb', 'sqlite'] as const;

// Simplified schema for form that works with all types
export const connectionFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  type: z.enum(databaseTypes, { message: 'Database type is required' }),
  host: z.string(),
  port: z.number().int().min(0).max(65535, 'Port must be between 0 and 65535'),
  database: z.string().min(1, 'Database name/path is required'),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
}).refine((data) => {
  // For non-SQLite databases, require host, port, and username
  if (data.type !== 'sqlite') {
    return data.host.length > 0 && data.port > 0 && data.username.length > 0;
  }
  return true;
}, {
  message: 'Host, port, and username are required for server databases',
  path: ['host'],
});

// Alias for backward compatibility
export const connectionSchema = connectionFormSchema;

export const connectionUpdateSchema = connectionFormSchema.partial().extend({
  id: z.string().uuid(),
});

export type ConnectionFormData = z.infer<typeof connectionFormSchema>;
export type ConnectionUpdateData = z.infer<typeof connectionUpdateSchema>;

export const defaultPorts: Record<typeof databaseTypes[number], number> = {
  mysql: 3306,
  postgresql: 5432,
  mariadb: 3306,
  sqlite: 0,
};

export const connectionColors = [
  '#8B5A2B', // Acorn
  '#E86A33', // Sprint
  '#2D5A3D', // Forest
  '#F5A623', // Honey
  '#D64545', // Berry
  '#4A90D9', // Sky Blue
  '#9B59B6', // Purple
  '#1ABC9C', // Teal
];
