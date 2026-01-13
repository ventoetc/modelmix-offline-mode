-- Model Groups & Tier Access Control
-- Allows admins to specify which models are available to different user tiers
-- Enables model packs (tiny models, efficient models, persona teams)

-- Model Groups (e.g., "free-tier", "tiny-models", "efficient-pack")
CREATE TABLE IF NOT EXISTS public.model_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_pack BOOLEAN DEFAULT FALSE, -- True for persona packs (use multiple models together)
  pack_strategy TEXT, -- 'parallel', 'sequential', 'voting', 'consensus'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Models within groups
CREATE TABLE IF NOT EXISTS public.model_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.model_groups(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL, -- e.g., "openai/gpt-4o-mini"
  persona TEXT, -- Optional persona for pack mode (e.g., "critic", "creative", "analyst")
  priority INTEGER DEFAULT 0, -- For fallback ordering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, model_id, persona)
);

-- Tier-based access control
CREATE TABLE IF NOT EXISTS public.tier_model_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL, -- 'guest', 'free', 'pro', 'premium', 'admin'
  group_id UUID NOT NULL REFERENCES public.model_groups(id) ON DELETE CASCADE,
  can_access BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier, group_id)
);

-- API cost preferences (for cheapest routing)
CREATE TABLE IF NOT EXISTS public.api_cost_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL UNIQUE,
  preferred_provider TEXT NOT NULL, -- 'openai', 'anthropic', 'openrouter', etc.
  cost_per_1m_tokens DECIMAL(10, 4), -- Cost in USD per 1M tokens
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_model_group_members_group ON public.model_group_members(group_id);
CREATE INDEX idx_model_group_members_model ON public.model_group_members(model_id);
CREATE INDEX idx_tier_access_tier ON public.tier_model_access(tier);
CREATE INDEX idx_tier_access_group ON public.tier_model_access(group_id);
CREATE INDEX idx_api_cost_model ON public.api_cost_preferences(model_id);

-- RLS Policies
ALTER TABLE public.model_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_model_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cost_preferences ENABLE ROW LEVEL SECURITY;

-- Anyone can read groups and members
CREATE POLICY "model_groups_select" ON public.model_groups
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "model_group_members_select" ON public.model_group_members
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "tier_model_access_select" ON public.tier_model_access
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "api_cost_preferences_select" ON public.api_cost_preferences
  FOR SELECT TO authenticated, anon USING (true);

-- Only admins can modify
CREATE POLICY "model_groups_admin_all" ON public.model_groups
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "model_group_members_admin_all" ON public.model_group_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "tier_model_access_admin_all" ON public.tier_model_access
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "api_cost_preferences_admin_all" ON public.api_cost_preferences
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Helper function: Get user's tier
CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id UUID DEFAULT NULL, p_fingerprint TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_tier TEXT;
BEGIN
  -- Admin tier
  IF p_user_id IS NOT NULL THEN
    SELECT 'admin' INTO v_tier
    FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
    LIMIT 1;

    IF v_tier IS NOT NULL THEN
      RETURN v_tier;
    END IF;
  END IF;

  -- Check if user has pro subscription (placeholder - implement based on your payment system)
  IF p_user_id IS NOT NULL THEN
    -- TODO: Check subscription status
    -- For now, default authenticated users to 'free'
    RETURN 'free';
  END IF;

  -- Guest tier for fingerprint-only users
  IF p_fingerprint IS NOT NULL THEN
    RETURN 'guest';
  END IF;

  RETURN 'guest';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user can access model
CREATE OR REPLACE FUNCTION public.can_user_access_model(
  p_model_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_can_access BOOLEAN;
BEGIN
  -- Get user's tier
  v_tier := public.get_user_tier(p_user_id, p_fingerprint);

  -- Admins can access everything
  IF v_tier = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check if model exists in any group accessible by this tier
  SELECT EXISTS (
    SELECT 1
    FROM public.model_group_members mgm
    JOIN public.tier_model_access tma ON tma.group_id = mgm.group_id
    WHERE mgm.model_id = p_model_id
      AND tma.tier = v_tier
      AND tma.can_access = TRUE
  ) INTO v_can_access;

  RETURN COALESCE(v_can_access, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed data: Default groups
INSERT INTO public.model_groups (name, display_name, description, is_pack) VALUES
  ('free-tier', 'Free Tier Models', 'Fast, affordable models for free users', FALSE),
  ('guest-tier', 'Guest Models', 'Limited models for anonymous users', FALSE),
  ('pro-tier', 'Pro Models', 'High-quality models for pro users', FALSE),
  ('premium-tier', 'Premium Models', 'Cutting-edge models (o1, o3, Claude Opus)', FALSE),
  ('tiny-models', 'Tiny Model Pack', 'Ultra-fast small models working together', TRUE),
  ('efficient-pack', 'Efficient Pack', 'Best price/performance models', TRUE),
  ('persona-team', 'Persona Team', 'Multi-perspective analysis team', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Seed data: Free tier models
INSERT INTO public.model_group_members (group_id, model_id, priority)
SELECT
  mg.id,
  model_id,
  priority
FROM public.model_groups mg
CROSS JOIN (VALUES
  ('openai/gpt-4o-mini', 1),
  ('anthropic/claude-3.5-haiku', 2),
  ('google/gemini-2.0-flash', 3),
  ('deepseek/deepseek-chat', 4)
) AS models(model_id, priority)
WHERE mg.name = 'free-tier'
ON CONFLICT DO NOTHING;

-- Seed data: Guest tier models (most affordable)
INSERT INTO public.model_group_members (group_id, model_id, priority)
SELECT
  mg.id,
  model_id,
  priority
FROM public.model_groups mg
CROSS JOIN (VALUES
  ('openai/gpt-4o-mini', 1),
  ('deepseek/deepseek-chat', 2)
) AS models(model_id, priority)
WHERE mg.name = 'guest-tier'
ON CONFLICT DO NOTHING;

-- Seed data: Pro tier models
INSERT INTO public.model_group_members (group_id, model_id, priority)
SELECT
  mg.id,
  model_id,
  priority
FROM public.model_groups mg
CROSS JOIN (VALUES
  ('openai/gpt-4o', 1),
  ('openai/gpt-4o-mini', 2),
  ('anthropic/claude-3.7-sonnet', 3),
  ('anthropic/claude-3.5-haiku', 4),
  ('google/gemini-2.0-flash', 5),
  ('google/gemini-1.5-pro', 6),
  ('x-ai/grok-2', 7),
  ('deepseek/deepseek-chat', 8)
) AS models(model_id, priority)
WHERE mg.name = 'pro-tier'
ON CONFLICT DO NOTHING;

-- Seed data: Premium tier models
INSERT INTO public.model_group_members (group_id, model_id, priority)
SELECT
  mg.id,
  model_id,
  priority
FROM public.model_groups mg
CROSS JOIN (VALUES
  ('openai/o1', 1),
  ('openai/o3-mini', 2),
  ('anthropic/claude-opus-4', 3)
) AS models(model_id, priority)
WHERE mg.name = 'premium-tier'
ON CONFLICT DO NOTHING;

-- Seed data: Tiny model pack (fast, parallel responses)
INSERT INTO public.model_group_members (group_id, model_id, persona, priority)
SELECT
  mg.id,
  model_id,
  persona,
  priority
FROM public.model_groups mg
CROSS JOIN (VALUES
  ('openai/gpt-4o-mini', 'quick-responder', 1),
  ('anthropic/claude-3.5-haiku', 'detail-checker', 2),
  ('deepseek/deepseek-chat', 'cost-optimizer', 3)
) AS models(model_id, persona, priority)
WHERE mg.name = 'tiny-models'
ON CONFLICT DO NOTHING;

-- Update pack strategy
UPDATE public.model_groups
SET pack_strategy = 'parallel'
WHERE name = 'tiny-models';

-- Seed data: Efficient pack (best price/performance)
INSERT INTO public.model_group_members (group_id, model_id, persona, priority)
SELECT
  mg.id,
  model_id,
  persona,
  priority
FROM public.model_groups mg
CROSS JOIN (VALUES
  ('openai/gpt-4o-mini', 'primary', 1),
  ('google/gemini-2.0-flash', 'fallback', 2)
) AS models(model_id, persona, priority)
WHERE mg.name = 'efficient-pack'
ON CONFLICT DO NOTHING;

UPDATE public.model_groups
SET pack_strategy = 'sequential'
WHERE name = 'efficient-pack';

-- Seed data: Persona team (multi-perspective)
INSERT INTO public.model_group_members (group_id, model_id, persona, priority)
SELECT
  mg.id,
  model_id,
  persona,
  priority
FROM public.model_groups mg
CROSS JOIN (VALUES
  ('openai/gpt-4o', 'analyst', 1),
  ('anthropic/claude-3.7-sonnet', 'critic', 2),
  ('google/gemini-1.5-pro', 'creative', 3)
) AS models(model_id, persona, priority)
WHERE mg.name = 'persona-team'
ON CONFLICT DO NOTHING;

UPDATE public.model_groups
SET pack_strategy = 'consensus'
WHERE name = 'persona-team';

-- Seed data: Tier access
INSERT INTO public.tier_model_access (tier, group_id, can_access)
SELECT tier, mg.id, can_access
FROM public.model_groups mg
CROSS JOIN (VALUES
  ('guest', 'guest-tier', TRUE),
  ('guest', 'free-tier', FALSE),
  ('guest', 'pro-tier', FALSE),
  ('guest', 'premium-tier', FALSE),
  ('free', 'guest-tier', TRUE),
  ('free', 'free-tier', TRUE),
  ('free', 'pro-tier', FALSE),
  ('free', 'premium-tier', FALSE),
  ('free', 'tiny-models', TRUE),
  ('free', 'efficient-pack', TRUE),
  ('pro', 'guest-tier', TRUE),
  ('pro', 'free-tier', TRUE),
  ('pro', 'pro-tier', TRUE),
  ('pro', 'premium-tier', FALSE),
  ('pro', 'tiny-models', TRUE),
  ('pro', 'efficient-pack', TRUE),
  ('pro', 'persona-team', TRUE),
  ('premium', 'guest-tier', TRUE),
  ('premium', 'free-tier', TRUE),
  ('premium', 'pro-tier', TRUE),
  ('premium', 'premium-tier', TRUE),
  ('premium', 'tiny-models', TRUE),
  ('premium', 'efficient-pack', TRUE),
  ('premium', 'persona-team', TRUE),
  ('admin', 'guest-tier', TRUE),
  ('admin', 'free-tier', TRUE),
  ('admin', 'pro-tier', TRUE),
  ('admin', 'premium-tier', TRUE),
  ('admin', 'tiny-models', TRUE),
  ('admin', 'efficient-pack', TRUE),
  ('admin', 'persona-team', TRUE)
) AS access(tier, group_name, can_access)
WHERE mg.name = access.group_name
ON CONFLICT DO NOTHING;

-- Seed data: API cost preferences (cheapest routing)
INSERT INTO public.api_cost_preferences (model_id, preferred_provider, cost_per_1m_tokens, notes) VALUES
  -- OpenAI models (direct is cheapest)
  ('openai/gpt-4o-mini', 'openai', 0.15, 'Direct API cheaper than OpenRouter'),
  ('openai/gpt-4o', 'openai', 2.50, 'Direct API only'),
  ('openai/o1', 'openai', 15.00, 'Direct API only'),
  ('openai/o3-mini', 'openai', 1.10, 'Direct API only'),

  -- Anthropic models (direct is cheapest)
  ('anthropic/claude-3.5-haiku', 'anthropic', 0.80, 'Direct API cheaper'),
  ('anthropic/claude-3.7-sonnet', 'anthropic', 3.00, 'Direct API cheaper'),
  ('anthropic/claude-opus-4', 'anthropic', 15.00, 'Direct API only'),

  -- Google models (direct is cheapest)
  ('google/gemini-2.0-flash', 'google', 0.10, 'Direct API cheaper'),
  ('google/gemini-1.5-pro', 'google', 1.25, 'Direct API cheaper'),

  -- xAI models (direct preferred)
  ('x-ai/grok-2', 'xai', 2.00, 'Direct API when available'),

  -- DeepSeek (OpenRouter fallback)
  ('deepseek/deepseek-chat', 'openrouter', 0.14, 'Only via OpenRouter'),

  -- Mistral (OpenRouter fallback)
  ('mistralai/mistral-large', 'openrouter', 2.00, 'OpenRouter or direct'),

  -- Meta Llama (OpenRouter only)
  ('meta-llama/llama-3.3-70b', 'openrouter', 0.59, 'Only via OpenRouter'),
  ('meta-llama/llama-3.1-405b', 'openrouter', 2.70, 'Only via OpenRouter')
ON CONFLICT (model_id) DO UPDATE SET
  preferred_provider = EXCLUDED.preferred_provider,
  cost_per_1m_tokens = EXCLUDED.cost_per_1m_tokens,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE public.model_groups IS 'Model groups for tier-based access control and model packs';
COMMENT ON TABLE public.model_group_members IS 'Models within each group, with optional persona for packs';
COMMENT ON TABLE public.tier_model_access IS 'Which tiers can access which model groups';
COMMENT ON TABLE public.api_cost_preferences IS 'Preferred API provider for each model (cheapest routing)';
