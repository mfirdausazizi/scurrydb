import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createConnection } from '@/lib/db/app-db';
import { getCurrentUser } from '@/lib/auth/session';
import type { DatabaseType } from '@/types';

/**
 * Guest Connection Import API
 * 
 * Imports connections from guest mode (localStorage) into a user's account.
 * The client decrypts the guest credentials and sends them here to be
 * re-encrypted with server-side encryption.
 */

const sshConfigSchema = z.object({
  enabled: z.boolean(),
  host: z.string().optional(),
  port: z.number().optional(),
  username: z.string().optional(),
  authMethod: z.enum(['password', 'privateKey']).optional(),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  passphrase: z.string().optional(),
}).optional();

const guestConnectionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['mysql', 'postgresql', 'mariadb', 'sqlite']),
  host: z.string(),
  port: z.number(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean().optional(),
  color: z.string().optional(),
  timeout: z.number().optional(),
  ssh: sshConfigSchema,
});

const importRequestSchema = z.object({
  connections: z.array(guestConnectionSchema).min(1).max(20), // Limit to 20 connections
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = importRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { connections } = validationResult.data;
    const importedConnections: { id: string; name: string }[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const conn of connections) {
      try {
        const newConnection = await createConnection({
          id: uuidv4(),
          name: conn.name,
          type: conn.type as DatabaseType,
          host: conn.host,
          port: conn.port,
          database: conn.database,
          username: conn.username,
          password: conn.password,
          ssl: conn.ssl,
          color: conn.color,
          ssh: conn.ssh?.enabled ? {
            enabled: true,
            host: conn.ssh.host || '',
            port: conn.ssh.port || 22,
            username: conn.ssh.username || '',
            authMethod: conn.ssh.authMethod || 'password',
            password: conn.ssh.password,
            privateKey: conn.ssh.privateKey,
            passphrase: conn.ssh.passphrase,
          } : undefined,
        }, user.id);

        importedConnections.push({
          id: newConnection.id,
          name: newConnection.name,
        });
      } catch (error) {
        errors.push({
          name: conn.name,
          error: error instanceof Error ? error.message : 'Failed to import connection',
        });
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedConnections,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedConnections.length} of ${connections.length} connections`,
    });
  } catch (error) {
    console.error('Failed to import guest connections:', error);
    return NextResponse.json(
      { error: 'Failed to import connections' },
      { status: 500 }
    );
  }
}
