-- Create usage_logs table for tracking token usage and costs
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  is_tester_session BOOLEAN DEFAULT false,
  model_id TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Service role can manage all logs
CREATE POLICY "Service role manages usage logs"
ON public.usage_logs
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Admins can view all logs
CREATE POLICY "Admins can view usage logs"
ON public.usage_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster context_id lookups
CREATE INDEX idx_usage_logs_context_id ON public.usage_logs(context_id);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at DESC);