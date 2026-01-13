-- Add credit hold and rate limiting support

-- Credit holds (reserves during streaming)
CREATE TABLE public.credit_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES public.user_credits(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'streaming',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  released BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate limiting tracking
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES public.user_credits(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  credits_spent INTEGER NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(credit_account_id, window_start)
);

-- Add model multipliers to config
INSERT INTO public.credit_config (key, value, description) VALUES
  ('multiplier_flash', 100, 'Multiplier for flash models (100 = 1.0x, 140 = 1.4x)'),
  ('multiplier_pro', 140, 'Multiplier for pro models'),
  ('multiplier_admin', 200, 'Multiplier for admin/deep models'),
  ('max_credits_per_minute', 50, 'Maximum credits spendable per minute (abuse prevention)'),
  ('overdraft_threshold', 110, 'Block when balance < estimated_cost * (threshold/100)');

-- Enable RLS
ALTER TABLE public.credit_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies for credit_holds
CREATE POLICY "Users can view own holds"
  ON public.credit_holds FOR SELECT
  USING (
    credit_account_id IN (SELECT id FROM public.user_credits WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service role manages holds"
  ON public.credit_holds FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Policies for rate_limits
CREATE POLICY "Users can view own rate limits"
  ON public.rate_limits FOR SELECT
  USING (
    credit_account_id IN (SELECT id FROM public.user_credits WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Create indexes
CREATE INDEX idx_credit_holds_account ON public.credit_holds(credit_account_id);
CREATE INDEX idx_credit_holds_expires ON public.credit_holds(expires_at) WHERE NOT released;
CREATE INDEX idx_rate_limits_window ON public.rate_limits(credit_account_id, window_start DESC);

-- Add usage_type tracking to transactions (for analytics)
ALTER TABLE public.credit_transactions 
  ADD COLUMN IF NOT EXISTS usage_type TEXT DEFAULT 'chat';

-- Function to clean up expired holds (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_holds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Release expired holds back to balance
  UPDATE public.user_credits uc
  SET balance = balance + ch.amount
  FROM public.credit_holds ch
  WHERE ch.credit_account_id = uc.id
    AND ch.expires_at < now()
    AND ch.released = false;
  
  -- Mark as released
  UPDATE public.credit_holds
  SET released = true
  WHERE expires_at < now() AND released = false;
END;
$$;