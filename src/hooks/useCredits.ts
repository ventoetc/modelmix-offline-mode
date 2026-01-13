import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateFingerprint } from "@/lib/fingerprint";
import { isLocalModeEnabled } from "@/lib/localMode";

interface CreditBalance {
  balance: number;
  isRegistered: boolean;
  referralCode: string | null;
  lifetimeEarned: number;
  lifetimeSpent: number;
  tokensPerCredit: number;
  isNewUser?: boolean;
}

interface CreditTransaction {
  id: string;
  amount: number;
  balance_after: number;
  source: string;
  description: string;
  created_at: string;
}

export function useCredits() {
  const { user } = useAuth();
  const isLocalMode = isLocalModeEnabled();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fingerprint] = useState(() => generateFingerprint());

  const fetchBalance = useCallback(async () => {
    if (isLocalMode) {
      setBalance({
        balance: 0,
        isRegistered: false,
        referralCode: null,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        tokensPerCredit: 0,
        isNewUser: false,
      });
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      const session = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session.data.session?.access_token) {
        headers.Authorization = `Bearer ${session.data.session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/credits`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ 
            fingerprint: user ? undefined : fingerprint,
            action: "balance" 
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch credits");
      }

      const data = await response.json();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // Set default values on error
      setBalance({
        balance: user ? 500 : 100,
        isRegistered: !!user,
        referralCode: null,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        tokensPerCredit: 1000,
        isNewUser: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, fingerprint, isLocalMode]);

  const fetchHistory = useCallback(async () => {
    if (isLocalMode) {
      setTransactions([]);
      return;
    }
    try {
      const session = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session.data.session?.access_token) {
        headers.Authorization = `Bearer ${session.data.session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/credits`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ 
            fingerprint: user ? undefined : fingerprint,
            action: "history" 
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setBalance(prev => prev ? { ...prev, balance: data.balance } : null);
    } catch (err) {
      console.error("Failed to fetch credit history:", err);
    }
  }, [user, fingerprint, isLocalMode]);

  const getReferralLink = useCallback(async (): Promise<string | null> => {
    if (isLocalMode || !user) return null;

    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/credits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({ action: "referral-code" }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.referralUrl;
    } catch {
      return null;
    }
  }, [user, isLocalMode]);

  // Refresh balance after a chat
  const refreshBalance = useCallback(() => {
    if (isLocalMode) return;
    // Debounce slightly to allow the edge function to complete
    setTimeout(fetchBalance, 500);
  }, [fetchBalance, isLocalMode]);

  // Initial fetch
  useEffect(() => {
    if (!isLocalMode) {
      fetchBalance();
    } else {
      setIsLoading(false);
    }
  }, [fetchBalance, isLocalMode]);

  // Refetch when user changes
  useEffect(() => {
    if (!isLocalMode) {
      fetchBalance();
    }
  }, [user, fetchBalance, isLocalMode]);

  return {
    balance: balance?.balance ?? 0,
    isRegistered: balance?.isRegistered ?? false,
    referralCode: balance?.referralCode ?? null,
    lifetimeEarned: balance?.lifetimeEarned ?? 0,
    lifetimeSpent: balance?.lifetimeSpent ?? 0,
    tokensPerCredit: balance?.tokensPerCredit ?? 1000,
    isNewUser: balance?.isNewUser ?? false,
    transactions,
    isLoading,
    error,
    refreshBalance,
    fetchHistory,
    getReferralLink,
  };
}
