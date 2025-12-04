import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchTables } from '@/lib/db/schema-fetcher';
import type { DatabaseConnection, DatabaseType } from '@/types';

/**
 * Guest Schema Tables API
 * 
 * This endpoint allows guest users to fetch table information by passing
 * the connection details inline (instead of referencing a stored connection).
 * 
 * Security considerations:
 * - Rate limited to prevent abuse
 * - Connection details are NOT stored server-side
 */

// SSH config schema
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

const guestSchemaSchema = z.object({
  // Connection details (passed inline for guest mode)
  connection: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['mysql', 'postgresql', 'mariadb', 'sqlite']),
    host: z.string(),
    port: z.number(),
    database: z.string(),
    username: z.string(),
    password: z.string(),
    ssl: z.boolean().optional(),
    timeout: z.number().optional(),
    ssh: sshConfigSchema,
  }),
});

// Simple in-memory rate limiting for guest endpoint
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute (schema is cached)

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting based on IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validationResult = guestSchemaSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { connection: connData } = validationResult.data;

    // Create a DatabaseConnection object from the inline data
    const connection: DatabaseConnection = {
      id: connData.id,
      name: connData.name,
      type: connData.type as DatabaseType,
      host: connData.host,
      port: connData.port,
      database: connData.database,
      username: connData.username,
      password: connData.password,
      ssl: connData.ssl,
      timeout: connData.timeout,
      ssh: connData.ssh?.enabled ? {
        enabled: true,
        host: connData.ssh.host || '',
        port: connData.ssh.port || 22,
        username: connData.ssh.username || '',
        authMethod: connData.ssh.authMethod || 'password',
        password: connData.ssh.password,
        privateKey: connData.ssh.privateKey,
        passphrase: connData.ssh.passphrase,
      } : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tables = await fetchTables(connection);
    
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Guest schema fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
