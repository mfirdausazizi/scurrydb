# ScurryDB Application

This is the main ScurryDB web application built with Next.js 15.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Configuration

ScurryDB supports three database backends for the application database:

| Backend | Environment Variable | Use Case |
|---------|---------------------|----------|
| **SQLite** | None (default) | Local development |
| **Turso** | `TURSO_DATABASE_URL` | Serverless (Vercel) |
| **PostgreSQL** | `DATABASE_URL` | Production |

### Auto-Detection Priority

The app automatically detects which database to use:

1. If `DATABASE_URL` starts with `postgres://` → **PostgreSQL**
2. If `TURSO_DATABASE_URL` is set → **Turso**
3. Otherwise → **SQLite** (file at `./data/scurrydb.db`)

## Environment Variables

Create a `.env.local` file:

```bash
# Required: Encryption key for connection passwords
ENCRYPTION_KEY=your-32-character-key-here!!!!!

# Optional: PostgreSQL (production)
DATABASE_URL=postgres://user:password@host:5432/scurrydb

# Optional: Turso (serverless)
TURSO_DATABASE_URL=libsql://scurrydb-xxx.turso.io
TURSO_AUTH_TOKEN=your-token

# Optional: SQLite path (development)
APP_DB_PATH=./data/scurrydb.db

# Optional: SMTP for password reset emails
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=ScurryDB

# App URL (used for email links)
APP_URL=http://localhost:3000
```

## SMTP Configuration (Password Reset Emails)

ScurryDB supports sending password reset emails via SMTP. To enable this feature, configure the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | Yes | SMTP server hostname (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`) |
| `SMTP_PORT` | Yes | SMTP server port (typically `587` for TLS, `465` for SSL) |
| `SMTP_SECURE` | No | Set to `true` for SSL on port 465 (default: `false`) |
| `SMTP_USER` | Yes | SMTP authentication username |
| `SMTP_PASSWORD` | Yes | SMTP authentication password or app-specific password |
| `SMTP_FROM_EMAIL` | Yes | Sender email address (e.g., `noreply@yourapp.com`) |
| `SMTP_FROM_NAME` | No | Sender display name (default: `ScurryDB`) |
| `APP_URL` | Yes | Your application URL for password reset links |

### Example Configurations

**Gmail:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM_EMAIL=your-email@gmail.com
```
> Note: Gmail requires an [App Password](https://support.google.com/accounts/answer/185833) when 2FA is enabled.

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

**Amazon SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

If SMTP is not configured, the forgot password feature will still be accessible but emails won't be sent (useful for development).

## Spam Protection (Cloudflare Turnstile)

ScurryDB includes built-in spam protection using a combination of:
- **Honeypot fields** - Hidden form fields that catch simple bots (zero user friction)
- **Cloudflare Turnstile** - Privacy-friendly CAPTCHA alternative (minimal user friction)

### Setting Up Turnstile

1. Go to the [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/turnstile)
2. Click "Add Site" and configure:
   - **Site name:** Your app name
   - **Domains:** Your domain(s) (e.g., `localhost`, `yourapp.com`)
   - **Widget Mode:** Managed (recommended)
3. Copy the **Site Key** and **Secret Key**

Add these to your `.env.local`:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAAA...
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes* | Public site key for the widget |
| `TURNSTILE_SECRET_KEY` | Yes* | Secret key for server verification |

*If not configured, Turnstile is disabled and only honeypot protection is active.

### Testing Keys

For development, you can use Cloudflare's test keys:

```bash
# Always passes
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# Always blocks
NEXT_PUBLIC_TURNSTILE_SITE_KEY=2x00000000000000000000AB
TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AB
```

See [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/) for more details.

## Development with PostgreSQL

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name scurrydb-postgres \
  -e POSTGRES_DB=scurrydb \
  -e POSTGRES_USER=scurry \
  -e POSTGRES_PASSWORD=scurry \
  -p 5432:5432 \
  postgres:16

# Initialize schema
psql postgres://scurry:scurry@localhost:5432/scurrydb < init-schema-postgres.sql

# Set environment and run
export DATABASE_URL=postgres://scurry:scurry@localhost:5432/scurrydb
npm run dev
```

## Deployment

See the detailed deployment guides:

- **Vercel with Turso or PostgreSQL:** [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **Turso Setup:** [README_TURSO.md](./README_TURSO.md)

## Project Structure

```
src/
├── app/                # Next.js App Router pages & API routes
├── components/         # React components
├── lib/
│   ├── db/            # Database layer (unified client)
│   │   ├── db-client.ts      # Unified SQLite/Turso/PostgreSQL client
│   │   ├── app-db.ts         # Application database functions
│   │   ├── teams.ts          # Team management
│   │   ├── queries.ts        # Saved queries
│   │   └── drivers/          # External database drivers
│   ├── auth/          # Authentication (Argon2id)
│   └── store/         # Zustand stores
└── types/             # TypeScript types
```

## Schema Files

- `init-schema.sql` - SQLite/Turso schema
- `init-schema-postgres.sql` - PostgreSQL schema

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run mcp:build` | Build MCP server for Claude Desktop |
