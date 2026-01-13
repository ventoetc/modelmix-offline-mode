-- Function for admins to adjust user credits
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
  target_user_id uuid,
  adjustment integer,
  reason text DEFAULT 'Admin adjustment'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credit_account_id uuid;
  new_balance integer;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get or create credit account for user
  SELECT id INTO credit_account_id
  FROM user_credits
  WHERE user_id = target_user_id;

  IF credit_account_id IS NULL THEN
    -- Create credit account for user
    INSERT INTO user_credits (user_id, balance, lifetime_earned)
    VALUES (target_user_id, GREATEST(adjustment, 0), GREATEST(adjustment, 0))
    RETURNING id, balance INTO credit_account_id, new_balance;
  ELSE
    -- Update existing account
    UPDATE user_credits
    SET 
      balance = balance + adjustment,
      lifetime_earned = CASE WHEN adjustment > 0 THEN lifetime_earned + adjustment ELSE lifetime_earned END,
      lifetime_spent = CASE WHEN adjustment < 0 THEN lifetime_spent + ABS(adjustment) ELSE lifetime_spent END,
      updated_at = now()
    WHERE id = credit_account_id
    RETURNING balance INTO new_balance;
  END IF;

  -- Record transaction
  INSERT INTO credit_transactions (credit_account_id, amount, balance_after, source, description)
  VALUES (credit_account_id, adjustment, new_balance, 'admin', reason);

  RETURN new_balance;
END;
$$;

-- Allow admins to view all user credits
CREATE POLICY "Admins can view all user credits"
ON public.user_credits
FOR SELECT
USING (has_role(auth.uid(), 'admin'));