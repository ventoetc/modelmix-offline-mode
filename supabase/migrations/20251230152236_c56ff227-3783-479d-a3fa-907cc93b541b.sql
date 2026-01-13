-- Create waitlist table for beta signups
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  use_case text NOT NULL,
  profession text,
  preferred_models text[],
  referral_source text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notified boolean DEFAULT false,
  converted_to_user boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public signup)
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);

-- Only admins can view waitlist
CREATE POLICY "Admins can view waitlist"
ON public.waitlist
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update waitlist
CREATE POLICY "Admins can update waitlist"
ON public.waitlist
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for email lookups
CREATE INDEX idx_waitlist_email ON public.waitlist(email);