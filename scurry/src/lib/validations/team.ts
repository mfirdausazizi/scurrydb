import { z } from 'zod';

export const teamRoles = ['owner', 'admin', 'member', 'viewer'] as const;
export type TeamRole = (typeof teamRoles)[number];

export const connectionPermissions = ['read', 'write', 'admin'] as const;
export type ConnectionPermission = (typeof connectionPermissions)[number];

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(30, 'Slug must be less than 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

export type CreateTeamFormData = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters').optional(),
});

export type UpdateTeamFormData = z.infer<typeof updateTeamSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer'], { message: 'Invalid role' }),
});

export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer'], { message: 'Invalid role' }),
});

export type UpdateMemberRoleFormData = z.infer<typeof updateMemberRoleSchema>;

export const shareConnectionSchema = z.object({
  connectionId: z.string().uuid('Invalid connection ID'),
  permission: z.enum(connectionPermissions, { message: 'Invalid permission' }),
});

export type ShareConnectionFormData = z.infer<typeof shareConnectionSchema>;

export const savedQuerySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  sql: z.string().min(1, 'SQL is required'),
  connectionId: z.string().uuid().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  isPublic: z.boolean().default(false),
});

export type SavedQueryFormData = z.infer<typeof savedQuerySchema>;

export const queryCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(2000, 'Comment must be less than 2000 characters'),
});

export type QueryCommentFormData = z.infer<typeof queryCommentSchema>;
