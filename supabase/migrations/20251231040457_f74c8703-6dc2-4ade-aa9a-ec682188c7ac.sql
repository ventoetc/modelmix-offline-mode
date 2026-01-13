-- Drop the existing ALL policy and create specific anon SELECT block for waitlist
CREATE POLICY "Block anonymous reads on waitlist"
ON public.waitlist
FOR SELECT
TO anon
USING (false);