import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ConversationSummary } from "@/components/ConversationHistory";
import { toast } from "@/hooks/use-toast";
import { generateUUID } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

export const useConversationHistory = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch conversations from database for authenticated users
  const fetchConversations = useCallback(async () => {
    if (!user) {
      // Fall back to localStorage for anonymous users
      const saved = localStorage.getItem("arena-conversation-history");
      setConversations(saved ? JSON.parse(saved) : []);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("conversation_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped: ConversationSummary[] = (data || []).map((conv) => ({
        id: conv.id,
        prompt: conv.prompt,
        timestamp: conv.created_at,
        modelCount: conv.models_used.length,
        responseCount: conv.response_count,
      }));

      setConversations(mapped);
    } catch (error) {
      console.error("Failed to fetch conversation history:", error);
      // Fall back to localStorage
      const saved = localStorage.getItem("arena-conversation-history");
      setConversations(saved ? JSON.parse(saved) : []);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load conversations on mount and when user changes
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Save a new conversation
  const saveConversation = useCallback(async (
    prompt: string,
    modelsUsed: string[],
    responseCount: number,
    sessionData: Record<string, unknown>
  ) => {
    if (!user) {
      // Save to localStorage for anonymous users
      const newConversation: ConversationSummary = {
        id: generateUUID(),
        prompt,
        timestamp: new Date().toISOString(),
        modelCount: modelsUsed.length,
        responseCount,
      };
      
      const updated = [newConversation, ...conversations].slice(0, 50);
      localStorage.setItem("arena-conversation-history", JSON.stringify(updated));
      localStorage.setItem(`arena-conv-${newConversation.id}`, JSON.stringify(sessionData));
      setConversations(updated);
      return newConversation.id;
    }

    try {
      const { data, error } = await supabase
        .from("conversation_history")
        .insert([{
          user_id: user.id,
          prompt,
          models_used: modelsUsed,
          response_count: responseCount,
          session_data: sessionData as Json,
        }])
        .select()
        .single();

      if (error) throw error;

      const newConv: ConversationSummary = {
        id: data.id,
        prompt: data.prompt,
        timestamp: data.created_at,
        modelCount: data.models_used.length,
        responseCount: data.response_count,
      };

      setConversations(prev => [newConv, ...prev].slice(0, 50));
      return data.id;
    } catch (error) {
      console.error("Failed to save conversation:", error);
      toast({ title: "Failed to save conversation", variant: "destructive" });
      return null;
    }
  }, [user, conversations]);

  // Load a conversation's session data
  const loadConversation = useCallback(async (id: string) => {
    if (!user) {
      // Load from localStorage for anonymous users
      const saved = localStorage.getItem(`arena-conv-${id}`);
      return saved ? JSON.parse(saved) : null;
    }

    try {
      const { data, error } = await supabase
        .from("conversation_history")
        .select("session_data")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data?.session_data || null;
    } catch (error) {
      console.error("Failed to load conversation:", error);
      return null;
    }
  }, [user]);

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string) => {
    if (!user) {
      // Delete from localStorage for anonymous users
      localStorage.removeItem(`arena-conv-${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      toast({ title: "Conversation deleted" });
      return;
    }

    try {
      const { error } = await supabase
        .from("conversation_history")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== id));
      toast({ title: "Conversation deleted" });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast({ title: "Failed to delete conversation", variant: "destructive" });
    }
  }, [user]);

  // Clear all history
  const clearAllHistory = useCallback(async () => {
    if (!user) {
      // Clear localStorage for anonymous users
      conversations.forEach(c => localStorage.removeItem(`arena-conv-${c.id}`));
      localStorage.removeItem("arena-conversation-history");
      setConversations([]);
      toast({ title: "History cleared" });
      return;
    }

    try {
      const { error } = await supabase
        .from("conversation_history")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setConversations([]);
      toast({ title: "History cleared" });
    } catch (error) {
      console.error("Failed to clear history:", error);
      toast({ title: "Failed to clear history", variant: "destructive" });
    }
  }, [user, conversations]);

  return {
    conversations,
    isLoading,
    saveConversation,
    loadConversation,
    deleteConversation,
    clearAllHistory,
    refreshHistory: fetchConversations,
  };
};
