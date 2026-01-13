-- Shadow Tagging: Cognitive Telemetry System
-- "Observe patterns, not people"

-- Event type enum for structured querying
CREATE TYPE public.shadow_event_type AS ENUM (
  -- Intent: WHY they're here
  'intent_exploration',
  'intent_decision',
  'intent_reflection',
  'intent_creative',
  'intent_problem_solving',
  'intent_meta_reasoning',
  
  -- Depth: HOW they think
  'depth_surface',
  'depth_structured',
  'depth_multi_step',
  'depth_recursive',
  'depth_meta',
  
  -- Friction: WHERE it breaks
  'friction_rephrase',
  'friction_clarify',
  'friction_abandon',
  'friction_tone_shift',
  'friction_retry',
  
  -- Outcome: WHAT changed
  'outcome_clarity',
  'outcome_decision',
  'outcome_idea',
  'outcome_abandoned',
  'outcome_escalated'
);

-- Main shadow events table
CREATE TABLE public.shadow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fingerprint TEXT,
  session_id TEXT NOT NULL,
  
  -- Event classification
  event_type shadow_event_type NOT NULL,
  event_value TEXT, -- Additional context (e.g., "creative_writing" for intent_creative)
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.5, -- 0.00 to 1.00
  
  -- Rich metadata (no PII, no content)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session aggregates for quick lookups
CREATE TABLE public.shadow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fingerprint TEXT,
  
  -- Aggregated signals
  dominant_intent TEXT,
  max_depth TEXT,
  friction_count INTEGER DEFAULT 0,
  clarity_moments INTEGER DEFAULT 0,
  
  -- Usage metrics
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_credits_spent INTEGER DEFAULT 0,
  
  -- Upgrade signals
  upgrade_signal_score NUMERIC(4,2) DEFAULT 0, -- 0-100
  upgrade_triggered BOOLEAN DEFAULT false,
  
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade trigger configuration
CREATE TABLE public.upgrade_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name TEXT UNIQUE NOT NULL,
  conditions JSONB NOT NULL, -- e.g., {"min_depth": "multi_step", "clarity_moments": 3}
  message TEXT NOT NULL, -- Upgrade prompt message
  priority INTEGER DEFAULT 50,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default upgrade triggers
INSERT INTO public.upgrade_triggers (trigger_name, conditions, message, priority) VALUES
  ('deep_clarity', 
   '{"min_depth": "multi_step", "clarity_moments_min": 2}',
   'You''re doing deep thinking here. Unlock unlimited credits to keep going.',
   80),
  ('friction_recovery',
   '{"friction_count_min": 3, "clarity_after": true}',
   'We see you working through something complex. Sign up to save your thinking history.',
   60),
  ('creative_flow',
   '{"intent": "creative", "message_count_min": 5}',
   'You''re in creative flow. Don''t lose momentum — get more credits.',
   70),
  ('trial_exhaustion',
   '{"credits_remaining_max": 20, "clarity_moments_min": 1}',
   'You''ve had some breakthroughs. Keep the momentum going with 500 free credits on signup.',
   90);

-- Enable RLS
ALTER TABLE public.shadow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrade_triggers ENABLE ROW LEVEL SECURITY;

-- Shadow events: service role only for writes, admins can read
CREATE POLICY "Service role manages shadow events"
  ON public.shadow_events FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view shadow events"
  ON public.shadow_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Shadow sessions: same pattern
CREATE POLICY "Service role manages shadow sessions"
  ON public.shadow_sessions FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view shadow sessions"
  ON public.shadow_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Upgrade triggers: admins can manage
CREATE POLICY "Anyone can read active triggers"
  ON public.upgrade_triggers FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage triggers"
  ON public.upgrade_triggers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for efficient querying
CREATE INDEX idx_shadow_events_session ON public.shadow_events(session_id);
CREATE INDEX idx_shadow_events_type ON public.shadow_events(event_type);
CREATE INDEX idx_shadow_events_created ON public.shadow_events(created_at DESC);
CREATE INDEX idx_shadow_events_user ON public.shadow_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_shadow_sessions_user ON public.shadow_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_shadow_sessions_upgrade ON public.shadow_sessions(upgrade_signal_score DESC) WHERE NOT upgrade_triggered;