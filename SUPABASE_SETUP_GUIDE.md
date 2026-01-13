# Supabase New Project Setup Guide

This guide will help you set up a fresh Supabase project for ModelMix with BYOK support.

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- New Supabase project created at https://supabase.com/dashboard

## Step 1: Gather Your New Project Credentials

After creating a new Supabase project, collect these values from the dashboard:

**From Settings → API:**
- **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
- **Project Reference ID**: `YOUR_PROJECT_ID` (the part before .supabase.co)
- **anon/public key**: `YOUR_ANON_KEY` (long JWT token)

## Step 2: Update Configuration Files

### File 1: `.env`
Replace the following values:
```env
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ANON_KEY"
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
```

### File 2: `supabase/config.toml`
Update line 1:
```toml
project_id = "YOUR_PROJECT_ID"
```

## Step 3: Deploy Database Schema

Run these commands in your terminal:

```bash
# Navigate to project directory
cd /path/to/modelmix

# Login to Supabase (opens browser)
supabase login

# Link to your new project
supabase link --project-ref YOUR_PROJECT_ID

# Push all database migrations (24 migration files)
supabase db push
```

## Step 4: Set Environment Variables in Supabase Dashboard

Go to: Dashboard → Edge Functions → Configuration (or Settings)

Add these environment variables (click "Add new secret" for each):

**Required API Keys** (for non-BYOK users):
```
OPENAI_API_KEY=sk-proj-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
GOOGLE_API_KEY=xxxxx
OPENROUTER_API_KEY=sk-or-xxxxx
XAI_API_KEY=xxxxx
MISTRAL_API_KEY=xxxxx
DEEPSEEK_API_KEY=xxxxx
```

**Note:** These are fallback keys. BYOK users provide their own keys via the UI.

## Step 5: Deploy Edge Functions

Deploy all Edge Functions with BYOK support:

```bash
# Deploy all at once
supabase functions deploy chat
supabase functions deploy credits
supabase functions deploy track-action
supabase functions deploy shadow-analyze

# Or use the npm script
npm run deploy:functions
```

**Critical Functions:**
- **chat** - Main AI routing with BYOK bypass logic (tier restriction fix)
- **credits** - Credit management system
- **track-action** - Usage analytics
- **shadow-analyze** - Performance analytics

## Step 6: Set Up Admin Access

Give yourself admin privileges:

### Option A: Table Editor
1. Dashboard → Table Editor → `users` table
2. Find user with email: `charles@vento.cc`
3. Set: `is_admin = true` and `is_tester = true`

### Option B: SQL Editor
```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'charles@vento.cc';

-- Update users table (replace USER_ID with actual ID from above)
UPDATE public.users
SET is_admin = true, is_tester = true
WHERE id = 'USER_ID';
```

## Step 7: Verify Deployment

1. **Check version in app:**
   - Open app → Settings drawer
   - Bottom should show: "Version 0.1.0 - BYOK Update"

2. **Test BYOK functionality:**
   - Settings → Bring Your Own Key section
   - Add OpenAI key (starts with `sk-proj-` or `sk-`)
   - Click checkmark icon to test
   - Should see ✅ "Verified" (NOT tier errors!)

3. **Test chat:**
   - Select any model from the catalog (150+ models available with BYOK)
   - Send test message
   - Should work without tier restrictions

## Troubleshooting

### If BYOK still shows tier errors:
- Verify Edge Functions are deployed (Dashboard → Edge Functions)
- Check function logs for errors (Edge Functions → chat → Logs)
- Look for: `"BYOK mode: Bypassing tier check"` in logs
- Ensure environment variables are set

### If database migration fails:
- Check SQL error message
- Migrations are in order by timestamp
- You may need to reset database: `supabase db reset`

### If functions won't deploy:
- Check Supabase CLI is logged in: `supabase login`
- Verify project is linked: `supabase link --project-ref YOUR_PROJECT_ID`
- Check function code for syntax errors

## What Got Fixed in v0.1.0

**BYOK Implementation:**
- ✅ Users can add their own API keys via Settings
- ✅ Keys are verified before use
- ✅ Tier restrictions bypassed for BYOK users
- ✅ Credit system bypassed for BYOK users
- ✅ Full model catalog available (150+ models)
- ✅ Session persistence across refreshes
- ✅ Version number display for deployment verification

**Backend Changes (supabase/functions/chat/index.ts):**
- Line 703-704: BYOK mode detection
- Line 786-815: Tier check bypass for BYOK
- Line 864-884: Credit account skip for BYOK
- Line 886-895: Credit checks bypass
- Line 1058: Zero credit charges for BYOK
- Line 1087-1105: BYOK usage logging for analytics

## Files Modified

- `package.json` - Version bumped to 0.1.0
- `src/components/ApiKeyManager.tsx` - BYOK key management UI
- `src/components/SettingsDrawer.tsx` - BYOK section + version display
- `src/pages/ModelMix.tsx` - BYOK tier detection, session persistence
- `src/components/ChatPanel.tsx` - Model swap on error
- `src/components/ExportDialog.tsx` - Super summary steering
- `supabase/functions/chat/index.ts` - BYOK bypass logic (critical!)

## Quick Reference

**Project Info:**
- Branch: `claude/implement-byok-temporary-7pz4M`
- Version: `0.1.0`
- Update Name: "BYOK Update"

**Key Features:**
- BYOK (Bring Your Own Key) support
- API key verification
- Tier restriction bypass for BYOK
- Session persistence
- Version display

---

**Ready to proceed?** Follow the steps above in order and test at each stage!
