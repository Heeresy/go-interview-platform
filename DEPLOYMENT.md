# 🚀 Deployment Guide — GO Interview Platform

## Prerequisites

- [ ] GitHub account (code repository)
- [ ] Vercel account (hosting)
- [ ] Supabase project (database)
- [ ] OpenRouter API key (AI evaluation)

---

## Step 1: Prepare Your Repository

### 1.1 Create GitHub Repository

```bash
# Initialize git if not done
git init

# Add all files
git add .

# First commit
git commit -m "feat: initial GO Interview Platform setup"

# Create repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/go-interview-platform.git
git branch -M main
git push -u origin main
```

### 1.2 Add Required Secrets to GitHub

Go to: **Settings → Secrets and variables → Actions**

Add these secrets (they'll be used by CI/CD):
```
VERCEL_TOKEN          # Get from Vercel account settings
VERCEL_ORG_ID         # Get from Vercel project settings
VERCEL_PROJECT_ID     # Get from Vercel project settings
```

---

## Step 2: Deploy to Vercel

### 2.1 Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Select "Import Git Repository"
4. Connect your GitHub account
5. Select `go-interview-platform` repository

### 2.2 Configure Environment Variables in Vercel

In Vercel dashboard, go to **Settings → Environment Variables**

Add these for each environment (Production, Preview, Development):

```
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_key>
OPENROUTER_API_KEY=<your_openrouter_key>
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
```

### 2.3 Deploy

```bash
# Manually trigger deploy
npm run build  # Test locally first

# Then push to main
git push origin main
```

Vercel will automatically build and deploy!

---

## Step 3: Verify Deployment

### 3.1 Check Vercel Dashboard

- [ ] Build succeeded
- [ ] All checks passed
- [ ] Domain is accessible

### 3.2 Test Application

```bash
# Visit your deployed site
https://your-project.vercel.app

# Test main flows:
- [ ] Homepage loads
- [ ] Can view questions
- [ ] Can answer questions
- [ ] Can view tasks
- [ ] Can execute code
```

### 3.3 Monitor Logs

In Vercel dashboard:
- Go to **Deployments**
- Click on active deployment
- Check **Logs** tab for any errors

---

## Continuous Integration/Deployment

### How CI/CD Works

1. **On Push to `main`:**
   - GitHub Actions runs (see `.github/workflows/ci-cd.yml`)
   - Linting & formatting checks
   - Type checking
   - Build verification
   - If all pass → Vercel auto-deploys

2. **On Pull Requests:**
   - Same checks run (linting, types, build)
   - Must pass before merging
   - Vercel creates preview deployment

3. **Manual Deployment:**
   ```bash
   # Force rebuild in Vercel dashboard
   # Or push again to main
   ```

---

## Local Development

### Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/go-interview-platform.git
cd go-interview-platform

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your keys

# Run dev server
npm run dev
```

### Before Pushing

```bash
# Check for linting errors
npm run lint

# Fix formatting
npm run format

# Type check
npm run type-check

# Build
npm run build

# Run locally
npm start
```

---

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] Supabase migrations applied
- [ ] Database is configured
- [ ] OpenRouter API working
- [ ] Vercel deployment successful
- [ ] HTTPS enabled (automatic)
- [ ] Custom domain set (if desired)
- [ ] Analytics configured (optional)
- [ ] Error tracking setup (optional)

---

## Monitoring & Maintenance

### Vercel Dashboard

- **Deployments**: See all deployment history
- **Logs**: View build and runtime logs
- **Analytics**: Monitor Core Web Vitals
- **Integrations**: Manage connected services

### GitHub Actions

- **Actions tab**: See CI/CD pipeline status
- **Workflow runs**: Check what failed/passed
- **Logs**: Debug build issues

### Supabase

- **Project settings**: Manage database
- **Logs**: See database operations
- **Backup**: Enable automatic backups

---

## Troubleshooting

### Build Failed

```bash
# Check logs in Vercel
# Common issues:
# 1. Missing environment variables
# 2. TypeScript errors
# 3. Import errors

# Fix and push:
git add .
git commit -m "fix: resolve build errors"
git push origin main
```

### Runtime Errors

Check Vercel **Logs** tab or browser console:
```bash
# If database errors:
# - Verify Supabase credentials
# - Check RLS policies
# - Verify tables exist

# If AI errors:
# - Check OpenRouter key is valid
# - Verify API quota not exceeded

# If code execution errors:
# - Test Piston API directly
# - Check Go version compatibility
```

### Performance Issues

```bash
# Check Lighthouse scores in Vercel Analytics
# Optimize:
# - Run npm run lint
# - Run npm run build --analyze
# - Check bundle size
```

---

## Rollback

If deployment breaks production:

```bash
# In Vercel dashboard:
# 1. Go to Deployments
# 2. Click on previous stable deployment
# 3. Click "Promote to Production"
```

Or via git:
```bash
# Revert last commit
git revert HEAD
git push origin main

# Vercel will auto-deploy previous version
```

---

## Security

- [ ] Never commit `.env.local`
- [ ] Use Vercel environment variables (encrypted)
- [ ] Enable branch protection in GitHub
- [ ] Review pull requests before merge
- [ ] Keep dependencies updated: `npm audit`
- [ ] Monitor security alerts

---

## Next Steps

1. **Setup CI/CD pipeline** (this page)
2. **Configure Vercel** (auto-deploy)
3. **Add monitoring** (error tracking, analytics)
4. **Setup backups** (Supabase)
5. **Configure custom domain** (DNS)
6. **Add SSL certificate** (automatic via Vercel)

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **GitHub Actions**: https://docs.github.com/en/actions
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Status**: ✅ Ready to deploy!

Next: Configure Vercel environment variables and push to GitHub.

