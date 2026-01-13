-- Fix usage_tracking: Remove all existing policies and recreate
DROP POLICY IF EXISTS "Anyone can view their usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Anyone can insert usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;

-- Users can only view their own usage (authenticated users only)
CREATE POLICY "Authenticated users can view own usage"
  ON public.usage_tracking FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND identifier = auth.uid()::text AND identifier_type = 'user')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Fix profiles: Add anonymous blocking
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Explicitly block profile deletion
DROP POLICY IF EXISTS "Profiles cannot be deleted" ON public.profiles;
CREATE POLICY "Profiles cannot be deleted"
  ON public.profiles FOR DELETE
  USING (false);

-- Fix shadow_events: Block anonymous access (admins only should see these)
DROP POLICY IF EXISTS "Admins can view shadow events" ON public.shadow_events;
DROP POLICY IF EXISTS "Only admins can view shadow events" ON public.shadow_events;

CREATE POLICY "Admins only can view shadow events"
  ON public.shadow_events FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'));

-- Fix shadow_sessions: Block anonymous access
DROP POLICY IF EXISTS "Admins can view shadow sessions" ON public.shadow_sessions;
DROP POLICY IF EXISTS "Only admins can view shadow sessions" ON public.shadow_sessions;

CREATE POLICY "Admins only can view shadow sessions"
  ON public.shadow_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'));

-- Fix credit_transactions: Require authentication
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Authenticated users can view own transactions" ON public.credit_transactions;

CREATE POLICY "Auth users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (
      credit_account_id IN (
        SELECT id FROM public.user_credits WHERE user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Fix credit_holds: Require authentication
DROP POLICY IF EXISTS "Users can view own holds" ON public.credit_holds;
DROP POLICY IF EXISTS "Authenticated users can view own holds" ON public.credit_holds;

CREATE POLICY "Auth users can view own holds"
  ON public.credit_holds FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (
      credit_account_id IN (
        SELECT id FROM public.user_credits WHERE user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Fix rate_limits: Require authentication
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Authenticated users can view own rate limits" ON public.rate_limits;

CREATE POLICY "Auth users can view own rate limits"
  ON public.rate_limits FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (
      credit_account_id IN (
        SELECT id FROM public.user_credits WHERE user_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Fix user_credits: Require authentication for viewing
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Authenticated users can view own credits" ON public.user_credits;

CREATE POLICY "Auth users can view own credits"
  ON public.user_credits FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );