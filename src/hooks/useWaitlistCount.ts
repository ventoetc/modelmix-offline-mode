import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWaitlistCount() {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        // Use RPC function to bypass RLS and get public count
        const { data, error } = await supabase.rpc("get_waitlist_count");

        if (error) throw error;
        setCount(data ?? 0);
      } catch (err) {
        console.error("Failed to fetch waitlist count:", err);
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("waitlist-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waitlist" },
        () => {
          setCount((prev) => (prev ?? 0) + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Show a baseline number + real count for social proof
  const displayCount = count !== null ? count + 127 : null;

  return { count: displayCount, isLoading };
}
