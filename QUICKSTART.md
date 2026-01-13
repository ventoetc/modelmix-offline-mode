# ModelMix Quick Start Guide

**Goal:** Get ModelMix running on Vercel with OpenAI in < 15 minutes

---

## Prerequisites

- GitHub account
- Supabase account (free tier: https://supabase.com)
- Vercel account (free tier: https://vercel.com)
- OpenAI API key (https://platform.openai.com/api-keys)

---

## Step 1: Supabase Setup (5 min)

### 1.1 Create Supabase Project

```bash
# Visit https://supabase.com/dashboard
# Click "New Project"
# Name: modelmix
# Database Password: [generate strong password]
# Region: [choose closest to you]
# Click "Create new project"
```

### 1.2 Get Your Credentials

While project is being created:

1. Go to **Project Settings** → **API**
2. Copy these values:
   ```
   Project URL:     https://xxxxx.supabase.co
   anon/public key: eyJhbGci...
   Project ID:      xxxxx
   ```

### 1.3 Link Your Local Project

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID
```

---

## Step 2: Configure Environment (2 min)

### 2.1 Create .env File

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

### 2.2 Fill in .env

```bash
# From Supabase dashboard
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=xxxxx

# Your API keys
OPENAI_API_KEY=sk-...
```

---

## Step 3: Deploy Database & Functions (3 min)

### 3.1 Run Database Migrations

```bash
# Push schema to Supabase
supabase db push
```

This creates:
- ✅ User authentication tables
- ✅ Credit system tables
- ✅ Analytics tables
- ✅ Admin roles table

### 3.2 Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy chat
supabase functions deploy credits
supabase functions deploy track-action
supabase functions deploy shadow-analyze
```

### 3.3 Set Secrets in Supabase

```bash
# Required: OpenAI key
supabase secrets set OPENAI_API_KEY=sk-...

# Optional: Other providers
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
```

---

## Step 4: Deploy to Vercel (3 min)

### 4.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 4.2 Deploy

```bash
# First time: will prompt for project setup
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: modelmix
# - Directory: ./
# - Override settings? No

# Deploy to production
vercel --prod
```

### 4.3 Set Environment Variables in Vercel

```bash
# Option A: Via CLI
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
vercel env add VITE_SUPABASE_PROJECT_ID production

# Option B: Via Dashboard
# 1. Visit https://vercel.com/dashboard
# 2. Click your project → Settings → Environment Variables
# 3. Add:
#    VITE_SUPABASE_URL = https://xxxxx.supabase.co
#    VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGci...
#    VITE_SUPABASE_PROJECT_ID = xxxxx
```

### 4.4 Redeploy

```bash
# Redeploy with env vars
vercel --prod
```

---

## Step 5: Create Admin User (2 min)

### 5.1 Sign Up via UI

1. Visit your Vercel URL (e.g., https://modelmix-xyz.vercel.app)
2. Click "Sign Up"
3. Enter email and password
4. Verify email (check inbox)

### 5.2 Promote to Admin

```bash
# Go to Supabase SQL Editor
# Visit: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

# Run this query (replace with your email):
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

# Copy the user ID, then run:
INSERT INTO public.user_roles (user_id, role)
VALUES ('PASTE-USER-ID-HERE', 'admin');
```

### 5.3 Verify Admin Access

1. Refresh your app
2. Click profile icon → Admin Dashboard
3. You should see admin panel ✅

---

## Step 6: Test Everything (1 min)

### 6.1 Test Chat

1. Go to main page
2. Type: "Hello! Can you explain what you are?"
3. Click Send
4. Should get response from GPT-4o-mini ✅

### 6.2 Check Credits

1. Click profile icon → Credits
2. You should see:
   - Balance: 500 credits (signup bonus)
   - Lifetime earned: 500
   - Lifetime spent: ~10 (from test message)

### 6.3 Test Admin Panel

1. Go to Admin Dashboard
2. Click "Users" tab
3. You should see your user ✅
4. Click "Credits" tab
5. You should see credit transactions ✅

---

## Troubleshooting

### "No AI providers configured"

**Problem:** Edge functions can't find API keys

**Fix:**
```bash
# Verify secrets are set
supabase secrets list

# If not there, set them:
supabase secrets set OPENAI_API_KEY=sk-...

# Redeploy function
supabase functions deploy chat
```

---

### "Unauthorized" or "Invalid API key"

**Problem:** Frontend can't connect to Supabase

**Fix:**
```bash
# Verify .env matches Supabase dashboard
cat .env

# Redeploy to Vercel with correct env vars
vercel env add VITE_SUPABASE_URL production
# Paste value when prompted

vercel --prod
```

---

### "Row Level Security" errors

**Problem:** RLS policies blocking access

**Fix:**
```sql
-- In Supabase SQL Editor, verify RLS is enabled:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All tables should have rowsecurity = true
-- If not, run:
supabase db push
```

---

### Chat not working

**Problem:** Edge function errors

**Fix:**
```bash
# Check logs
supabase functions logs chat --tail

# Common issues:
# 1. API key not set
# 2. Typo in API key
# 3. API key expired

# Re-set key:
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## Optional: Configure Custom Domain

### Via Vercel Dashboard

1. Go to Project → Settings → Domains
2. Add your domain (e.g., modelmix.com)
3. Follow DNS instructions
4. Wait for SSL cert (automatic)

### Update Supabase CORS

```sql
-- In Supabase SQL Editor:
-- This is usually automatic, but if needed:
-- Add your domain to allowed origins in Supabase dashboard
-- Settings → API → CORS
```

---

## What You Get

### Free Tier Limits

**Vercel:**
- ✅ 100 GB bandwidth/month
- ✅ Unlimited requests
- ✅ Auto SSL
- ✅ Global CDN

**Supabase:**
- ✅ 500 MB database
- ✅ 5 GB bandwidth
- ✅ 2 GB file storage
- ✅ 50,000 monthly active users

**OpenAI:**
- ⚠️ Pay per use (~$0.15-$0.60 per 1M tokens)
- Typical user: $0.01-0.10/day

---

## Scaling Up

### When to upgrade:

**Vercel Pro ($20/mo)** - When you need:
- More bandwidth (1 TB)
- Team collaboration
- Better analytics

**Supabase Pro ($25/mo)** - When you need:
- More database space (8 GB)
- More bandwidth (250 GB)
- Daily backups
- Better support

**Estimated costs for 1,000 users:**
- Vercel: $20/mo
- Supabase: $25/mo
- OpenAI API: $100-500/mo (usage-based)
- **Total: $145-545/mo**

---

## Next Steps

1. **Customize branding** - Edit `index.html`, logos
2. **Set up analytics** - Add Plausible/Google Analytics
3. **Configure email** - Set up Resend for waitlist
4. **Add models** - Configure Anthropic, Google keys
5. **Test thoroughly** - Invite beta testers
6. **Set up monitoring** - Add Sentry for errors

---

## Support

- **Issues:** Create GitHub issue
- **Supabase:** https://discord.supabase.com
- **Vercel:** https://vercel.com/support

---

## Security Checklist

Before going public:

- [ ] Strong database password set
- [ ] API keys rotated regularly
- [ ] HTTPS enabled (Vercel automatic)
- [ ] RLS enabled on all tables (automatic)
- [ ] Rate limiting configured (automatic)
- [ ] Email verification enabled
- [ ] Admin accounts secured
- [ ] Secrets not in git
- [ ] Monitoring set up
- [ ] Backups configured

---

**Estimated Total Time:** 15 minutes

**Next:** You're live! 🎉

Visit your Vercel URL and start comparing AI models!
