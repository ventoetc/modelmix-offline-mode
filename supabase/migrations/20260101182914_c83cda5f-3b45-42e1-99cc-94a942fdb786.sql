-- First: Cleanup existing duplicates - keep the one with highest lifetime_earned
WITH duplicates AS (
  SELECT id,
         fingerprint,
         ROW_NUMBER() OVER (PARTITION BY fingerprint ORDER BY lifetime_earned DESC, created_at ASC) as rn
  FROM public.user_credits
  WHERE user_id IS NULL AND fingerprint IS NOT NULL
)
DELETE FROM public.user_credits
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Then: Add partial unique index to prevent future duplicate fingerprint accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_credits_fingerprint_unique 
ON public.user_credits (fingerprint) 
WHERE user_id IS NULL AND fingerprint IS NOT NULL;