# 🚀 Vercel + Turso Deployment Checklist

Use this checklist to deploy ScurryDB to Vercel with Turso in under 10 minutes!

## ☐ Prerequisites (2 min)

- [ ] Have a Vercel account (free tier works!)
- [ ] Have GitHub/GitLab/Bitbucket account with your ScurryDB repo
- [ ] Terminal access

## ☐ Step 1: Install Turso CLI (1 min)

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Or with Homebrew:
```bash
brew install tursodatabase/tap/turso
```

- [ ] Turso CLI installed
- [ ] Run `turso --version` to verify

## ☐ Step 2: Run Setup Script (2 min)

```bash
cd scurry
./scripts/setup-turso.sh
```

The script will:
- [ ] Prompt you to login to Turso
- [ ] Create a new database (or use existing)
- [ ] Initialize the database schema
- [ ] Generate database URL and auth token
- [ ] Show you what environment variables to add

**Save the output!** You'll need:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

## ☐ Step 3: Generate Encryption Key (30 sec)

```bash
openssl rand -base64 32
```

- [ ] Copy the generated key
- [ ] Save it as `ENCRYPTION_KEY`

## ☐ Step 4: Connect Vercel (2 min)

### Option A: Vercel Dashboard (Easiest)

1. [ ] Go to https://vercel.com/dashboard
2. [ ] Click "Add New Project"
3. [ ] Import your GitHub repository
4. [ ] Click "Deploy" (it will fail - that's okay!)

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
```

## ☐ Step 5: Add Environment Variables (3 min)

### Via Vercel Dashboard:

1. [ ] Go to your project on Vercel
2. [ ] Settings → Environment Variables
3. [ ] Add these three variables:

   **TURSO_DATABASE_URL**
   - [ ] Value: `libsql://scurrydb-yourorg.turso.io`
   - [ ] Environment: ✓ Production ✓ Preview ✓ Development

   **TURSO_AUTH_TOKEN**
   - [ ] Value: `eyJh...your-token`
   - [ ] Environment: ✓ Production ✓ Preview ✓ Development
   - [ ] Sensitive: ✓

   **ENCRYPTION_KEY**
   - [ ] Value: (from Step 3)
   - [ ] Environment: ✓ Production ✓ Preview ✓ Development
   - [ ] Sensitive: ✓

### Via Vercel CLI:

```bash
vercel env add TURSO_DATABASE_URL production
# Paste your database URL

vercel env add TURSO_AUTH_TOKEN production
# Paste your auth token

vercel env add ENCRYPTION_KEY production
# Paste your encryption key
```

- [ ] All 3 environment variables added
- [ ] Checked "Production", "Preview", and "Development" for each

## ☐ Step 6: Deploy (1 min)

### Via GitHub (Automatic):

```bash
git add .
git commit -m "Add Turso configuration"
git push origin main
```

- [ ] Code pushed to GitHub
- [ ] Vercel automatically starts deploying
- [ ] Wait for deployment to complete (~2-3 min)

### Via Vercel CLI (Manual):

```bash
vercel --prod
```

- [ ] Deployment started
- [ ] Deployment URL received

## ☐ Step 7: Verify Deployment (2 min)

### Test Your Deployed App:

- [ ] Open your Vercel deployment URL
- [ ] Landing page loads correctly
- [ ] Click "Get Started Now"
- [ ] Create a test account
- [ ] Login successful
- [ ] Dashboard loads

### Test Database Connection:

- [ ] Add a test database connection (MySQL/PostgreSQL/SQLite)
- [ ] Connection saves successfully
- [ ] Run a test query (e.g., `SELECT 1;`)
- [ ] Results display correctly

### Verify Data in Turso:

```bash
turso db shell scurrydb
SELECT * FROM users;
SELECT * FROM connections;
.exit
```

- [ ] User account appears in Turso
- [ ] Connection appears in Turso

## ☐ Step 8: Optional Enhancements (5 min)

### Add Custom Domain:

- [ ] Vercel Dashboard → Settings → Domains
- [ ] Add your domain (e.g., `scurrydb.yourdomain.com`)
- [ ] Update DNS records as instructed
- [ ] Wait for SSL certificate (~1 min)

### Add Global Replicas (for better performance):

```bash
# Add replica in Sydney, Australia
turso db replicate scurrydb syd

# Add replica in Frankfurt, Germany
turso db replicate scurrydb fra

# View all replicas
turso db show scurrydb
```

- [ ] Replicas added in regions close to your users

### Set up Monitoring:

- [ ] Enable Vercel Analytics
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)

## ☐ Step 9: Security Checklist

- [ ] Environment variables are set as "Sensitive" in Vercel
- [ ] `.env.local` is in `.gitignore` (already done)
- [ ] No secrets committed to git
- [ ] Turso auth token has appropriate expiration (or none for production)
- [ ] Strong encryption key used (32+ characters)

## ☐ Step 10: Documentation

- [ ] Update your team with the deployment URL
- [ ] Document how to access the app
- [ ] Share database access instructions
- [ ] Set up backup schedule (if needed)

---

## 🎉 Deployment Complete!

Your ScurryDB is now live on Vercel with Turso!

### What You Have:

- ✅ Serverless SQLite database (Turso)
- ✅ Global CDN deployment (Vercel)
- ✅ Automatic HTTPS with SSL
- ✅ User authentication
- ✅ Multi-database support
- ✅ AI-powered query generation (if configured)
- ✅ Team collaboration features

### Deployment URL:

```
https://your-project.vercel.app
```

Or your custom domain:
```
https://scurrydb.yourdomain.com
```

---

## 📊 Usage Monitoring

### Check Vercel Usage:

- Vercel Dashboard → Analytics
- View deployment logs: `vercel logs`

### Check Turso Usage:

```bash
# View database info
turso db show scurrydb

# View usage stats
turso db usage scurrydb

# Check free tier limits
turso db list
```

---

## 🛠️ Troubleshooting

### Deployment Failed?

1. [ ] Check Vercel build logs
2. [ ] Verify all environment variables are set
3. [ ] Try redeploying: Deployments → ... → Redeploy

### Can't Connect to Database?

1. [ ] Verify `TURSO_DATABASE_URL` is correct
2. [ ] Verify `TURSO_AUTH_TOKEN` is valid
3. [ ] Test Turso connection:
   ```bash
   turso db shell scurrydb
   ```

### Schema Not Initialized?

```bash
turso db shell scurrydb < init-schema.sql
```

### Need to Rotate Secrets?

```bash
# Generate new encryption key
openssl rand -base64 32

# Create new Turso token
turso db tokens create scurrydb

# Update in Vercel
vercel env rm ENCRYPTION_KEY production
vercel env add ENCRYPTION_KEY production

vercel env rm TURSO_AUTH_TOKEN production
vercel env add TURSO_AUTH_TOKEN production

# Redeploy
vercel --prod
```

---

## 📚 Resources

- **TURSO_SETUP.md** - Detailed Turso setup guide
- **VERCEL_DEPLOYMENT.md** - Complete deployment documentation
- **README_TURSO.md** - Turso integration overview
- [Turso Docs](https://docs.turso.tech)
- [Vercel Docs](https://vercel.com/docs)

---

## 🎯 Next Steps

- [ ] Invite team members
- [ ] Configure AI providers (OpenAI, Anthropic, Ollama)
- [ ] Set up database replicas in your users' regions
- [ ] Configure automated backups
- [ ] Set up monitoring and alerts
- [ ] Add custom domain and branding
- [ ] Star the repo on GitHub! ⭐

---

**Total Time:** ~10 minutes  
**Cost:** $0 (Free tier for both Vercel and Turso)  
**Difficulty:** Easy 🟢

Happy querying! 🐿️
