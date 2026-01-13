# 🚀 ModelMix - Vercel Deployment Ready!

**Status:** ✅ Production-ready, Lovable-free, multi-provider support

---

## Quick Deploy (3 Commands)

```bash
# 1. Setup
npm run setup

# 2. Edit .env with your credentials
nano .env

# 3. Deploy everything
npm run deploy
```

**That's it!** Your app will be live on Vercel in ~5 minutes.

---

## What You're Deploying

### Architecture
```
Vercel (Frontend)
   ↓
Supabase Edge Functions (Backend)
   ↓
OpenAI/Anthropic/Google APIs (AI)
   ↓
PostgreSQL (Supabase Database)
```

### Features Included
- ✅ Multi-model AI comparison (OpenAI, Anthropic, Google, etc.)
- ✅ User authentication (email/password)
- ✅ Credit system with daily refresh
- ✅ Admin dashboard
- ✅ Analytics tracking
- ✅ Rate limiting
- ✅ Abuse detection
- ✅ Real-time updates
- ✅ Mobile responsive

---

## Prerequisites

### Required Accounts (All Free Tier)
1. **Supabase** - https://supabase.com/dashboard
2. **Vercel** - https://vercel.com/signup
3. **OpenAI** - https://platform.openai.com/api-keys

### Required Tools
```bash
# Install globally
npm install -g vercel supabase
```

---

## Step-by-Step Guide

### 1. Supabase Setup

```bash
# Create project at https://supabase.com/dashboard
# Get credentials from Settings → API

# Link your local repo
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Push database schema
supabase db push
```

### 2. Environment Configuration

```bash
# Copy and edit .env
cp .env.example .env
nano .env
```

**Required values:**
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=xxxxx
OPENAI_API_KEY=sk-...
```

### 3. Deploy Edge Functions

```bash
# Deploy all functions at once
npm run deploy:functions

# Or individually
supabase functions deploy chat
supabase functions deploy credits
supabase functions deploy track-action
supabase functions deploy shadow-analyze
```

### 4. Set API Keys in Supabase

```bash
# Required
supabase secrets set OPENAI_API_KEY=sk-...

# Optional (for more models)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GOOGLE_API_KEY=AIza...
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
```

### 5. Deploy to Vercel

```bash
# First time
vercel

# Production
vercel --prod
```

### 6. Configure Vercel Environment Variables

**Via Dashboard:**
1. Go to https://vercel.com/dashboard
2. Click your project → Settings → Environment Variables
3. Add these (copy from your .env):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

**Via CLI:**
```bash
vercel env add VITE_SUPABASE_URL production
# Paste value when prompted
```

### 7. Create Admin User

**Sign up via your app:**
1. Visit your Vercel URL
2. Click "Sign Up"
3. Enter email/password
4. Verify email

**Promote to admin:**
```bash
# In Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)
# Copy/paste from scripts/create-admin.sql
```

Or use this quick command:
```sql
-- Replace with your email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'your@email.com';
```

---

## Automated Deployment Script

We've included a one-command deployment script:

```bash
./deploy-vercel.sh
```

**What it does:**
1. ✅ Checks for required CLIs
2. ✅ Validates environment configuration
3. ✅ Deploys edge functions
4. ✅ Sets Supabase secrets
5. ✅ Runs database migrations
6. ✅ Builds frontend
7. ✅ Deploys to Vercel

---

## Deployment Checklist

### Before First Deploy
- [ ] Supabase project created
- [ ] `.env` configured with all credentials
- [ ] Supabase CLI installed and linked
- [ ] Vercel CLI installed
- [ ] OpenAI API key obtained

### After Deployment
- [ ] Edge functions deployed successfully
- [ ] Database migrations run
- [ ] Vercel environment variables set
- [ ] App accessible at Vercel URL
- [ ] Admin user created
- [ ] Test chat functionality
- [ ] Verify credits system

---

## Testing Your Deployment

### 1. Test Authentication
```bash
# Visit your URL
# Click "Sign Up"
# Enter email/password
# Check email for verification
# Sign in
```

### 2. Test Chat
```bash
# Type: "Hello! Tell me about yourself."
# Click Send
# Should get response from GPT-4o-mini
```

### 3. Test Credits
```bash
# Click profile icon → Credits
# Should show:
#   - Balance: 500 (signup bonus)
#   - Transactions list
```

### 4. Test Admin Panel
```bash
# Click profile → Admin Dashboard
# Should see:
#   - Users tab
#   - Credits tab
#   - Analytics tab
```

---

## Cost Breakdown

### Free Tier Costs
```
Vercel:   $0/month (100GB bandwidth)
Supabase: $0/month (500MB database)
OpenAI:   ~$0.01-$0.10/day (usage-based)
──────────────────────────────────
Total:    ~$3-30/month (mostly OpenAI)
```

### Paid Tier (Recommended for Production)
```
Vercel Pro:      $20/month
Supabase Pro:    $25/month
OpenAI Usage:    $50-500/month
──────────────────────────────────
Total:           $95-545/month
```

---

## Scaling Considerations

### < 100 users
- ✅ Free tier works fine
- ✅ Use OpenAI only

### 100-1000 users
- ⚠️ Upgrade to Supabase Pro ($25/mo)
- ⚠️ Add Anthropic/Google keys for redundancy
- ⚠️ Monitor API costs

### 1000+ users
- 🔥 Upgrade Vercel to Pro ($20/mo)
- 🔥 Add Redis caching (Upstash)
- 🔥 Implement request queuing
- 🔥 Set up monitoring (Sentry)

---

## Monitoring & Maintenance

### Check Edge Function Logs
```bash
supabase functions logs chat --tail
```

### Check Database Usage
```sql
-- In Supabase SQL Editor
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monitor API Costs
```bash
# OpenAI: https://platform.openai.com/usage
# Anthropic: https://console.anthropic.com/usage
# Google: https://console.cloud.google.com/billing
```

---

## Troubleshooting

### "No AI providers configured"
```bash
# Check secrets
supabase secrets list

# Set if missing
supabase secrets set OPENAI_API_KEY=sk-...

# Redeploy
supabase functions deploy chat
```

### "Invalid credentials"
```bash
# Verify .env matches Supabase dashboard
cat .env

# Redeploy to Vercel
vercel --prod
```

### Database connection errors
```bash
# Check Supabase project status
# Dashboard → Project Settings → Database

# Verify connection string
supabase db remote status
```

### Build fails on Vercel
```bash
# Test build locally
npm run build

# Check for TypeScript errors
npm run lint
```

---

## Environment Variables Reference

### Frontend (.env + Vercel)
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=xxxxx
```

### Backend (Supabase Secrets)
```bash
# Required (at least one)
OPENAI_API_KEY=sk-...

# Optional
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
XAI_API_KEY=xai-...
MISTRAL_API_KEY=...
DEEPSEEK_API_KEY=...
OPENROUTER_API_KEY=sk-or-v1-...

# For emails
RESEND_API_KEY=re_...
```

---

## Custom Domain Setup

### Via Vercel Dashboard
1. Project → Settings → Domains
2. Add domain (e.g., modelmix.com)
3. Configure DNS:
   ```
   A     @       76.76.21.21
   CNAME www     cname.vercel-dns.com
   ```
4. Wait for SSL (automatic, ~1 hour)

### Update Supabase CORS
1. Supabase Dashboard → Settings → API
2. Add your domain to allowed origins

---

## Security Hardening

### Production Checklist
- [ ] Strong database password (16+ chars)
- [ ] API keys rotated every 90 days
- [ ] MFA enabled on Supabase account
- [ ] MFA enabled on Vercel account
- [ ] Email verification required
- [ ] Rate limiting enabled (automatic)
- [ ] RLS policies verified
- [ ] Backup strategy configured
- [ ] Error monitoring set up (Sentry)
- [ ] Uptime monitoring set up

---

## Next Steps After Deployment

1. **Branding**
   - Update logos in `public/`
   - Edit `index.html` metadata
   - Customize colors in `src/index.css`

2. **Content**
   - Update landing page (`src/pages/Landing.tsx`)
   - Write privacy policy (`src/pages/Privacy.tsx`)
   - Update terms of service (`src/pages/Terms.tsx`)

3. **Features**
   - Configure waitlist emails (Resend)
   - Set up analytics (Plausible/GA)
   - Add more AI providers
   - Implement model groups (admin feature)

4. **Marketing**
   - Share on Twitter/X
   - Post on Product Hunt
   - Write launch blog post

---

## Support

- **Quick Start:** See `QUICKSTART.md`
- **Full Deployment:** See `DEPLOYMENT.md`
- **Portability:** See `PORTABILITY.md`
- **Issues:** GitHub Issues
- **Supabase:** https://discord.supabase.com
- **Vercel:** https://vercel.com/support

---

## Success! 🎉

Your ModelMix deployment should now be live at:
**https://your-project.vercel.app**

Test it out:
1. Sign up
2. Send a message
3. See AI responses
4. Access admin panel

**You're ready to compare AI models!** 🚀
