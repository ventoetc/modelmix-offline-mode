-- Fix security issues: Add RESTRICTIVE policies to block anonymous access

-- 1. Block anonymous access to profiles (RESTRICTIVE policy)
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 2. Block anonymous access to user_sessions (RESTRICTIVE policy)
CREATE POLICY "Block anonymous access to sessions"
ON public.user_sessions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 3. Block anonymous access to audit_log (RESTRICTIVE policy)
CREATE POLICY "Block anonymous access to audit_log"
ON public.audit_log
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 4. Block anonymous reads on user_feedback (RESTRICTIVE policy)
CREATE POLICY "Block anonymous reads on feedback"
ON public.user_feedback
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);