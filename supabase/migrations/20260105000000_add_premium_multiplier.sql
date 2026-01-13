-- Add premium tier multiplier configuration for high-end models

INSERT INTO public.credit_config (key, value, description) VALUES
  ('multiplier_premium', 200, 'Credit multiplier for premium models (o1, o3, claude-4, etc.)')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
