# 🚀 Getting Started: Deploy ScurryDB to Vercel

**Welcome!** This guide will help you deploy ScurryDB to Vercel using Turso (SQLite-compatible serverless database).

---

## 🎯 What You'll Get

- ✅ ScurryDB running on Vercel (serverless, auto-scaling)
- ✅ Turso database (SQLite-compatible, 8GB free)
- ✅ HTTPS enabled automatically
- ✅ Global CDN for fast access worldwide
- ✅ $0 cost on free tiers

**Time Required:** 10 minutes  
**Cost:** Free

---

## 📋 Quick Start (Choose One)

### Option 1: Automated Setup (Recommended) ⚡

```bash
# Run the setup script
cd scurry
./scripts/setup-turso.sh
```

The script will:
1. Install Turso CLI (if needed)
2. Create and initialize your database
3. Generate all required credentials
4. Show you exactly what to add to Vercel

**Then:** Follow the on-screen instructions to add environment variables to Vercel.

### Option 2: Manual Setup 🛠️

Follow the **detailed step-by-step guide**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** | Step-by-step deployment checklist (recommended) |
| **[README_TURSO.md](./README_TURSO.md)** | Quick overview of Turso integration |
| **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** | Complete deployment documentation |
| **[TURSO_SETUP.md](./TURSO_SETUP.md)** | Detailed Turso setup guide |

---

## 🔑 Required Environment Variables

You'll need to add these to Vercel:

```bash
TURSO_DATABASE_URL=libsql://scurrydb-yourorg.turso.io
TURSO_AUTH_TOKEN=eyJh...your-token...
ENCRYPTION_KEY=your-32-character-encryption-key
```

**How to get these:**
- Run `./scripts/setup-turso.sh` (automated)
- Or follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) (manual)

---

## ⚡ 60-Second Quickstart

If you already have Turso installed:

```bash
# 1. Create database
turso db create scurrydb

# 2. Initialize schema
turso db shell scurrydb < init-schema.sql

# 3. Get credentials
echo "TURSO_DATABASE_URL=$(turso db show scurrydb --url)"
echo "TURSO_AUTH_TOKEN=$(turso db tokens create scurrydb --expiration none)"

# 4. Generate encryption key
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
```

**Then:** Add these 3 variables to Vercel → Deploy!

---

## 🎬 Video Tutorial (Coming Soon)

We're working on a video walkthrough. For now, follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md).

---

## ❓ Common Questions

### Q: Why Turso instead of regular SQLite?

**A:** Vercel's serverless functions can't write to files. Turso is SQLite-compatible but designed for serverless environments.

### Q: Can I use SQLite locally and Turso in production?

**A:** Yes! Just don't set `TURSO_DATABASE_URL` locally. The app will automatically use SQLite for local development.

### Q: What if I already have data in SQLite?

**A:** You can migrate:
```bash
sqlite3 data/scurrydb.db .dump > backup.sql
turso db shell scurrydb < backup.sql
```

### Q: Is Turso free?

**A:** Yes! Free tier includes:
- 8 GB storage
- 1 billion row reads/month
- Unlimited databases
- Up to 3 global locations

### Q: How do I monitor usage?

```bash
turso db usage scurrydb
turso db show scurrydb
```

### Q: Can I add global replicas for better performance?

**A:** Yes!
```bash
turso db replicate scurrydb syd  # Sydney
turso db replicate scurrydb fra  # Frankfurt
```

---

## 🛟 Need Help?

### Something Not Working?

1. Check [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - troubleshooting section
2. Verify environment variables in Vercel dashboard
3. Check Vercel deployment logs: `vercel logs`
4. Test Turso connection: `turso db shell scurrydb`

### Still Stuck?

- **📖 Turso Docs:** https://docs.turso.tech
- **📖 Vercel Docs:** https://vercel.com/docs  
- **💬 Turso Discord:** https://discord.gg/turso
- **🐛 GitHub Issues:** Open an issue in your repo

---

## ✅ Verification Steps

After deployment, verify everything works:

1. **Visit your Vercel URL**
   - [ ] Landing page loads
   - [ ] Can create an account
   - [ ] Can login

2. **Test Database Features**
   - [ ] Add a database connection
   - [ ] Run a test query
   - [ ] View results

3. **Check Turso**
   ```bash
   turso db shell scurrydb
   SELECT * FROM users;
   .exit
   ```
   - [ ] User data appears in Turso

---

## 🎉 Success!

Once deployed, you'll have:

- 🌍 **Global deployment** on Vercel's edge network
- 🗄️ **Serverless SQLite** database with Turso
- 🔒 **Automatic HTTPS** with SSL certificates
- 📊 **Database management** interface accessible anywhere
- 🤖 **AI-powered** query generation (if configured)
- 👥 **Team collaboration** features ready to use

---

## 🚀 Next Steps

1. **Customize your deployment:**
   - Add custom domain
   - Configure AI providers (OpenAI, Anthropic)
   - Set up global replicas

2. **Invite your team:**
   - Create team workspaces
   - Share database connections
   - Collaborate on queries

3. **Optimize performance:**
   - Add Turso replicas in your users' regions
   - Enable Vercel Analytics
   - Set up monitoring

---

## 📖 Full Documentation

For complete documentation on all features, see:

- **Main README:** [`../README.md`](../README.md)
- **PRD:** [`../PRD.md`](../PRD.md)

---

**Ready to deploy?** Start with [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)!

Happy deploying! 🐿️
