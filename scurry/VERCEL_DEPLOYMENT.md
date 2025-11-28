# Vercel Deployment Guide for ScurryDB with Turso

## Quick Start (5 Minutes)

### Step 1: Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### Step 2: Create & Setup Turso Database

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

### Step 3: Add Environment Variables in Vercel

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

### Step 4: Deploy

```bash
git add .
git commit -m "Add Turso support"
git push origin main
```

Vercel will automatically deploy! ✨

---

## Detailed Instructions

### Option 1: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login
vercel login

# Link your project (if not already linked)
vercel link

# Add environment variables
vercel env add TURSO_DATABASE_URL production
# Paste: libsql://scurrydb-yourorg.turso.io

vercel env add TURSO_AUTH_TOKEN production  
# Paste your token

vercel env add ENCRYPTION_KEY production
# Paste: your-32-char-key

# Deploy
vercel --prod
```

### Option 2: Using Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Navigate to https://vercel.com/dashboard
   - Select your project (or import from GitHub)

2. **Settings → Environment Variables**
   - Click "Add New"
   - Add each variable one by one

3. **Redeploy**
   - Go to "Deployments" tab
   - Click "..." on the latest deployment
   - Select "Redeploy"

---

## Local Development Setup

You have two options for local development:

### Option A: Use Turso for Local Development Too

**.env.local:**
```bash
TURSO_DATABASE_URL=libsql://scurrydb-yourorg.turso.io
TURSO_AUTH_TOKEN=your-auth-token
ENCRYPTION_KEY=your-local-key
```

### Option B: Use SQLite Locally, Turso in Production (Recommended)

**.env.local:**
```bash
# Don't set TURSO variables - will use SQLite by default
ENCRYPTION_KEY=your-local-key
APP_DB_PATH=./data/scurrydb.db
```

The app will automatically use SQLite when Turso variables aren't set!

---

## Verification Checklist

After deployment, verify everything works:

- [ ] Visit your deployed URL
- [ ] Create a test user account  
- [ ] Login successfully
- [ ] Add a test database connection
- [ ] Run a test query
- [ ] Check Turso dashboard to see data:
  ```bash
  turso db shell scurrydb
  SELECT * FROM users;
  SELECT * FROM connections;
  .exit
  ```

---

## Troubleshooting

### Error: "TURSO_DATABASE_URL is not set"

**Solution:** 
1. Check Vercel dashboard → Settings → Environment Variables
2. Ensure `TURSO_DATABASE_URL` is set for Production environment
3. Redeploy the project

### Error: "Failed to connect to Turso"

**Solutions:**
1. Verify your database exists:
   ```bash
   turso db list
   ```

2. Check if token is valid:
   ```bash
   turso db tokens create scurrydb --expiration none
   ```

3. Make sure URL format is correct: `libsql://[db-name]-[org].turso.io`

### Tables Not Created

**Solution:** Initialize schema manually:
```bash
turso db shell scurrydb < init-schema.sql
```

### Local Development Not Working

**For Turso issues locally:**
```bash
# Test connection
turso db shell scurrydb
.tables
.exit
```

**For SQLite issues locally:**
```bash
# Ensure data directory exists
mkdir -p data

# Check if database file is created
ls -la data/
```

---

## Advanced: Environment-Specific Configuration

### Development Database

Create a separate database for development/preview:

```bash
# Create dev database
turso db create scurrydb-dev

# Get dev credentials
turso db show scurrydb-dev --url
turso db tokens create scurrydb-dev

# In Vercel: Set for Development & Preview only
TURSO_DATABASE_URL_DEV=libsql://scurrydb-dev-yourorg.turso.io
TURSO_AUTH_TOKEN_DEV=dev-token
```

### Multiple Environments

**Production:**
```bash
TURSO_DATABASE_URL=libsql://scurrydb-prod.turso.io
TURSO_AUTH_TOKEN=[prod-token]
```

**Preview/Staging:**
```bash
TURSO_DATABASE_URL=libsql://scurrydb-staging.turso.io
TURSO_AUTH_TOKEN=[staging-token]
```

---

## Migrating Existing Data

If you have existing SQLite data to migrate:

```bash
# Export from local SQLite
sqlite3 data/scurrydb.db .dump > backup.sql

# Import to Turso
turso db shell scurrydb < backup.sql

# Verify
turso db shell scurrydb
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM connections;
.exit
```

---

## Monitoring & Maintenance

### Check Database Usage

```bash
# View database info
turso db show scurrydb

# View usage stats
turso db usage scurrydb

# List all databases
turso db list
```

### Backup Your Database

```bash
# Export full database
turso db shell scurrydb .dump > backup-$(date +%Y%m%d).sql

# Or specific tables
turso db shell scurrydb << EOF
.output users-backup.sql
.dump users
.output sessions-backup.sql
.dump sessions
EOF
```

### Add Replicas (For Global Performance)

```bash
# Add replica in Sydney, Australia
turso db replicate scurrydb syd

# Add replica in Frankfurt, Germany  
turso db replicate scurrydb fra

# List replicas
turso db show scurrydb
```

---

## Cost Optimization

### Free Tier Limits
- ✅ 8 GB total storage
- ✅ 1 billion row reads/month
- ✅ Unlimited databases
- ✅ Up to 3 locations per database

### Tips to Stay Within Free Tier
1. Use indexes effectively (already configured in schema)
2. Implement pagination for large queries
3. Cache frequently accessed data
4. Clean up old sessions regularly

### Monitoring Usage

```bash
# Check current usage
turso db usage scurrydb

# View detailed metrics
turso db show scurrydb --http-url
# Then visit the URL in your browser
```

---

## Security Best Practices

### 1. Rotate Tokens Regularly

```bash
# Create new token
turso db tokens create scurrydb --expiration 7d

# Update in Vercel
vercel env rm TURSO_AUTH_TOKEN production
vercel env add TURSO_AUTH_TOKEN production
# Paste new token
```

### 2. Use Different Tokens for Different Environments

```bash
# Production token (long-lived)
turso db tokens create scurrydb --expiration none

# Development token (short-lived)
turso db tokens create scurrydb-dev --expiration 30d
```

### 3. Never Commit Tokens

Already configured in `.gitignore`:
```
.env.local
.env*.local
```

---

## Next Steps

Once deployed successfully:

1. ✅ Set up custom domain in Vercel
2. ✅ Enable analytics in Vercel dashboard
3. ✅ Set up monitoring/alerts for errors
4. ✅ Configure automatic deployments from GitHub
5. ✅ Add Turso replica in region closest to your users
6. ✅ Set up automated database backups

---

## Getting Help

- **Turso Docs:** https://docs.turso.tech
- **Turso Discord:** https://discord.gg/turso
- **Vercel Docs:** https://vercel.com/docs
- **ScurryDB Issues:** https://github.com/yourusername/scurrydb/issues

---

## Quick Reference

### Essential Commands

```bash
# Turso
turso auth login
turso db create <name>
turso db list
turso db show <name>
turso db shell <name>
turso db tokens create <name>

# Vercel  
vercel login
vercel link
vercel env add <KEY>
vercel --prod
vercel logs

# Database
turso db shell scurrydb < init-schema.sql
turso db shell scurrydb .dump > backup.sql
```

### Environment Variables Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| TURSO_DATABASE_URL | Yes (prod) | `libsql://db.turso.io` | From `turso db show` |
| TURSO_AUTH_TOKEN | Yes (prod) | `eyJh...` | From `turso db tokens create` |
| ENCRYPTION_KEY | Yes | `openssl rand -base64 32` | For encrypting connection passwords |
| APP_DB_PATH | No | `./data/scurrydb.db` | Local SQLite path (dev only) |
