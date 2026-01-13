import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { isLocalModeEnabled } from '@/lib/localMode';

interface TrackedAction {
  sessionId: string;
  fingerprint?: string;
  actionType: string;
  actionTarget?: string;
  actionValue?: string;
  metadata?: Record<string, unknown>;
}

interface ConsentData {
  consentType: string;
  granted: boolean;
  fingerprint?: string;
}

interface FeedbackData {
  sessionId: string;
  fingerprint?: string;
  feedbackType: 'friction' | 'helpful' | 'not_helpful' | 'bug' | 'suggestion';
  context?: string;
  message?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export function useActionTracker() {
  const { user } = useAuth();
  const isLocalMode = isLocalModeEnabled();
  const actionQueue = useRef<TrackedAction[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useRef<string>('');

  // Initialize session ID
  useEffect(() => {
    const stored = sessionStorage.getItem('shadow_session_id');
    if (stored) {
      sessionId.current = stored;
    } else {
      sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('shadow_session_id', sessionId.current);
    }
  }, []);

  // Flush action queue to backend
  const flushActions = useCallback(async () => {
    if (isLocalMode) return;
    if (actionQueue.current.length === 0) return;

    const actionsToSend = [...actionQueue.current];
    actionQueue.current = [];

    try {
      const fingerprint = localStorage.getItem('user_fingerprint');
      
      await supabase.functions.invoke('track-action', {
        body: {
          actions: actionsToSend.map(a => ({
            ...a,
            fingerprint: user ? undefined : fingerprint,
          })),
          sessionId: sessionId.current,
        },
      });
    } catch (error) {
      console.error('Failed to flush actions:', error);
      // Re-queue failed actions (with limit to prevent memory issues)
      if (actionQueue.current.length < 100) {
        actionQueue.current.push(...actionsToSend);
      }
    }
  }, [user, isLocalMode]);

  // Queue action with debounced flush
  const trackAction = useCallback((
    actionType: string,
    actionTarget?: string,
    actionValue?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (isLocalMode) return;
    const action: TrackedAction = {
      sessionId: sessionId.current,
      actionType,
      actionTarget,
      actionValue,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        url: window.location.pathname,
      },
    };

    actionQueue.current.push(action);

    // Debounce flush to batch actions
    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
    }
    flushTimeout.current = setTimeout(flushActions, 2000);

    // Also flush immediately if queue is large
    if (actionQueue.current.length >= 10) {
      flushActions();
    }
  }, [flushActions, isLocalMode]);

  // Track specific action types
  const trackClick = useCallback((target: string, metadata?: Record<string, unknown>) => {
    trackAction('action_click', target, undefined, metadata);
  }, [trackAction]);

  const trackNavigation = useCallback((destination: string, metadata?: Record<string, unknown>) => {
    trackAction('action_navigation', destination, undefined, metadata);
  }, [trackAction]);

  const trackModelSelect = useCallback((modelId: string, panelIndex?: number) => {
    trackAction('action_model_select', modelId, undefined, { panelIndex });
  }, [trackAction]);

  const trackCopy = useCallback((contentType: string, modelId?: string) => {
    trackAction('action_copy', contentType, modelId);
  }, [trackAction]);

  const trackExport = useCallback((format: string, metadata?: Record<string, unknown>) => {
    trackAction('action_export', format, undefined, metadata);
  }, [trackAction]);

  const trackSettingsChange = useCallback((setting: string, value: string | boolean) => {
    trackAction('action_settings_change', setting, String(value));
  }, [trackAction]);

  const trackFollowUp = useCallback((hasAttachment: boolean, modelCount: number) => {
    trackAction('action_follow_up', undefined, undefined, { hasAttachment, modelCount });
  }, [trackAction]);

  const trackTemplateUsage = useCallback((templateId: string, category: string, isPremium: boolean) => {
    trackAction('action_template_use', templateId, category, { isPremium, source: 'template_library' });
  }, [trackAction]);

  // Track consent (immediate, not batched)
  const trackConsent = useCallback(async (consentType: string, granted: boolean) => {
    if (isLocalMode) return;
    try {
      const fingerprint = localStorage.getItem('user_fingerprint');
      
      await supabase.functions.invoke('track-action', {
        body: {
          consent: {
            consentType,
            granted,
            fingerprint: user ? undefined : fingerprint,
          },
          sessionId: sessionId.current,
        },
      });
    } catch (error) {
      console.error('Failed to track consent:', error);
    }
  }, [user, isLocalMode]);

  // Submit user feedback (friction, helpful, etc.)
  const submitFeedback = useCallback(async (feedback: Omit<FeedbackData, 'sessionId' | 'fingerprint'>) => {
    if (isLocalMode) {
      return { success: true };
    }
    try {
      const fingerprint = localStorage.getItem('user_fingerprint');
      
      await supabase.functions.invoke('track-action', {
        body: {
          feedback: {
            ...feedback,
            sessionId: sessionId.current,
            fingerprint: user ? undefined : fingerprint,
          },
        },
      });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return { success: false, error };
    }
  }, [user, isLocalMode]);

  // Report friction with context
  const reportFriction = useCallback((context: string, message?: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    return submitFeedback({
      feedbackType: 'friction',
      context,
      message,
      severity,
    });
  }, [submitFeedback]);

  // Mark response as helpful/not helpful
  const rateResponse = useCallback((helpful: boolean, modelId: string, responseContext?: string) => {
    return submitFeedback({
      feedbackType: helpful ? 'helpful' : 'not_helpful',
      context: `Model: ${modelId}`,
      message: responseContext,
      severity: 'low',
    });
  }, [submitFeedback]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
      flushActions();
    };
  }, [flushActions]);

  // Flush on page visibility change (user leaving)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushActions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushActions]);

  return {
    trackAction,
    trackClick,
    trackNavigation,
    trackModelSelect,
    trackCopy,
    trackExport,
    trackSettingsChange,
    trackFollowUp,
    trackTemplateUsage,
    trackConsent,
    submitFeedback,
    reportFriction,
    rateResponse,
    sessionId: sessionId.current,
  };
}
