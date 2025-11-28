# Vercel Deployment Guide for ScurryDB

ScurryDB supports three database backends for the application database:
- **SQLite** - Local development (default)
- **Turso** - Serverless SQLite for Vercel
- **PostgreSQL** - Production-grade database

---

## Option 1: Deploy with Turso (Recommended for Vercel)

### Quick Start (5 Minutes)

#### Step 1: Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

#### Step 2: Create & Setup Turso Database

```bash
# Login to Turso
turso auth login

# Create database
turso db create scurrydb

# Initialize schema
turso db shell scurrydb < init-schema.sql

# Get your credentials
echo "Database URL:"
turso db show scurrydb --url

echo "Auth Token:"
turso db tokens create scurrydb
```

#### Step 3: Add Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

1. **TURSO_DATABASE_URL**
   - Value: `libsql://scurrydb-[your-org].turso.io`
   - Environments: Production ✓ Preview ✓ Development ✓

2. **TURSO_AUTH_TOKEN**  
   - Value: `eyJh...` (your token)
   - Environments: Production ✓ Preview ✓ Development ✓
   - Sensitive: ✓

3. **ENCRYPTION_KEY**
   - Value: Generate with: `openssl rand -base64 32`
   - Environments: Production ✓ Preview ✓ Development ✓
   - Sensitive: ✓

#### Step 4: Deploy

```bash
git add .
git commit -m "Add Turso support"
git push origin main
```

Vercel will automatically deploy! ✨

---

## Option 2: Deploy with PostgreSQL (Recommended for Production)

PostgreSQL is recommended for production deployments with team collaboration features due to better concurrent write handling.

### Step 1: Set Up PostgreSQL Database

Choose a managed PostgreSQL provider:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Neon** | 512 MB, always free | Serverless, autoscaling |
| **Supabase** | 500 MB, 2 CPUs | Feature-rich, generous |
| **Vercel Postgres** | 256 MB, 60h compute | Native Vercel integration |
| **Railway** | $5 trial credit | Easy setup |

**Example: Neon Setup**

```bash
# Go to https://neon.tech and create a project
# Copy your connection string (starts with postgres://)
```

### Step 2: Initialize PostgreSQL Schema

```bash
# Connect to your PostgreSQL database
psql "your-connection-string"

# Run the PostgreSQL schema
\i init-schema-postgres.sql

# Verify tables were created
\dt
```

### Step 3: Add Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables:

1. **DATABASE_URL**
   - Value: `postgres://user:password@host:5432/scurrydb`
   - Environments: Production ✓ Preview ✓
   - Sensitive: ✓

2. **ENCRYPTION_KEY**
   - Value: Generate with: `openssl rand -base64 32`
   - Environments: Production ✓ Preview ✓ Development ✓
   - Sensitive: ✓

### Step 4: Deploy

```bash
git push origin main
```

---

## Database Backend Auto-Detection

ScurryDB automatically selects the database backend based on environment variables:

| Environment Variable | Database Used |
|---------------------|---------------|
| `DATABASE_URL=postgres://...` | PostgreSQL |
| `TURSO_DATABASE_URL=libsql://...` | Turso |
| Neither set | SQLite (local file) |

**Priority order:** PostgreSQL → Turso → SQLite

---

## Local Development Setup

### Option A: SQLite (Recommended for Development)

No configuration needed! Just run:

```bash
npm run dev
```

SQLite database will be created at `./data/scurrydb.db`.

### Option B: PostgreSQL Locally (via Docker)

```bash
# Start PostgreSQL
docker run -d \
  --name scurrydb-postgres \
  -e POSTGRES_DB=scurrydb \
  -e POSTGRES_USER=scurry \
  -e POSTGRES_PASSWORD=scurry \
  -p 5432:5432 \
  postgres:16

# Initialize schema
psql postgres://scurry:scurry@localhost:5432/scurrydb < init-schema-postgres.sql

# Set environment variable
export DATABASE_URL=postgres://scurry:scurry@localhost:5432/scurrydb
export ENCRYPTION_KEY=your-32-character-key-here!!!!!

npm run dev
```

### Option C: Turso Locally

**.env.local:**
```bash
TURSO_DATABASE_URL=libsql://scurrydb-yourorg.turso.io
TURSO_AUTH_TOKEN=your-auth-token
ENCRYPTION_KEY=your-local-key
```

---

## Verification Checklist

After deployment, verify everything works:

- [ ] Visit your deployed URL
- [ ] Create a test user account  
- [ ] Login successfully
- [ ] Add a test database connection
- [ ] Run a test query
- [ ] Create a team and invite a member

---

## Troubleshooting

### Error: "DATABASE_URL is not set" (PostgreSQL)

1. Check Vercel dashboard → Settings → Environment Variables
2. Ensure `DATABASE_URL` starts with `postgres://` or `postgresql://`
3. Redeploy the project

### Error: "TURSO_DATABASE_URL is not set" (Turso)

1. Check Vercel dashboard → Settings → Environment Variables
2. Ensure `TURSO_DATABASE_URL` is set for Production environment
3. Redeploy the project

### Tables Not Created

**PostgreSQL:**
```bash
psql $DATABASE_URL < init-schema-postgres.sql
```

**Turso:**
```bash
turso db shell scurrydb < init-schema.sql
```

### Connection Errors

**PostgreSQL:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

**Turso:**
```bash
turso db shell scurrydb
.tables
.exit
```

---

## Environment Variables Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| DATABASE_URL | For Postgres | `postgres://user:pass@host:5432/db` | PostgreSQL connection string |
| TURSO_DATABASE_URL | For Turso | `libsql://db.turso.io` | Turso connection URL |
| TURSO_AUTH_TOKEN | For Turso | `eyJh...` | Turso authentication token |
| ENCRYPTION_KEY | Yes | `openssl rand -base64 32` | For encrypting connection passwords |
| APP_DB_PATH | No | `./data/scurrydb.db` | Local SQLite path (dev only) |

---

## Migrating Between Databases

### SQLite to PostgreSQL

```bash
# Export from SQLite
sqlite3 data/scurrydb.db .dump > backup.sql

# Convert SQLite dump to PostgreSQL (manual adjustments needed)
# - Change INTEGER to BOOLEAN for boolean columns
# - Change TEXT dates to TIMESTAMPTZ
# - Remove SQLite-specific syntax

# Import to PostgreSQL
psql $DATABASE_URL < backup-converted.sql
```

### SQLite to Turso

```bash
# Export from local SQLite
sqlite3 data/scurrydb.db .dump > backup.sql

# Import to Turso
turso db shell scurrydb < backup.sql
```

---

## Security Best Practices

1. **Never commit credentials** - Already configured in `.gitignore`
2. **Use separate databases** for development/staging/production
3. **Rotate tokens regularly** for Turso
4. **Use SSL connections** for PostgreSQL (enabled by default)

---

## Cost Comparison

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| SQLite | Free (self-hosted) | Development |
| Turso | 8 GB, 1B reads | Serverless, Vercel |
| Neon | 512 MB, always free | Serverless PostgreSQL |
| Supabase | 500 MB | Feature-rich PostgreSQL |
| Vercel Postgres | 256 MB | Vercel integration |

---

## Getting Help

- **ScurryDB Issues:** https://github.com/mfirdausazizi/scurrydb/issues
- **Turso Docs:** https://docs.turso.tech
- **Neon Docs:** https://neon.tech/docs
- **Vercel Docs:** https://vercel.com/docs
