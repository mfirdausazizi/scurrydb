# Turso Setup Guide for ScurryDB on Vercel

This guide will walk you through setting up Turso as your SQLite-compatible database for deployment on Vercel.

## Prerequisites

- A Turso account (sign up at https://turso.tech)
- Turso CLI installed
- Your ScurryDB project ready to deploy

## Step 1: Install Turso CLI

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Or using Homebrew
brew install tursodatabase/tap/turso
```

## Step 2: Login to Turso

```bash
turso auth login
```

## Step 3: Create a Turso Database

```bash
# Create a new database called 'scurrydb'
turso db create scurrydb

# Get your database URL
turso db show scurrydb --url
# Output example: libsql://scurrydb-yourname.turso.io

# Create an auth token
turso db tokens create scurrydb
# Output: Your auth token (keep this secret!)
```

## Step 4: Initialize Your Database Schema

You have two options:

### Option A: Use Turso CLI to execute schema

1. Save your schema SQL to a file (already exists in your project as init-schema.sql - we'll create this)
2. Execute it:

```bash
turso db shell scurrydb < init-schema.sql
```

### Option B: Connect and manually create tables

```bash
turso db shell scurrydb
# Then paste your CREATE TABLE statements
```

## Step 5: Add Environment Variables to Vercel

### Via Vercel Dashboard:

1. Go to your project on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

   **TURSO_DATABASE_URL**
   - Value: `libsql://scurrydb-yourname.turso.io` (from step 3)
   - Environment: Production, Preview, Development (check all)

   **TURSO_AUTH_TOKEN**
   - Value: Your auth token (from step 3)
   - Environment: Production, Preview, Development (check all)
   - Mark as **Sensitive** ✓

   **ENCRYPTION_KEY** (if not already set)
   - Value: A random 32-character string
   - Environment: Production, Preview, Development
   - Mark as **Sensitive** ✓

### Via Vercel CLI:

```bash
# Pull your environment variables locally
vercel env pull .env.development.local

# Add Turso variables
vercel env add TURSO_DATABASE_URL
# Paste your database URL when prompted

vercel env add TURSO_AUTH_TOKEN
# Paste your auth token when prompted
```

## Step 6: Update Your Local Environment

Create `.env.local` in your project root:

```bash
# Turso Configuration
TURSO_DATABASE_URL=libsql://scurrydb-yourname.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here

# Encryption key for connection passwords
ENCRYPTION_KEY=your-32-character-encryption-key

# Optional: For local development, you can keep using SQLite
# Just comment out the TURSO variables above
```

## Step 7: Deploy to Vercel

```bash
# Deploy
vercel deploy --prod

# Or just push to your main branch if you have automatic deployments
git push origin main
```

## Verification

After deployment:

1. Visit your deployed app
2. Try creating a user account
3. Try adding a database connection
4. Check your Turso dashboard to verify data is being saved:

```bash
turso db shell scurrydb
# Then run:
SELECT * FROM users;
SELECT * FROM connections;
```

## Hybrid Setup (Recommended for Development)

You can use SQLite locally and Turso in production:

**Local (.env.local):**
```bash
# Comment out Turso variables to use local SQLite
# TURSO_DATABASE_URL=...
# TURSO_AUTH_TOKEN=...
ENCRYPTION_KEY=your-local-key
```

**Production (Vercel Dashboard):**
```bash
TURSO_DATABASE_URL=libsql://scurrydb-yourname.turso.io
TURSO_AUTH_TOKEN=your-token
ENCRYPTION_KEY=your-production-key
```

## Turso Features

### Replicas (Optional)

Create read replicas closer to your users:

```bash
# Create a replica in Sydney, Australia
turso db replicate scurrydb syd

# List all replicas
turso db show scurrydb
```

### Monitoring

Check database usage:

```bash
# View database stats
turso db show scurrydb

# View query logs
turso db shell scurrydb .dump
```

## Troubleshooting

### "TURSO_DATABASE_URL is not set"
- Make sure you've added the environment variable in Vercel
- Redeploy your app after adding variables

### Connection Errors
- Verify your auth token is correct
- Check that your database URL is correct
- Ensure the database exists: `turso db list`

### Schema Not Initialized
- Run the schema initialization script
- Or use the Turso CLI to manually create tables

### Local Development Issues
- For local dev, you can keep using SQLite by not setting TURSO variables
- The app will automatically fall back to better-sqlite3

## Migrating Existing Data

If you have existing SQLite data:

```bash
# Export from SQLite
sqlite3 data/scurrydb.db .dump > backup.sql

# Import to Turso
turso db shell scurrydb < backup.sql
```

## Cost

Turso free tier includes:
- 8 GB of total storage
- 1 billion row reads per month
- Unlimited databases
- Up to 3 locations

Perfect for most applications!

## Additional Resources

- Turso Documentation: https://docs.turso.tech
- Turso Quickstart for TypeScript: https://docs.turso.tech/sdk/ts/quickstart
- Turso Platform: https://turso.tech/app
