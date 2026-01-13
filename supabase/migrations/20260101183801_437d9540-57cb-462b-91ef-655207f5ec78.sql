-- Create tester invites table for team-based invite codes
CREATE TABLE public.tester_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  description TEXT,
  max_uses INTEGER DEFAULT 10,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create pending tester approvals table
CREATE TABLE public.pending_tester_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL REFERENCES tester_invites(invite_code),
  team_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.tester_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_tester_approvals ENABLE ROW LEVEL SECURITY;

-- Policies for tester_invites
CREATE POLICY "Admins can manage invites" ON public.tester_invites
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active invites by code" ON public.tester_invites
  FOR SELECT USING (is_active = true);

-- Policies for pending_tester_approvals  
CREATE POLICY "Admins can manage approvals" ON public.pending_tester_approvals
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own pending status" ON public.pending_tester_approvals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages approvals" ON public.pending_tester_approvals
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Insert Splash team invite code
INSERT INTO public.tester_invites (invite_code, team_name, description, max_uses)
VALUES ('SPLASH2026', 'Splash Team', 'Exclusive invite for Splash team members', 50);