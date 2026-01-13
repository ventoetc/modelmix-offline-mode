-- Create conversation_history table for persistent user history
CREATE TABLE public.conversation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  models_used text[] NOT NULL DEFAULT '{}',
  response_count integer NOT NULL DEFAULT 0,
  session_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

-- Users can only access their own history
CREATE POLICY "Users can view own history"
ON public.conversation_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
ON public.conversation_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own history"
ON public.conversation_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
ON public.conversation_history
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all history
CREATE POLICY "Admins can view all history"
ON public.conversation_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster user queries
CREATE INDEX idx_conversation_history_user_id ON public.conversation_history(user_id);
CREATE INDEX idx_conversation_history_created_at ON public.conversation_history(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_conversation_history_updated_at
BEFORE UPDATE ON public.conversation_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();