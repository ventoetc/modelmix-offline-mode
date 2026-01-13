-- ModelMix: Create Admin User
-- Run this in Supabase SQL Editor after signing up

-- Step 1: Find your user ID
-- Replace 'your@email.com' with your actual email
SELECT
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'your@email.com';

-- Step 2: Copy the user_id from above and paste below
-- Replace 'PASTE-YOUR-USER-ID-HERE' with the actual UUID

-- Grant admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('PASTE-YOUR-USER-ID-HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Grant bonus credits for admin testing
UPDATE public.user_credits
SET
  balance = balance + 10000,
  lifetime_earned = lifetime_earned + 10000
WHERE user_id = 'PASTE-YOUR-USER-ID-HERE';

-- Verify admin role was created
SELECT
  ur.role,
  u.email,
  uc.balance as credits
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.user_credits uc ON uc.user_id = ur.user_id
WHERE ur.user_id = 'PASTE-YOUR-USER-ID-HERE';

-- Expected output:
-- role  | email              | credits
-- admin | your@email.com     | 10500+
