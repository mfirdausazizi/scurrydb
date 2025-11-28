import { createClient, Client } from '@libsql/client';

let tursoClient: Client | null = null;

export function getTursoClient(): Client {
  if (!tursoClient) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DATABASE_URL is not set');
    }

    tursoClient = createClient({
      url,
      authToken,
    });
  }

  return tursoClient;
}

export function isTursoEnabled(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}
