# Using ScurryDB with Turso on Vercel

ScurryDB now supports **Turso**, a SQLite-compatible serverless database that works perfectly with Vercel!

## Why Turso?

- ✅ **SQLite Compatible** - Keep using all your SQLite queries
- ✅ **Serverless-Friendly** - Works perfectly with Vercel's serverless functions
- ✅ **Edge-Native** - Deploy globally with replicas
- ✅ **Generous Free Tier** - 8GB storage, 1B reads/month
- ✅ **No Code Changes Required** - Just environment variables

## Quick Start (2 Commands)

```bash
# 1. Run the setup script
./scripts/setup-turso.sh

# 2. Follow the on-screen instructions to add env vars to Vercel
```

That's it! 🎉

## Manual Setup

If you prefer to set up manually:

### 1. Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
```

### 2. Create & Initialize Database

```bash
# Create database
turso db create scurrydb

# Initialize schema
turso db shell scurrydb < init-schema.sql

# Get credentials
turso db show scurrydb --url
turso db tokens create scurrydb
```

### 3. Add to Vercel

In your Vercel project dashboard (Settings → Environment Variables):

```
TURSO_DATABASE_URL=libsql://scurrydb-yourorg.turso.io
TURSO_AUTH_TOKEN=eyJh...your-token...
ENCRYPTION_KEY=your-32-character-key
```

### 4. Deploy

```bash
git push origin main
```

## How It Works

ScurryDB automatically detects Turso:

- **With Turso**: If `TURSO_DATABASE_URL` is set → uses Turso
- **Without Turso**: Falls back to local SQLite

This means:
- 🏠 **Local Development** → SQLite (fast, simple)
- ☁️ **Production (Vercel)** → Turso (serverless, scalable)

## Environment Setup

### Local Development (.env.local)

```bash
# Option A: Use SQLite locally (recommended)
ENCRYPTION_KEY=your-dev-key
# Don't set TURSO variables

# Option B: Use Turso locally too
TURSO_DATABASE_URL=libsql://scurrydb-dev.turso.io
TURSO_AUTH_TOKEN=your-dev-token
ENCRYPTION_KEY=your-dev-key
```

### Production (Vercel Dashboard)

```bash
TURSO_DATABASE_URL=libsql://scurrydb-prod.turso.io
TURSO_AUTH_TOKEN=your-prod-token
ENCRYPTION_KEY=your-prod-key
```

## Verifying Your Setup

After deploying, check if it works:

```bash
# Check your database
turso db shell scurrydb

# View tables
.tables

# Check data
SELECT * FROM users;
SELECT * FROM connections;

# Exit
.exit
```

## Common Tasks

### View Database Info

```bash
turso db show scurrydb
```

### Backup Your Data

```bash
turso db shell scurrydb .dump > backup.sql
```

### Migrate Existing SQLite Data

```bash
# Export from local SQLite
sqlite3 data/scurrydb.db .dump > export.sql

# Import to Turso
turso db shell scurrydb < export.sql
```

### Add Global Replicas

```bash
# Add replica in Sydney
turso db replicate scurrydb syd

# Add replica in Frankfurt
turso db replicate scurrydb fra

# View all replicas
turso db show scurrydb
```

### Monitor Usage

```bash
turso db usage scurrydb
```

## Troubleshooting

### "TURSO_DATABASE_URL is not set" Error

1. Check Vercel dashboard → Settings → Environment Variables
2. Make sure variables are set for **Production** environment
3. Redeploy your application

### Connection Errors

```bash
# Verify database exists
turso db list

# Test connection
turso db shell scurrydb
.tables
.exit

# Regenerate token if needed
turso db tokens create scurrydb --expiration none
```

### Schema Not Created

```bash
# Re-initialize schema
turso db shell scurrydb < init-schema.sql
```

## Cost & Limits

### Free Tier (More than enough for most apps!)

- ✅ 8 GB total storage
- ✅ 1 billion row reads per month
- ✅ Unlimited databases
- ✅ Up to 3 locations per database

### Typical ScurryDB Usage

For a team of 10 users:
- **Storage**: < 100 MB (well within 8 GB)
- **Reads**: ~10M reads/month (1% of limit)

You'll likely never need to upgrade! 🎉

## Architecture

```
┌─────────────┐
│   Vercel    │
│  (Serverless)│
└──────┬──────┘
       │
       │ TURSO_DATABASE_URL
       │ TURSO_AUTH_TOKEN
       ▼
┌─────────────┐      ┌─────────────┐
│   Turso     │─────▶│  Replica    │
│  (Primary)  │      │   (Sydney)  │
└─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  Replica    │
                     │ (Frankfurt) │
                     └─────────────┘
```

## Security Best Practices

1. **Never commit tokens**
   - ✅ Already configured in `.gitignore`
   - ✅ Use Vercel environment variables

2. **Rotate tokens regularly**
   ```bash
   turso db tokens create scurrydb --expiration 30d
   ```

3. **Use different databases for environments**
   - `scurrydb-prod` for production
   - `scurrydb-dev` for development

4. **Enable token expiration** (for non-production)
   ```bash
   turso db tokens create scurrydb-dev --expiration 7d
   ```

## Documentation

- 📖 **Detailed Setup**: See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- 📖 **Turso Docs**: https://docs.turso.tech
- 📖 **Turso TypeScript SDK**: https://docs.turso.tech/sdk/ts/quickstart
- 📖 **Vercel Deployment**: https://vercel.com/docs

## Support

- **Turso Discord**: https://discord.gg/turso
- **Turso Platform**: https://turso.tech/app
- **ScurryDB Issues**: [GitHub Issues](https://github.com/yourusername/scurrydb/issues)

## FAQ

**Q: Do I need to change any code?**  
A: No! Just set environment variables and deploy.

**Q: Can I use SQLite locally and Turso in production?**  
A: Yes! Don't set TURSO variables locally, and it'll use SQLite.

**Q: What about existing data?**  
A: Export from SQLite and import to Turso (see "Migrate Existing SQLite Data" above).

**Q: Is Turso really free?**  
A: Yes! 8GB storage and 1B reads/month on the free tier.

**Q: How fast is Turso?**  
A: Very fast! Especially with replicas close to your users (sub-10ms latency).

**Q: Can I self-host?**  
A: Turso is managed, but it's built on libSQL which is open-source.

---

Made with ❤️ for developers who love SQLite
