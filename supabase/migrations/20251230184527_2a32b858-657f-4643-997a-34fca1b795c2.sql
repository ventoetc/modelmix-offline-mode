-- Add new event types for comprehensive action logging
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'action_click';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'action_navigation';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'action_form_submit';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'action_model_select';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'action_copy';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'action_export';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'action_settings_change';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'action_attachment';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'action_follow_up';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'consent_privacy';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'consent_analytics';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'consent_functional';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'feedback_friction';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'feedback_helpful';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'feedback_not_helpful';
ALTER TYPE shadow_event_type ADD VALUE IF NOT EXISTS 'feedback_report';

-- Create audit_log table for comprehensive action tracking
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fingerprint text,
  session_id text NOT NULL,
  action_type text NOT NULL,
  action_target text,
  action_value text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can manage audit logs
CREATE POLICY "Service role manages audit logs"
  ON public.audit_log FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create consent_records table for explicit consent tracking
CREATE TABLE IF NOT EXISTS public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint text,
  consent_type text NOT NULL, -- 'essential', 'functional', 'analytics', 'terms', 'privacy'
  granted boolean NOT NULL DEFAULT false,
  granted_at timestamptz,
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent records
CREATE POLICY "Users can view own consent"
  ON public.consent_records FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Service role manages consent
CREATE POLICY "Service role manages consent"
  ON public.consent_records FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create user_feedback table for self-submitted friction/feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fingerprint text,
  session_id text,
  feedback_type text NOT NULL, -- 'friction', 'helpful', 'not_helpful', 'bug', 'suggestion'
  context text, -- what they were doing
  message text,
  severity text DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can submit feedback
CREATE POLICY "Anyone can submit feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (true);

-- Users can view own feedback
CREATE POLICY "Users can view own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage feedback
CREATE POLICY "Admins can manage feedback"
  ON public.user_feedback FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_session ON public.audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_user ON public.consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_resolved ON public.user_feedback(resolved) WHERE resolved = false;

-- Add trigger for updated_at on consent_records
CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();