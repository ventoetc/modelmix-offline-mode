-- Create credit transaction types enum
CREATE TYPE public.credit_source AS ENUM (
  'signup_bonus',
  'referral_earned',
  'referral_bonus',
  'daily_refresh',
  'purchase',
  'admin_grant',
  'usage',
  'refund',
  'trial'
);

-- User credit balances
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint TEXT, -- for anonymous users
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_or_fingerprint CHECK (
    (user_id IS NOT NULL AND fingerprint IS NULL) OR 
    (user_id IS NULL AND fingerprint IS NOT NULL)
  )
);

-- Credit transaction history
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES public.user_credits(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive = earned, negative = spent
  balance_after INTEGER NOT NULL,
  source credit_source NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configurable credit rates (adjust these as you learn the economics)
CREATE TABLE public.credit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default config values (easily adjustable later)
INSERT INTO public.credit_config (key, value, description) VALUES
  ('trial_credits', 100, 'Credits for anonymous trial users'),
  ('signup_bonus', 500, 'Credits granted on signup'),
  ('referral_bonus_referrer', 200, 'Credits earned when someone uses your referral'),
  ('referral_bonus_referee', 100, 'Bonus credits for new user who was referred'),
  ('daily_refresh', 0, 'Daily free credits (0 = disabled)'),
  ('tokens_per_credit', 1000, 'How many AI tokens = 1 credit consumed');

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_config ENABLE ROW LEVEL SECURITY;

-- user_credits policies
CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service role manages credits"
  ON public.user_credits FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- credit_transactions policies  
CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (
    credit_account_id IN (
      SELECT id FROM public.user_credits WHERE user_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service role manages transactions"
  ON public.credit_transactions FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- credit_config policies (admins can view/edit, service role can read)
CREATE POLICY "Anyone can read config"
  ON public.credit_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can update config"
  ON public.credit_config FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to auto-generate referral code for new credit accounts
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code_trigger
  BEFORE INSERT ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_referral_code();

-- Trigger to update updated_at
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_user_credits_fingerprint ON public.user_credits(fingerprint);
CREATE INDEX idx_user_credits_referral_code ON public.user_credits(referral_code);
CREATE INDEX idx_credit_transactions_account ON public.credit_transactions(credit_account_id);
CREATE INDEX idx_credit_transactions_created ON public.credit_transactions(created_at DESC);