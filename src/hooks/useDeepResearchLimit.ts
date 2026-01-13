import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateFingerprint } from "@/lib/fingerprint";
import { isLocalModeEnabled } from "@/lib/localMode";

interface DeepResearchUsage {
  usedToday: number;
  dailyLimit: number;
  lastUsedAt: string | null;
  canUse: boolean;
  remainingToday: number;
}

// Daily limits by user type
const DAILY_LIMITS = {
  anonymous: 1,
  authenticated: 3,
  tester: 10,
};

export function useDeepResearchLimit() {
  const { user } = useAuth();
  const isLocalMode = isLocalModeEnabled();
  const [usage, setUsage] = useState<DeepResearchUsage>({
    usedToday: 0,
    dailyLimit: DAILY_LIMITS.anonymous,
    lastUsedAt: null,
    canUse: true,
    remainingToday: DAILY_LIMITS.anonymous,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fingerprint = generateFingerprint();

  // Determine user tier
  const getUserTier = useCallback(async (): Promise<"anonymous" | "authenticated" | "tester"> => {
    if (isLocalMode) return "anonymous";
    if (!user) return "anonymous";
    
    // Check if user is a tester
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "tester")
        .maybeSingle();
      
      if (data) return "tester";
    } catch (error) {
      console.error("Failed to check tester role:", error);
    }
    
    return "authenticated";
  }, [user, isLocalMode]);

  // Fetch current usage from localStorage (with daily reset)
  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const tier = await getUserTier();
      const dailyLimit = DAILY_LIMITS[tier];
      
      // Use localStorage for tracking (simple approach)
      const storageKey = user ? `deep_research_usage_${user.id}` : `deep_research_usage_${fingerprint}`;
      const stored = localStorage.getItem(storageKey);
      
      let usedToday = 0;
      let lastUsedAt: string | null = null;
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const today = new Date().toDateString();
        
        // Reset if it's a new day
        if (parsed.date === today) {
          usedToday = parsed.count;
          lastUsedAt = parsed.lastUsedAt;
        }
      }
      
      setUsage({
        usedToday,
        dailyLimit,
        lastUsedAt,
        canUse: usedToday < dailyLimit,
        remainingToday: Math.max(0, dailyLimit - usedToday),
      });
    } catch (error) {
      console.error("Failed to fetch deep research usage:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, fingerprint, getUserTier]);

  // Record a deep research usage
  const recordUsage = useCallback(async (modelsUsed: string[], questionSummary: string) => {
    if (isLocalMode) {
      await fetchUsage();
      return;
    }
    const storageKey = user ? `deep_research_usage_${user.id}` : `deep_research_usage_${fingerprint}`;
    const today = new Date().toDateString();
    const now = new Date().toISOString();
    
    // Update localStorage
    const stored = localStorage.getItem(storageKey);
    let count = 1;
    
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        count = parsed.count + 1;
      }
    }
    
    localStorage.setItem(storageKey, JSON.stringify({
      date: today,
      count,
      lastUsedAt: now,
    }));
    
    // Also track in audit_log for admin visibility
    try {
      await supabase.functions.invoke("track-action", {
        body: {
          actions: [{
            sessionId: `deep_research_${Date.now()}`,
            actionType: "deep_research",
            actionTarget: modelsUsed.join(","),
            actionValue: questionSummary.slice(0, 100),
            metadata: {
              modelsCount: modelsUsed.length,
              timestamp: now,
              userTier: user ? "authenticated" : "anonymous",
            },
          }],
          sessionId: `deep_research_${Date.now()}`,
        },
      });
    } catch (error) {
      console.error("Failed to track deep research:", error);
    }
    
    // Refresh usage state
    await fetchUsage();
  }, [user, fingerprint, fetchUsage, isLocalMode]);

  // Initial fetch
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    ...usage,
    isLoading,
    recordUsage,
    refreshUsage: fetchUsage,
  };
}
