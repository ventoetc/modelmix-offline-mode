-- Fix profiles table RLS policies
-- The current "Block anonymous access to profiles" policy with USING (false) blocks everyone

-- Drop the problematic blocking policy
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Drop existing policies to rebuild them correctly as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles cannot be deleted" ON public.profiles;

-- Create proper PERMISSIVE policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own profile (for trigger/signup)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can insert profiles (for signup trigger)
CREATE POLICY "Service role can manage profiles"
ON public.profiles
FOR ALL
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Fix user_credits: ensure admins can view all credits for administration
DROP POLICY IF EXISTS "Admins can view all user credits" ON public.user_credits;

CREATE POLICY "Admins can manage all user credits"
ON public.user_credits
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure admins can manage test_accounts
DROP POLICY IF EXISTS "Admins can manage test accounts" ON public.test_accounts;

CREATE POLICY "Admins can manage test accounts"
ON public.test_accounts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure admins can manage credit_config
DROP POLICY IF EXISTS "Admins can update config" ON public.credit_config;
DROP POLICY IF EXISTS "Anyone can read config" ON public.credit_config;

CREATE POLICY "Anyone can read credit config"
ON public.credit_config
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage credit config"
ON public.credit_config
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure admins can manage waitlist
DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Admins can update waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Block anonymous reads on waitlist" ON public.waitlist;

CREATE POLICY "Admins can view waitlist"
ON public.waitlist
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage waitlist"
ON public.waitlist
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Keep public insert for waitlist signup
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);

-- Ensure admins can view credit_transactions
DROP POLICY IF EXISTS "Auth users can view own transactions" ON public.credit_transactions;

CREATE POLICY "Users can view own transactions"
ON public.credit_transactions
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    credit_account_id IN (SELECT id FROM user_credits WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Ensure admins can view credit_holds
DROP POLICY IF EXISTS "Auth users can view own holds" ON public.credit_holds;

CREATE POLICY "Users can view own holds"
ON public.credit_holds
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    credit_account_id IN (SELECT id FROM user_credits WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Ensure admins can view rate_limits
DROP POLICY IF EXISTS "Auth users can view own rate limits" ON public.rate_limits;

CREATE POLICY "Users can view own rate limits"
ON public.rate_limits
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    credit_account_id IN (SELECT id FROM user_credits WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
);