import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { isLocalModeEnabled } from '@/lib/localMode';

interface TesterContextValue {
  contextId: string;
  isTester: boolean;
  isLoading: boolean;
  usageValue: number; // Estimated $ value of testing credits used
  sessionTokens: number; // Total tokens used in current session
  addTokenUsage: (tokens: number, creditsValue: number) => void;
}

const TesterContext = createContext<TesterContextValue | undefined>(undefined);

// Generate a persistent context ID for the testing journey
const generateContextId = (): string => {
  const saved = sessionStorage.getItem('modelmix-context-id');
  if (saved) return saved;
  
  const newId = `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  sessionStorage.setItem('modelmix-context-id', newId);
  return newId;
};

interface TesterProviderProps {
  children: ReactNode;
}

export function TesterProvider({ children }: TesterProviderProps) {
  const { user } = useAuth();
  const [contextId] = useState(generateContextId);
  const [isTester, setIsTester] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [usageValue, setUsageValue] = useState(0);

  // Check tester role when user changes
  useEffect(() => {
    const checkTesterRole = async () => {
      if (isLocalModeEnabled()) {
        setIsTester(false);
        setIsLoading(false);
        return;
      }
      if (!user) {
        setIsTester(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has tester role using has_role function
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'tester'
        });

        if (error) {
          console.error('Error checking tester role:', error);
          setIsTester(false);
        } else {
          setIsTester(data === true);
        }
      } catch (err) {
        console.error('Failed to check tester role:', err);
        setIsTester(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTesterRole();
  }, [user]);

  // Track token usage in session
  const addTokenUsage = (tokens: number, creditsValue: number) => {
    setSessionTokens(prev => prev + tokens);
    // Approximate $ value: 1000 tokens ≈ $0.001 for estimation
    setUsageValue(prev => prev + (tokens / 1000) * 0.001);
  };

  const value = useMemo(() => ({
    contextId,
    isTester,
    isLoading,
    usageValue,
    sessionTokens,
    addTokenUsage,
  }), [contextId, isTester, isLoading, usageValue, sessionTokens]);

  return (
    <TesterContext.Provider value={value}>
      {children}
    </TesterContext.Provider>
  );
}

export function useTesterContext() {
  const context = useContext(TesterContext);
  if (context === undefined) {
    throw new Error('useTesterContext must be used within a TesterProvider');
  }
  return context;
}

// Hook for getting just the context ID (lighter weight, no role check)
export function useContextId(): string {
  const saved = sessionStorage.getItem('modelmix-context-id');
  if (saved) return saved;
  
  const newId = `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  sessionStorage.setItem('modelmix-context-id', newId);
  return newId;
}
