-- Drop the insecure policies
DROP POLICY IF EXISTS "Anyone can view their usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Anyone can insert usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Anyone can update their usage" ON public.usage_tracking;

-- Create secure policies that restrict by identifier
-- For anonymous users (fingerprint-based), we use a more relaxed approach since they can't authenticate
-- But we still need to allow the edge function (which uses service role) to manage usage

-- Users can only view their own usage (matching identifier)
CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT
  USING (
    -- Authenticated users can see records matching their user_id
    (auth.uid() IS NOT NULL AND identifier = auth.uid()::text AND identifier_type = 'user')
    OR
    -- Admins can see all
    public.has_role(auth.uid(), 'admin')
  );

-- Only service role (edge function) can insert/update usage records
-- This is handled by the edge function using SUPABASE_SERVICE_ROLE_KEY
-- Regular users cannot directly manipulate usage data

-- Remove public insert/update - edge function uses service role
CREATE POLICY "Service role manages usage"
  ON public.usage_tracking FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');