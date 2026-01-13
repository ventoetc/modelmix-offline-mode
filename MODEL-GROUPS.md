# Model Groups & Tier Access Control

**Status:** ✅ Fully implemented (Database, Edge Functions, Admin UI)

**Purpose:** Give admins complete control over which AI models are available to different user tiers, with support for model grouping, cost optimization, and future persona pack functionality.

---

## Overview

The Model Groups feature provides:

1. **Tier-Based Access Control** - Define which models free, pro, and premium users can access
2. **Model Groups** - Organize models into logical groups (e.g., "free-tier", "efficient-pack")
3. **Cheapest Routing** - Automatically route to the most cost-effective API provider
4. **Persona Packs** - Framework for multi-model collaborative testing (schema ready, execution pending)

---

## Architecture

### Database Schema

#### `model_groups` Table
Defines named groups of models with optional pack configuration.

```sql
CREATE TABLE public.model_groups (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,           -- slug: "free-tier", "persona-team"
  display_name TEXT NOT NULL,          -- "Free Tier Models"
  description TEXT,                    -- Optional description
  is_pack BOOLEAN DEFAULT FALSE,       -- True for multi-model packs
  pack_strategy TEXT,                  -- 'parallel', 'sequential', 'voting', 'consensus'
  created_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);
```

**Examples:**
- `free-tier` - Fast, affordable models for free users
- `pro-tier` - High-quality models for pro users
- `tiny-models` - Ultra-fast small models (pack)
- `persona-team` - Multi-perspective analysis (pack)

#### `model_group_members` Table
Associates models with groups, with optional persona roles.

```sql
CREATE TABLE public.model_group_members (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES model_groups(id),
  model_id TEXT NOT NULL,              -- "openai/gpt-4o-mini"
  persona TEXT,                         -- Optional: "analyst", "critic", "creative"
  priority INTEGER DEFAULT 0,           -- Lower = higher priority (for fallback)
  created_at TIMESTAMPTZ
);
```

**Examples:**
- Free tier: `openai/gpt-4o-mini`, `deepseek/deepseek-chat`
- Persona team:
  - `openai/gpt-4o` (analyst)
  - `anthropic/claude-3.7-sonnet` (critic)
  - `google/gemini-1.5-pro` (creative)

#### `tier_model_access` Table
Controls which tiers can access which groups.

```sql
CREATE TABLE public.tier_model_access (
  id UUID PRIMARY KEY,
  tier TEXT NOT NULL,                   -- 'guest', 'free', 'pro', 'premium', 'admin'
  group_id UUID REFERENCES model_groups(id),
  can_access BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
);
```

**Access Matrix:**
| Tier | Guest Models | Free Models | Pro Models | Premium Models |
|------|-------------|-------------|-----------|---------------|
| Guest | ✅ | ❌ | ❌ | ❌ |
| Free | ✅ | ✅ | ❌ | ❌ |
| Pro | ✅ | ✅ | ✅ | ❌ |
| Premium | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |

#### `api_cost_preferences` Table
Defines the cheapest API provider for each model.

```sql
CREATE TABLE public.api_cost_preferences (
  id UUID PRIMARY KEY,
  model_id TEXT UNIQUE NOT NULL,
  preferred_provider TEXT NOT NULL,     -- 'openai', 'anthropic', 'openrouter'
  cost_per_1m_tokens DECIMAL(10, 4),   -- USD per 1M tokens
  notes TEXT,
  created_at TIMESTAMPTZ
);
```

**Examples:**
| Model | Preferred Provider | Cost/1M Tokens | Why |
|-------|-------------------|---------------|-----|
| `openai/gpt-4o-mini` | openai | $0.15 | Direct API cheapest |
| `anthropic/claude-3.5-haiku` | anthropic | $0.80 | Direct API cheapest |
| `meta-llama/llama-3.3-70b` | openrouter | $0.59 | Only via OpenRouter |

---

## Database Functions

### `get_user_tier(p_user_id, p_fingerprint)`
Determines user's tier based on authentication and roles.

**Returns:** `'guest' | 'free' | 'pro' | 'premium' | 'admin'`

**Logic:**
1. If user has admin role → `'admin'`
2. If user has pro subscription → `'pro'` (TODO: integrate payment system)
3. If authenticated → `'free'`
4. If fingerprint only → `'guest'`

### `can_user_access_model(p_model_id, p_user_id, p_fingerprint)`
Checks if user can access a specific model based on tier.

**Returns:** `BOOLEAN`

**Logic:**
1. Get user's tier
2. If admin → always `true`
3. Check if model exists in any group accessible by tier
4. Return whether access is granted

---

## Edge Function Integration

### Chat Function Changes (`supabase/functions/chat/index.ts`)

#### 1. Tier Access Control (Line 769-797)
```typescript
// Tier-based model access control (skip for admins)
if (!isAdmin) {
  const { data: canAccess } = await supabase.rpc('can_user_access_model', {
    p_model_id: selectedModel,
    p_user_id: userId,
    p_fingerprint: fingerprint
  });

  if (!canAccess) {
    const { data: userTier } = await supabase.rpc('get_user_tier', {
      p_user_id: userId,
      p_fingerprint: fingerprint
    });

    return new Response(
      JSON.stringify({
        error: "Model not available for your tier",
        tier: userTier,
        model: selectedModel,
        message: userTier === 'guest'
          ? "Please sign up for free to access more models."
          : "This model requires a higher tier. Upgrade to access premium models."
      }),
      { status: 403 }
    );
  }
}
```

#### 2. Cheapest API Routing (Line 937-948)
```typescript
// Query cheapest API provider for this model
let preferredProvider: string | undefined;
const { data: costPreference } = await supabase
  .from("api_cost_preferences")
  .select("preferred_provider, cost_per_1m_tokens")
  .eq("model_id", selectedModel)
  .maybeSingle();

if (costPreference) {
  preferredProvider = costPreference.preferred_provider;
  console.log(`Cheapest provider for ${selectedModel}: ${preferredProvider} ($${costPreference.cost_per_1m_tokens}/1M tokens)`);
}
```

#### 3. Provider Router Update (`supabase/functions/chat/providers.ts`)
Modified `route()` method to accept optional `preferredProvider`:

```typescript
async route(
  options: StreamOptions,
  preferredProvider?: string
): Promise<{ response: Response; provider: string }> {
  // If a preferred provider is specified (for cheapest routing), try it first
  if (preferredProvider) {
    const preferred = this.providers.find(
      (p) => p.getName().toLowerCase() === preferredProvider.toLowerCase()
    );

    if (preferred && preferred.supportsModel(options.model)) {
      console.log(`Using preferred provider ${preferred.getName()} for ${options.model} (cheapest)`);
      try {
        const response = await preferred.chat(options);
        return { response, provider: `${preferred.getName()} (cheapest)` };
      } catch (error) {
        // Fallback to normal routing
      }
    }
  }

  // Continue with normal provider iteration...
}
```

---

## Admin UI

### Location
**Admin Dashboard → Configuration → Model Groups**

### Features

#### 1. Group Management
- **Create Group** - Define new model group with name, display name, description
- **Pack Configuration** - Mark as pack, choose strategy (parallel, sequential, voting, consensus)
- **Delete Group** - Remove group and all associations

#### 2. Model Management
- **Add Model** - Add model to group with optional persona and priority
- **Remove Model** - Remove model from group
- **Priority Control** - Set fallback order (lower = higher priority)

#### 3. Tier Access Control
- **Toggle Access** - Click tier buttons to grant/revoke access
- **Visual Indicators** - Active tiers shown with primary color
- **Quick Overview** - See which tiers can access each group

#### 4. Cost Preferences
- **Add Preference** - Define cheapest provider for each model
- **Cost Tracking** - Record cost per 1M tokens for reference
- **Provider Selection** - Choose from OpenAI, Anthropic, Google, xAI, Mistral, DeepSeek, OpenRouter

---

## Default Configuration

### Seeded Groups

**1. guest-tier**
- Display: "Guest Models"
- Models: `openai/gpt-4o-mini`, `deepseek/deepseek-chat`
- Access: Guest only
- Purpose: Minimal free access for anonymous users

**2. free-tier**
- Display: "Free Tier Models"
- Models: `openai/gpt-4o-mini`, `anthropic/claude-3.5-haiku`, `google/gemini-2.0-flash`, `deepseek/deepseek-chat`
- Access: Free, Pro, Premium, Admin
- Purpose: Standard free user access

**3. pro-tier**
- Display: "Pro Models"
- Models: `openai/gpt-4o`, `anthropic/claude-3.7-sonnet`, `google/gemini-1.5-pro`, `x-ai/grok-2`
- Access: Pro, Premium, Admin
- Purpose: High-quality models for paying users

**4. premium-tier**
- Display: "Premium Models"
- Models: `openai/o1`, `openai/o3-mini`, `anthropic/claude-opus-4`
- Access: Premium, Admin
- Purpose: Cutting-edge models for premium users

**5. tiny-models** (Pack)
- Display: "Tiny Model Pack"
- Strategy: `parallel`
- Models:
  - `openai/gpt-4o-mini` (quick-responder)
  - `anthropic/claude-3.5-haiku` (detail-checker)
  - `deepseek/deepseek-chat` (cost-optimizer)
- Access: Free, Pro, Premium, Admin
- Purpose: Fast parallel responses from small models

**6. efficient-pack** (Pack)
- Display: "Efficient Pack"
- Strategy: `sequential`
- Models:
  - `openai/gpt-4o-mini` (primary)
  - `google/gemini-2.0-flash` (fallback)
- Access: Free, Pro, Premium, Admin
- Purpose: Best price/performance with fallback

**7. persona-team** (Pack)
- Display: "Persona Team"
- Strategy: `consensus`
- Models:
  - `openai/gpt-4o` (analyst)
  - `anthropic/claude-3.7-sonnet` (critic)
  - `google/gemini-1.5-pro` (creative)
- Access: Pro, Premium, Admin
- Purpose: Multi-perspective analysis

---

## Persona Pack Execution (Future Implementation)

### Status
**Database schema:** ✅ Complete
**Admin UI:** ✅ Complete
**Execution logic:** ⚠️ Not yet implemented

### Why Not Implemented Yet?
Persona pack execution requires significant changes to streaming architecture:

1. **Streaming Complexity** - Current system streams from single model
2. **Response Aggregation** - Need to combine multiple streaming responses
3. **Credit Calculation** - Must track usage across multiple models
4. **Error Handling** - One model failure shouldn't fail entire pack

### Implementation Options

#### Option 1: Separate Pack Endpoint
Create `supabase/functions/chat-pack/index.ts`:
- Non-streaming responses
- Sequential or parallel model calls
- Aggregate responses before returning
- Simpler implementation

```typescript
// Pseudo-code
async function executePack(groupId, messages) {
  const members = await getPackMembers(groupId);
  const strategy = await getPackStrategy(groupId);

  if (strategy === 'parallel') {
    const responses = await Promise.all(
      members.map(m => callModel(m.model_id, withPersona(messages, m.persona)))
    );
    return aggregateParallel(responses);
  }

  if (strategy === 'sequential') {
    let context = messages;
    for (const member of members) {
      const response = await callModel(member.model_id, context);
      context = [...context, response];
    }
    return context;
  }

  // voting, consensus strategies...
}
```

#### Option 2: Frontend Orchestration
Let frontend handle packs:
- Query pack members from DB
- Make multiple `/chat` requests
- Aggregate in frontend
- Display side-by-side or synthesized

#### Option 3: Streaming Aggregation
Advanced implementation:
- Server-sent events for each model
- Client receives interleaved streams
- Display real-time multi-model responses
- Most complex but best UX

### Pack Strategies

#### `parallel`
Send same prompt to all models simultaneously, return all responses.

**Use case:** Quick comparison, diverse perspectives
**Credit cost:** Sum of all models
**Example:** Tiny Models pack - get 3 fast responses

#### `sequential`
Each model builds on previous model's response.

**Use case:** Iterative refinement, progressive analysis
**Credit cost:** Sum of all models
**Example:** Draft → Review → Polish

#### `voting`
All models respond, select best response by vote (similarity/quality metrics).

**Use case:** Quality assurance, consensus building
**Credit cost:** Sum of all models (only return 1)
**Example:** Get 5 responses, return most consistent

#### `consensus`
Models debate until reaching agreement.

**Use case:** Complex decision-making, thorough analysis
**Credit cost:** Variable (multiple rounds)
**Example:** Analyst vs Critic vs Creative reach consensus

---

## Use Cases

### 1. Freemium Model
```
Guest → 2 cheap models (gpt-4o-mini, deepseek)
Free → 4 models (add haiku, gemini-flash)
Pro → 8 models (add gpt-4o, claude-sonnet, gemini-pro, grok)
Premium → All models (add o1, o3, claude-opus)
```

### 2. Cost Optimization
Admin sets cost preferences:
- OpenAI models → Direct OpenAI API (cheapest)
- Meta models → OpenRouter (only option)
- Anthropic models → Direct when possible

System automatically routes to cheapest provider.

### 3. A/B Testing
Create group "experimental-models" with bleeding-edge models.
Grant access to "tester" tier only.
Monitor usage, quality, cost.

### 4. Custom Workflows (Future)
**Code review pack:**
- `openai/gpt-4o` (reviewer)
- `deepseek/deepseek-r1` (security-checker)
- `anthropic/claude-3.7-sonnet` (documentation-suggester)

**Content creation pack:**
- `google/gemini-1.5-pro` (draft-writer)
- `openai/gpt-4o` (editor)
- `anthropic/claude-opus-4` (final-polish)

---

## Admin Workflows

### Restrict Free Users to Cheapest Models
1. Go to Model Groups
2. Edit "free-tier" group
3. Remove expensive models (gpt-4o, claude-sonnet)
4. Add only: gpt-4o-mini, deepseek-chat, gemini-2.0-flash
5. Set cost preferences to prefer direct APIs

### Create VIP Tier
1. Create new group "vip-tier"
2. Add premium models: o1, o3, claude-opus-4
3. Create custom tier "vip" in tier_model_access table
4. Grant user VIP role in user_roles table

### Test New Model
1. Add to "admin" group only
2. Test functionality, quality, cost
3. If good → add to pro-tier
4. If great → promote to free-tier

### Monitor Costs
1. Go to API Cost Preferences
2. Review cost per 1M tokens
3. Identify expensive models
4. Restrict to higher tiers
5. Update preferred providers if better pricing available

---

## Migration Guide

### From Lovable AI

**Before:**
- Hard-coded FREE_MODELS list
- All users access same models
- No tier differentiation

**After:**
- Dynamic model groups
- Tier-based access control
- Flexible configuration

**Migration steps:**
1. Run migration: `supabase db push`
2. Seeded groups auto-created
3. All existing users get "free" tier
4. Admins get full access
5. Adjust groups as needed

---

## Security Considerations

### RLS Policies
- ✅ All tables have row-level security enabled
- ✅ Anyone can read groups, members, access rules (needed for frontend)
- ✅ Only admins can modify (INSERT, UPDATE, DELETE)
- ✅ Admin check: `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')`

### Access Control
- ✅ Tier checks happen server-side in edge function
- ✅ Cannot bypass by modifying frontend
- ✅ Even if user guesses model ID, access check blocks them

### Cost Protection
- ✅ Expensive models restricted to paying tiers
- ✅ Cheapest routing reduces costs for admin
- ✅ Credit system already tracks usage

---

## API Reference

### RPC Functions

#### `get_user_tier(p_user_id UUID, p_fingerprint TEXT)`
```sql
SELECT public.get_user_tier(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,
  'fp_abc123'
);
-- Returns: 'free'
```

#### `can_user_access_model(p_model_id TEXT, p_user_id UUID, p_fingerprint TEXT)`
```sql
SELECT public.can_user_access_model(
  'openai/o1',
  '123e4567-e89b-12d3-a456-426614174000'::UUID,
  NULL
);
-- Returns: false (if user is not premium/admin)
```

### Database Queries

#### Get all models accessible by a tier
```sql
SELECT DISTINCT mgm.model_id
FROM model_group_members mgm
JOIN tier_model_access tma ON tma.group_id = mgm.group_id
WHERE tma.tier = 'free'
  AND tma.can_access = true
ORDER BY mgm.model_id;
```

#### Get user's accessible models
```sql
SELECT DISTINCT mgm.model_id, mg.display_name as group_name
FROM model_group_members mgm
JOIN model_groups mg ON mg.id = mgm.group_id
JOIN tier_model_access tma ON tma.group_id = mgm.group_id
WHERE tma.tier = (
  SELECT public.get_user_tier('USER_ID'::UUID, NULL)
)
AND tma.can_access = true
ORDER BY mgm.model_id;
```

#### Get pack details
```sql
SELECT
  mg.name,
  mg.pack_strategy,
  json_agg(
    json_build_object(
      'model_id', mgm.model_id,
      'persona', mgm.persona,
      'priority', mgm.priority
    ) ORDER BY mgm.priority
  ) as members
FROM model_groups mg
JOIN model_group_members mgm ON mgm.group_id = mg.id
WHERE mg.is_pack = true
GROUP BY mg.id, mg.name, mg.pack_strategy;
```

---

## Troubleshooting

### Issue: User can't access model they should have access to

**Check:**
1. User's tier: `SELECT public.get_user_tier(USER_ID, NULL);`
2. Model in any group: `SELECT * FROM model_group_members WHERE model_id = 'MODEL_ID';`
3. Tier access: `SELECT * FROM tier_model_access WHERE tier = 'USER_TIER' AND can_access = true;`

**Fix:**
- Add model to appropriate group
- Grant tier access to group
- Verify user has correct tier/role

### Issue: Routing to wrong provider

**Check:**
1. Cost preferences: `SELECT * FROM api_cost_preferences WHERE model_id = 'MODEL_ID';`
2. Edge function logs: `supabase functions logs chat --tail`

**Fix:**
- Update preferred_provider in api_cost_preferences
- Verify API key is set: `supabase secrets list`

### Issue: Admin UI not showing groups

**Check:**
1. RLS policies enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. User is admin: `SELECT * FROM user_roles WHERE user_id = auth.uid();`

**Fix:**
- Grant admin role: `INSERT INTO user_roles (user_id, role) VALUES (USER_ID, 'admin');`

---

## Next Steps

### Immediate
- ✅ Database schema complete
- ✅ Edge function integration complete
- ✅ Admin UI complete
- ✅ Tier access control working
- ✅ Cheapest routing active

### Short-term
- [ ] Test with real users across different tiers
- [ ] Monitor cost savings from cheapest routing
- [ ] Collect feedback on model availability

### Long-term
- [ ] Implement persona pack execution
- [ ] Add subscription/payment integration for tier upgrades
- [ ] Create frontend UI for users to see their available models
- [ ] Add analytics: which models are most used per tier
- [ ] Implement dynamic pricing based on usage patterns

---

## Support

**Documentation:**
- Database schema: `supabase/migrations/20260105000001_add_model_groups.sql`
- Edge function: `supabase/functions/chat/index.ts` (lines 769-797, 937-961)
- Provider router: `supabase/functions/chat/providers.ts` (lines 413-461)
- Admin UI: `src/components/admin/ModelGroupsManager.tsx`

**Admin Access:**
1. Sign up at your deployment URL
2. Run SQL: `INSERT INTO user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email = 'YOUR@EMAIL.COM';`
3. Navigate to Admin → Configuration → Model Groups

**Questions?**
- Check logs: `supabase functions logs chat --tail`
- Query database: Supabase SQL Editor
- Test access: Use `can_user_access_model` RPC function

---

**Version:** 1.0.0
**Last Updated:** 2026-01-05
**Status:** Production-ready (excluding persona pack execution)
