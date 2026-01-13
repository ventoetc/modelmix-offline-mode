# ModelMix Deployment Guide

## Overview

ModelMix is now a **vendor-neutral, Lovable-free** AI comparison platform that supports:
- ✅ Direct API access to OpenAI, Anthropic, Google, xAI, Mistral, DeepSeek
- ✅ OpenRouter as unified gateway or fallback
- ✅ Flexible provider routing with automatic fallback
- ✅ Self-hosted with Supabase + Vercel/similar platforms

---

## Architecture

```
Frontend (React/Vite) → Supabase Edge Functions → AI Providers
                     ↓
                  PostgreSQL (Supabase)
```

**Provider Routing:**
1. Checks for direct API key (e.g., OPENAI_API_KEY for openai/gpt-4o)
2. Falls back to OpenRouter if configured
3. Returns error if no provider available

---

## Prerequisites

- Node.js 18+ (for frontend development)
- Supabase account (free tier works)
- At least ONE API key from:
  - OpenRouter (recommended - covers 200+ models)
  - OpenAI, Anthropic, Google, xAI, Mistral, or DeepSeek

---

## Option A: Deploy to Vercel + Supabase (Recommended)

### 1. Supabase Setup

```bash
# 1. Create a Supabase project at https://supabase.com
# 2. Note your project URL and anon key

# 3. Install Supabase CLI
npm install -g supabase

# 4. Link to your project
supabase link --project-ref your-project-ref

# 5. Push database migrations
supabase db push

# 6. Deploy edge functions
supabase functions deploy chat
supabase functions deploy credits
supabase functions deploy track-action
supabase functions deploy shadow-analyze
# ... deploy other functions as needed

# 7. Set environment secrets
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-your-key
supabase secrets set OPENAI_API_KEY=sk-your-key  # Optional
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key  # Optional
supabase secrets set GOOGLE_API_KEY=AIza-your-key  # Optional
supabase secrets set RESEND_API_KEY=re_your-key  # For emails
```

### 2. Frontend Deployment to Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Build the frontend
npm run build

# 3. Deploy to Vercel
vercel

# 4. Set environment variables in Vercel Dashboard:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
# VITE_SUPABASE_PROJECT_ID=your-project-id

# 5. Redeploy with production settings
vercel --prod
```

### 3. Configure Custom Domain (Optional)

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Enable HTTPS (automatic with Vercel)

---

## Option B: Self-Hosted (Docker + Supabase Self-Hosted)

### 1. Clone Supabase Self-Hosted

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env

# Edit .env with your settings
nano .env

# Start Supabase
docker-compose up -d
```

### 2. Deploy ModelMix

```bash
# 1. Build frontend
cd /path/to/modelmix
npm install
npm run build

# 2. Serve with nginx or similar
# Example nginx config:
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/modelmix/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 3. Configure environment
# Create /path/to/modelmix/dist/config.js:
window.ENV = {
    VITE_SUPABASE_URL: 'http://localhost:8000',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'your-anon-key'
};

# 4. Deploy edge functions to self-hosted Supabase
supabase functions deploy --project-ref localhost
```

---

## Environment Variables Reference

### Frontend (.env)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=xurujhesittlojxfpvjl
```

### Edge Functions (Supabase Secrets)

```bash
# At least ONE of these is required:
OPENROUTER_API_KEY=sk-or-v1-...     # Recommended
OPENAI_API_KEY=sk-...               # Optional - for direct OpenAI access
ANTHROPIC_API_KEY=sk-ant-...        # Optional - for direct Anthropic access
GOOGLE_API_KEY=AIza...              # Optional - for direct Google access
XAI_API_KEY=xai-...                 # Optional - for direct xAI access
MISTRAL_API_KEY=...                 # Optional - for direct Mistral access
DEEPSEEK_API_KEY=...                # Optional - for direct DeepSeek access

# Required for emails:
RESEND_API_KEY=re_...
```

---

## Provider Configuration Strategies

### Strategy 1: OpenRouter Only (Simplest)

**Pros:** One key for 200+ models, simple setup
**Cons:** Slightly higher costs than direct APIs

```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
```

**Models available:** All OpenRouter models

---

### Strategy 2: Direct APIs Only

**Pros:** Best rates, full control
**Cons:** Need multiple keys, more setup

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GOOGLE_API_KEY=AIza...
```

**Models available:** Only from configured providers

---

### Strategy 3: Hybrid (Recommended)

**Pros:** Direct access for primary models + fallback for others
**Cons:** More complex config

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...  # Fallback
```

**Routing logic:**
- OpenAI models → OPENAI_API_KEY → fallback to OPENROUTER_API_KEY
- Anthropic models → ANTHROPIC_API_KEY → fallback to OPENROUTER_API_KEY
- Other models (Llama, Qwen, etc.) → OPENROUTER_API_KEY

---

## Post-Deployment Configuration

### 1. Create Admin User

```sql
-- In Supabase SQL Editor
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-user-uuid', 'admin');
```

### 2. Configure Credit Multipliers

```sql
-- Update credit costs (optional)
UPDATE public.credit_config
SET value = 150
WHERE key = 'multiplier_pro';

UPDATE public.credit_config
SET value = 250
WHERE key = 'multiplier_premium';
```

### 3. Set Daily Refresh Amount

```sql
-- Give users 100 free credits daily
UPDATE public.credit_config
SET value = 100
WHERE key = 'daily_refresh';
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check edge function health
curl https://your-project.supabase.co/functions/v1/chat \
  -X OPTIONS

# Check database connection
psql -h db.your-project.supabase.co -U postgres -d postgres
```

### View Logs

```bash
# Supabase edge function logs
supabase functions logs chat --tail

# Database logs
# Go to Supabase Dashboard → Logs → Database
```

### Monitor Usage

```sql
-- Total API calls by provider
SELECT
  metadata->>'provider' as provider,
  COUNT(*) as calls,
  SUM(prompt_tokens + completion_tokens) as total_tokens
FROM usage_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider;

-- Credit usage by user
SELECT
  user_id,
  balance,
  lifetime_spent,
  lifetime_earned
FROM user_credits
ORDER BY lifetime_spent DESC
LIMIT 10;
```

---

## Troubleshooting

### "No AI providers configured" Error

**Cause:** No API keys set in edge function secrets

**Fix:**
```bash
# Set at least one key
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...

# Restart edge functions
supabase functions deploy chat
```

### "Provider routing failed" Error

**Cause:** Model requested but no matching API key

**Fix:**
- Add direct API key for that provider, OR
- Add OPENROUTER_API_KEY as fallback, OR
- Update frontend to hide unavailable models

### Rate Limit Errors

**Cause:** Edge function `.single()` bug with new users

**Status:** Fixed in this version (uses `.maybeSingle()`)

### High Credit Usage

**Check:**
```sql
SELECT * FROM credit_config;
```

**Adjust multipliers:**
```sql
UPDATE credit_config SET value = 100 WHERE key = 'multiplier_flash';
UPDATE credit_config SET value = 140 WHERE key = 'multiplier_pro';
UPDATE credit_config SET value = 200 WHERE key = 'multiplier_premium';
```

---

## Scaling Recommendations

### < 100 users
- Supabase Free Tier
- Vercel Hobby Plan
- OpenRouter API

### 100-1000 users
- Supabase Pro ($25/mo)
- Vercel Pro ($20/mo)
- Direct API keys + OpenRouter fallback

### 1000+ users
- Supabase Team/Enterprise
- Vercel Enterprise
- Full direct API access
- Redis caching layer
- Load balancer

---

## Security Checklist

- [ ] Enable RLS on all tables (done in migrations)
- [ ] Set strong database password
- [ ] Configure rate limiting properly
- [ ] Enable MFA for Supabase/Vercel accounts
- [ ] Set up monitoring/alerting
- [ ] Regular database backups
- [ ] API key rotation policy
- [ ] Audit abuse reports weekly

---

## Cost Estimation

### Infrastructure (Monthly)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Supabase | 500MB DB, 5GB bandwidth | $25/mo Pro |
| Vercel | 100GB bandwidth | $20/mo Pro |
| **Total** | **$0** | **$45/mo** |

### AI API Costs (per 1M tokens)

| Provider | Flash Models | Pro Models | Premium Models |
|----------|--------------|------------|----------------|
| OpenAI | $0.15-0.60 | $2.50-10 | $15-60 |
| Anthropic | $0.25-1.00 | $3.00-15 | - |
| Google | $0.075-0.30 | $1.25-7 | - |
| OpenRouter | +20% markup | +20% markup | +20% markup |

### Example Usage Cost

- 1000 users
- 10 questions/day average
- 500 tokens/response average
- Mixed model usage

**Monthly:** ~$500-1500 in API costs

---

## Migration from Lovable

If migrating from Lovable-hosted version:

1. Export data from Lovable database
2. Import to your Supabase instance
3. Update all API keys
4. Test with staging deployment first
5. Gradual traffic migration

**Note:** Lovable AI models (gemini-2.5-*, gpt-5-*) are not available outside Lovable. Use real model IDs instead.

---

## Support & Community

- **Issues:** https://github.com/your-repo/modelmix/issues
- **Docs:** https://your-docs-site.com
- **Discord:** https://discord.gg/your-server

---

## License

[Your License Here]

---

**Last Updated:** January 5, 2026
**Version:** 2.0.0 (Lovable-free)
