-- Enable realtime for waitlist table to support live counter
ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlist;