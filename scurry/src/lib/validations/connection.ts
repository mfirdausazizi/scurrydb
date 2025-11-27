import { z } from 'zod';

export const databaseTypes = ['mysql', 'postgresql', 'mariadb', 'sqlite'] as const;

export const connectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  type: z.enum(databaseTypes, { message: 'Database type is required' }),
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535'),
  database: z.string().min(1, 'Database name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string(),
  ssl: z.boolean(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

export const connectionUpdateSchema = connectionSchema.partial().extend({
  id: z.string().uuid(),
});

export type ConnectionFormData = z.infer<typeof connectionSchema>;
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
