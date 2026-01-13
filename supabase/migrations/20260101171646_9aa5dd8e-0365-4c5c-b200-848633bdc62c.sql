-- Fix security issues: block anonymous access properly

-- 1. Fix profiles table - require authentication for all access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Block anonymous users explicitly
CREATE POLICY "Require auth for profile access"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')));

-- 2. Fix waitlist - already has proper policies but ensure blocking works
-- The "Block anonymous reads on waitlist" was dropped, recreate it properly
CREATE POLICY "Block anonymous waitlist reads"
ON public.waitlist
FOR SELECT
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'));

-- 3. Fix user_sessions - add explicit SELECT blocking for non-owners
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Block anonymous access to user_sessions" ON public.user_sessions;

-- Only allow users to see their own sessions
CREATE POLICY "Users can view own sessions only"
ON public.user_sessions
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Admins can view all sessions for debugging
CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));