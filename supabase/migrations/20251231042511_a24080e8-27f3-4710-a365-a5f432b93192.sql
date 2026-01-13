-- Create a security definer function to get waitlist count publicly
-- This allows anonymous users to see the count without accessing the table directly
CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.waitlist;
$$;