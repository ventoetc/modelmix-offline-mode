import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackActionRequest {
  sessionId: string;
  fingerprint?: string;
  actionType: string;
  actionTarget?: string;
  actionValue?: string;
  metadata?: Record<string, unknown>;
}

interface TrackConsentRequest {
  consentType: string;
  granted: boolean;
  fingerprint?: string;
}

interface TrackFeedbackRequest {
  sessionId: string;
  fingerprint?: string;
  feedbackType: string;
  context?: string;
  message?: string;
  severity?: string;
}

interface TrackBatchRequest {
  actions?: TrackActionRequest[];
  consent?: TrackConsentRequest;
  feedback?: TrackFeedbackRequest;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth if available
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    const body = await req.json();
    const results: Record<string, unknown> = {};

    // Handle batch action tracking
    if (body.actions && Array.isArray(body.actions)) {
      const auditLogs = body.actions.map((action: TrackActionRequest) => ({
        user_id: userId || null,
        fingerprint: userId ? null : action.fingerprint,
        session_id: action.sessionId,
        action_type: action.actionType,
        action_target: action.actionTarget || null,
        action_value: action.actionValue || null,
        metadata: action.metadata || {},
      }));

      const { error: auditError } = await supabase
        .from("audit_log")
        .insert(auditLogs);

      if (auditError) {
        console.error("Failed to insert audit logs:", auditError);
        results.actions = { success: false, error: auditError.message };
      } else {
        console.log(`Logged ${auditLogs.length} actions for session`);
        results.actions = { success: true, count: auditLogs.length };
      }

      // Also log to shadow_events for analytics continuity
      const shadowEvents = body.actions
        .filter((a: TrackActionRequest) => a.actionType.startsWith('action_'))
        .map((action: TrackActionRequest) => ({
          user_id: userId || null,
          fingerprint: userId ? null : action.fingerprint,
          session_id: action.sessionId,
          event_type: action.actionType,
          event_value: action.actionTarget || action.actionValue,
          confidence: 1.0, // User actions are 100% confident
          metadata: action.metadata || {},
        }));

      if (shadowEvents.length > 0) {
        await supabase.from("shadow_events").insert(shadowEvents);
      }
    }

    // Handle single action (backwards compat)
    if (body.sessionId && body.actionType && !body.actions) {
      const { sessionId, fingerprint, actionType, actionTarget, actionValue, metadata } = body;

      const { error: auditError } = await supabase
        .from("audit_log")
        .insert({
          user_id: userId || null,
          fingerprint: userId ? null : fingerprint,
          session_id: sessionId,
          action_type: actionType,
          action_target: actionTarget || null,
          action_value: actionValue || null,
          metadata: metadata || {},
        });

      if (auditError) {
        console.error("Failed to insert audit log:", auditError);
        results.action = { success: false, error: auditError.message };
      } else {
        console.log(`Logged action: ${actionType} for session ${sessionId}`);
        results.action = { success: true };
      }
    }

    // Handle consent tracking
    if (body.consent) {
      const { consentType, granted, fingerprint: consentFingerprint } = body.consent;
      const userAgent = req.headers.get("user-agent") || null;
      const forwarded = req.headers.get("x-forwarded-for");
      const ipAddress = forwarded ? forwarded.split(",")[0].trim() : null;

      // Check for existing consent record
      const query = supabase.from("consent_records").select("*");
      if (userId) {
        query.eq("user_id", userId);
      } else if (consentFingerprint) {
        query.eq("fingerprint", consentFingerprint);
      }
      const { data: existing } = await query.eq("consent_type", consentType).maybeSingle();

      if (existing) {
        // Update existing
        await supabase
          .from("consent_records")
          .update({
            granted,
            granted_at: granted ? new Date().toISOString() : existing.granted_at,
            revoked_at: !granted ? new Date().toISOString() : null,
            ip_address: ipAddress,
            user_agent: userAgent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        
        results.consent = { success: true, updated: true };
      } else {
        // Create new
        await supabase
          .from("consent_records")
          .insert({
            user_id: userId || null,
            fingerprint: userId ? null : consentFingerprint,
            consent_type: consentType,
            granted,
            granted_at: granted ? new Date().toISOString() : null,
            ip_address: ipAddress,
            user_agent: userAgent,
          });
        
        results.consent = { success: true, created: true };
      }

      // Log consent as shadow event for analytics
      const consentEventType = `consent_${consentType.toLowerCase()}`;
      await supabase.from("shadow_events").insert({
        user_id: userId || null,
        fingerprint: userId ? null : consentFingerprint,
        session_id: body.sessionId || `consent_${Date.now()}`,
        event_type: consentEventType.includes('privacy') ? 'consent_privacy' : 
                   consentEventType.includes('analytics') ? 'consent_analytics' : 
                   'consent_functional',
        event_value: granted ? 'granted' : 'revoked',
        confidence: 1.0,
        metadata: { consent_type: consentType, ip_address: ipAddress },
      });

      console.log(`Consent ${granted ? 'granted' : 'revoked'}: ${consentType} for ${userId || consentFingerprint}`);
    }

    // Handle feedback submission (self-reported friction)
    if (body.feedback) {
      const { sessionId, fingerprint: feedbackFingerprint, feedbackType, context, message, severity } = body.feedback;

      const { error: feedbackError } = await supabase
        .from("user_feedback")
        .insert({
          user_id: userId || null,
          fingerprint: userId ? null : feedbackFingerprint,
          session_id: sessionId,
          feedback_type: feedbackType,
          context: context || null,
          message: message || null,
          severity: severity || 'low',
        });

      if (feedbackError) {
        console.error("Failed to insert feedback:", feedbackError);
        results.feedback = { success: false, error: feedbackError.message };
      } else {
        console.log(`Feedback submitted: ${feedbackType} (${severity}) - ${context}`);
        results.feedback = { success: true };
      }

      // Log feedback as shadow event
      const feedbackEventType = feedbackType === 'friction' ? 'feedback_friction' :
                               feedbackType === 'helpful' ? 'feedback_helpful' :
                               feedbackType === 'not_helpful' ? 'feedback_not_helpful' :
                               'feedback_report';
      
      await supabase.from("shadow_events").insert({
        user_id: userId || null,
        fingerprint: userId ? null : feedbackFingerprint,
        session_id: sessionId || `feedback_${Date.now()}`,
        event_type: feedbackEventType,
        event_value: message?.substring(0, 100) || feedbackType,
        confidence: 1.0,
        metadata: { context, severity, full_message_length: message?.length },
      });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Track action error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
