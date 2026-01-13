import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Intent detection patterns (no content analysis, just structure)
const INTENT_PATTERNS = {
  exploration: [
    /^(what|how|why|explain|tell me|describe|help me understand)/i,
    /\?$/,
    /(curious|wondering|interested in)/i,
  ],
  decision: [
    /(should i|which|better|choose|decide|compare|vs|or)/i,
    /(pros and cons|trade-?offs|options)/i,
  ],
  reflection: [
    /(think about|reflect|consider|ponder|what do you think)/i,
    /(my thoughts|i feel|i think)/i,
  ],
  creative: [
    /(write|create|generate|compose|design|brainstorm|imagine)/i,
    /(story|poem|idea|concept|name|title)/i,
  ],
  problem_solving: [
    /(fix|solve|debug|issue|problem|error|broken|not working)/i,
    /(how to|step by step|guide|tutorial)/i,
  ],
  meta_reasoning: [
    /(why did you|how do you|your reasoning|explain your)/i,
    /(meta|recursive|about thinking|about your)/i,
  ],
};

// Depth scoring based on prompt characteristics
function analyzeDepth(prompt: string, conversationLength: number): { depth: string; confidence: number } {
  const wordCount = prompt.split(/\s+/).length;
  const hasMultipleClauses = (prompt.match(/,|;|and|but|however|therefore/gi) || []).length > 2;
  const hasNumberedList = /\d+\.|first|second|third/i.test(prompt);
  const hasConditionals = /if|when|unless|assuming|given that/i.test(prompt);
  const hasAbstraction = /concept|principle|framework|pattern|meta/i.test(prompt);
  
  let score = 0;
  
  // Word count scoring
  if (wordCount > 100) score += 3;
  else if (wordCount > 50) score += 2;
  else if (wordCount > 20) score += 1;
  
  // Structural complexity
  if (hasMultipleClauses) score += 2;
  if (hasNumberedList) score += 2;
  if (hasConditionals) score += 1;
  if (hasAbstraction) score += 3;
  
  // Conversation depth bonus
  if (conversationLength > 5) score += 2;
  else if (conversationLength > 2) score += 1;
  
  // Map to depth level
  if (score >= 8) return { depth: "meta", confidence: 0.85 };
  if (score >= 6) return { depth: "recursive", confidence: 0.8 };
  if (score >= 4) return { depth: "multi_step", confidence: 0.75 };
  if (score >= 2) return { depth: "structured", confidence: 0.7 };
  return { depth: "surface", confidence: 0.6 };
}

// Friction detection
function detectFriction(
  currentPrompt: string, 
  previousPrompts: string[]
): { type: string | null; confidence: number } {
  if (previousPrompts.length === 0) return { type: null, confidence: 0 };
  
  const lastPrompt = previousPrompts[previousPrompts.length - 1] || "";
  
  // Rephrase detection (similar question structure)
  const currentWords = new Set(currentPrompt.toLowerCase().split(/\s+/));
  const lastWords = new Set(lastPrompt.toLowerCase().split(/\s+/));
  const overlap = [...currentWords].filter(w => lastWords.has(w)).length;
  const similarity = overlap / Math.max(currentWords.size, lastWords.size);
  
  if (similarity > 0.5 && currentPrompt !== lastPrompt) {
    return { type: "rephrase", confidence: similarity };
  }
  
  // Clarification request
  if (/not what i meant|no,|actually|i meant|let me clarify/i.test(currentPrompt)) {
    return { type: "clarify", confidence: 0.9 };
  }
  
  // Tone shift (informal to formal or vice versa)
  const currentInformal = /\b(lol|ok|yeah|nah|gonna|wanna)\b/i.test(currentPrompt);
  const lastInformal = /\b(lol|ok|yeah|nah|gonna|wanna)\b/i.test(lastPrompt);
  if (currentInformal !== lastInformal && previousPrompts.length > 2) {
    return { type: "tone_shift", confidence: 0.6 };
  }
  
  // Retry (very short after long)
  if (currentPrompt.length < 20 && lastPrompt.length > 100) {
    return { type: "retry", confidence: 0.5 };
  }
  
  return { type: null, confidence: 0 };
}

// Detect intent from prompt
function detectIntent(prompt: string): { intent: string; confidence: number } {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        return { intent, confidence: 0.75 };
      }
    }
  }
  return { intent: "exploration", confidence: 0.4 }; // Default
}

// Analyze response for outcome signals
function analyzeOutcome(
  response: string,
  depth: string,
  hadFriction: boolean
): { outcome: string; confidence: number } {
  const responseLength = response.length;
  const hasStructure = /\n-|\n\d+\.|###|##/.test(response);
  const hasConclusiveLanguage = /therefore|in conclusion|to summarize|the answer is|you should/i.test(response);
  
  // High-quality structured response after friction = clarity
  if (hadFriction && hasStructure && responseLength > 500) {
    return { outcome: "clarity", confidence: 0.85 };
  }
  
  // Deep thinking with conclusive language = decision/idea
  if (depth === "multi_step" || depth === "recursive") {
    if (hasConclusiveLanguage) {
      return { outcome: "decision", confidence: 0.7 };
    }
    return { outcome: "idea", confidence: 0.6 };
  }
  
  // Default to clarity for completed interactions
  if (responseLength > 200) {
    return { outcome: "clarity", confidence: 0.5 };
  }
  
  return { outcome: "clarity", confidence: 0.4 };
}

// Calculate upgrade signal score
function calculateUpgradeScore(
  depth: string,
  clarityMoments: number,
  frictionCount: number,
  messageCount: number,
  creditsRemaining: number
): number {
  let score = 0;
  
  // Depth bonus
  const depthScores: Record<string, number> = {
    surface: 0,
    structured: 10,
    multi_step: 25,
    recursive: 35,
    meta: 40
  };
  score += depthScores[depth] || 0;
  
  // Clarity moments (each one is a value moment)
  score += clarityMoments * 15;
  
  // Friction recovery (worked through problems)
  if (frictionCount > 0 && clarityMoments > 0) {
    score += 10;
  }
  
  // Engagement depth
  if (messageCount >= 5) score += 10;
  if (messageCount >= 10) score += 10;
  
  // Low credits = urgency
  if (creditsRemaining < 50) score += 15;
  if (creditsRemaining < 20) score += 10;
  
  return Math.min(100, score);
}

// Zod schema for input validation
const AnalyzeRequestSchema = z.object({
  userId: z.string().max(100).optional(),
  fingerprint: z.string().max(100).optional(),
  sessionId: z.string().max(100),
  prompt: z.string().max(50000), // 50KB limit
  response: z.string().max(100000), // 100KB limit (can be longer than prompts)
  previousPrompts: z.array(z.string().max(10000)).max(20).optional(),
  conversationLength: z.number().int().min(0).max(1000).optional(),
  tokensUsed: z.number().int().min(0).max(10000000).optional(),
  creditsSpent: z.number().int().min(0).max(1000000).optional(),
  creditsRemaining: z.number().int().min(0).max(10000000).optional(),
  model: z.string().max(100).optional()
});

type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate request body with Zod
    let validatedInput: AnalyzeRequest;
    try {
      const rawBody = await req.json();
      validatedInput = AnalyzeRequestSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return new Response(
          JSON.stringify({ error: "Invalid request", details: error.errors.map(e => e.message) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const {
      userId,
      fingerprint,
      sessionId,
      prompt,
      response,
      previousPrompts = [],
      conversationLength = 1,
      tokensUsed = 0,
      creditsSpent = 0,
      creditsRemaining = 100,
      model = "unknown"
    } = validatedInput;

    // Analyze the interaction
    const intentAnalysis = detectIntent(prompt);
    const depthAnalysis = analyzeDepth(prompt, conversationLength);
    const frictionAnalysis = detectFriction(prompt, previousPrompts);
    const outcomeAnalysis = analyzeOutcome(response, depthAnalysis.depth, !!frictionAnalysis.type);

    const events = [];
    const baseMetadata = {
      model,
      tokens_used: tokensUsed,
      credits_spent: creditsSpent,
      conversation_length: conversationLength
    };

    // Log intent event
    events.push({
      user_id: userId || null,
      fingerprint: userId ? null : fingerprint,
      session_id: sessionId,
      event_type: `intent_${intentAnalysis.intent}`,
      event_value: intentAnalysis.intent,
      confidence: intentAnalysis.confidence,
      metadata: baseMetadata
    });

    // Log depth event
    events.push({
      user_id: userId || null,
      fingerprint: userId ? null : fingerprint,
      session_id: sessionId,
      event_type: `depth_${depthAnalysis.depth}`,
      event_value: depthAnalysis.depth,
      confidence: depthAnalysis.confidence,
      metadata: baseMetadata
    });

    // Log friction if detected
    if (frictionAnalysis.type) {
      events.push({
        user_id: userId || null,
        fingerprint: userId ? null : fingerprint,
        session_id: sessionId,
        event_type: `friction_${frictionAnalysis.type}`,
        event_value: frictionAnalysis.type,
        confidence: frictionAnalysis.confidence,
        metadata: baseMetadata
      });
    }

    // Log outcome
    events.push({
      user_id: userId || null,
      fingerprint: userId ? null : fingerprint,
      session_id: sessionId,
      event_type: `outcome_${outcomeAnalysis.outcome}`,
      event_value: outcomeAnalysis.outcome,
      confidence: outcomeAnalysis.confidence,
      metadata: baseMetadata
    });

    // Insert events
    const { error: eventsError } = await supabase
      .from("shadow_events")
      .insert(events);

    if (eventsError) {
      console.error("Failed to insert shadow events:", eventsError);
    }

    // Update or create session aggregate
    const { data: existingSession } = await supabase
      .from("shadow_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    const frictionCount = (existingSession?.friction_count || 0) + (frictionAnalysis.type ? 1 : 0);
    const clarityMoments = (existingSession?.clarity_moments || 0) + 
      (outcomeAnalysis.outcome === "clarity" && outcomeAnalysis.confidence > 0.6 ? 1 : 0);
    const messageCount = (existingSession?.message_count || 0) + 1;
    const totalTokens = (existingSession?.total_tokens || 0) + tokensUsed;
    const totalCredits = (existingSession?.total_credits_spent || 0) + creditsSpent;

    // Calculate upgrade score
    const upgradeScore = calculateUpgradeScore(
      depthAnalysis.depth,
      clarityMoments,
      frictionCount,
      messageCount,
      creditsRemaining
    );

    // Determine dominant intent and max depth
    const depthOrder = ["surface", "structured", "multi_step", "recursive", "meta"];
    const currentMaxDepth = existingSession?.max_depth || "surface";
    const maxDepth = depthOrder.indexOf(depthAnalysis.depth) > depthOrder.indexOf(currentMaxDepth)
      ? depthAnalysis.depth
      : currentMaxDepth;

    if (existingSession) {
      await supabase
        .from("shadow_sessions")
        .update({
          dominant_intent: intentAnalysis.intent,
          max_depth: maxDepth,
          friction_count: frictionCount,
          clarity_moments: clarityMoments,
          message_count: messageCount,
          total_tokens: totalTokens,
          total_credits_spent: totalCredits,
          upgrade_signal_score: upgradeScore,
          last_activity_at: new Date().toISOString()
        })
        .eq("session_id", sessionId);
    } else {
      await supabase
        .from("shadow_sessions")
        .insert({
          session_id: sessionId,
          user_id: userId || null,
          fingerprint: userId ? null : fingerprint,
          dominant_intent: intentAnalysis.intent,
          max_depth: depthAnalysis.depth,
          friction_count: frictionAnalysis.type ? 1 : 0,
          clarity_moments: outcomeAnalysis.outcome === "clarity" ? 1 : 0,
          message_count: 1,
          total_tokens: tokensUsed,
          total_credits_spent: creditsSpent,
          upgrade_signal_score: upgradeScore
        });
    }

    // Check upgrade triggers
    let upgradeMessage = null;
    if (!userId && upgradeScore >= 50) {
      const { data: triggers } = await supabase
        .from("upgrade_triggers")
        .select("*")
        .eq("active", true)
        .order("priority", { ascending: false });

      for (const trigger of triggers || []) {
        const conditions = trigger.conditions;
        let matches = true;

        if (conditions.min_depth) {
          const required = depthOrder.indexOf(conditions.min_depth);
          const current = depthOrder.indexOf(maxDepth);
          if (current < required) matches = false;
        }

        if (conditions.clarity_moments_min && clarityMoments < conditions.clarity_moments_min) {
          matches = false;
        }

        if (conditions.credits_remaining_max && creditsRemaining > conditions.credits_remaining_max) {
          matches = false;
        }

        if (matches) {
          upgradeMessage = trigger.message;
          break;
        }
      }
    }

    console.log(`Shadow analysis: session=${sessionId}, depth=${depthAnalysis.depth}, ` +
      `intent=${intentAnalysis.intent}, friction=${frictionAnalysis.type || 'none'}, ` +
      `outcome=${outcomeAnalysis.outcome}, upgradeScore=${upgradeScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          intent: intentAnalysis,
          depth: depthAnalysis,
          friction: frictionAnalysis,
          outcome: outcomeAnalysis,
          upgradeScore,
          upgradeMessage
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Shadow analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
