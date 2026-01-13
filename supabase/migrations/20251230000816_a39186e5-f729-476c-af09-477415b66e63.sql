-- Add 'tester' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tester';

-- Create a test_accounts table to track designated test accounts
CREATE TABLE public.test_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  description text,
  starting_credits integer DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.test_accounts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage test accounts
CREATE POLICY "Admins can manage test accounts"
ON public.test_accounts
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));