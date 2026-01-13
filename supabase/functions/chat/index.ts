import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ProviderRouter } from "./providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-modelmix-context-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Model tier for multiplier calculation (used for credit estimation)
const MODEL_TIERS: Record<string, string> = {
  // Flash tier - cheaper models
  "google/gemini-2.0-flash": "flash",
  "google/gemini-1.5-flash": "flash",
  "openai/gpt-4o-mini": "flash",
  "openai/gpt-3.5-turbo": "flash",
  "anthropic/claude-3-haiku": "flash",
  "anthropic/claude-3.5-haiku": "flash",
  "mistralai/ministral-8b": "flash",
  "deepseek/deepseek-chat": "flash",

  // Pro tier - standard models
  "google/gemini-1.5-pro": "pro",
  "openai/gpt-4o": "pro",
  "openai/gpt-4-turbo": "pro",
  "anthropic/claude-3-sonnet": "pro",
  "anthropic/claude-3.5-sonnet": "pro",
  "mistralai/mistral-large": "pro",
  "x-ai/grok-2": "pro",

  // Premium tier - most capable models
  "openai/o1": "premium",
  "openai/o3": "premium",
  "anthropic/claude-3-opus": "premium",
  "anthropic/claude-4": "premium",
  "anthropic/claude-4.5-opus": "premium",
  "deepseek/deepseek-r1": "premium",
};

// Get tier for a model (default to pro if unknown)
function getModelTier(model: string): string {
  // Exact match
  if (MODEL_TIERS[model]) return MODEL_TIERS[model];

  // Fuzzy match for variations
  for (const [key, tier] of Object.entries(MODEL_TIERS)) {
    if (model.includes(key.split("/")[1])) return tier;
  }

  // Default to pro tier
  return "pro";
}

// Zod schemas for input validation
const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(50000) // 50KB per message limit
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  model: z.string().max(100).optional(),
  maxTokens: z.number().int().min(1).max(32768).optional(),
  systemPrompt: z.string().max(10000).optional(),
  fingerprint: z.string().max(100).optional(),
  referralCode: z.string().max(50).optional(),
  usageType: z.string().max(50).optional(),
  sessionId: z.string().max(100).optional(),
  previousPrompts: z.array(z.string().max(10000)).max(20).optional(),
  slotPersonality: z.string().max(500).optional(), // Personality-based system prompt for slot diversity
  userApiKeys: z.object({
    openai: z.string().optional(),
    anthropic: z.string().optional(),
    google: z.string().optional(),
    xai: z.string().optional(),
    mistral: z.string().optional(),
    deepseek: z.string().optional(),
    openrouter: z.string().optional(),
  }).optional(), // BYOK: User-provided API keys (temporary - stored in localStorage)
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

interface CreditConfig {
  trial_credits: number;
  signup_bonus: number;
  referral_bonus_referrer: number;
  referral_bonus_referee: number;
  tokens_per_credit: number;
  multiplier_flash: number;
  multiplier_pro: number;
  multiplier_premium: number;
  multiplier_admin: number;
  max_credits_per_minute: number;
  overdraft_threshold: number;
  daily_refresh: number;
}

async function getConfig(supabase: any): Promise<CreditConfig> {
  const { data } = await supabase.from("credit_config").select("key, value");
  const config: any = {};
  for (const row of data || []) {
    config[row.key] = row.value;
  }
  return {
    trial_credits: config.trial_credits || 500,
    signup_bonus: config.signup_bonus || 10,
    referral_bonus_referrer: config.referral_bonus_referrer || 200,
    referral_bonus_referee: config.referral_bonus_referee || 100,
    tokens_per_credit: config.tokens_per_credit || 1000,
    multiplier_flash: config.multiplier_flash || 100,
    multiplier_pro: config.multiplier_pro || 140,
    multiplier_premium: config.multiplier_premium || 200,
    multiplier_admin: config.multiplier_admin || 250,
    max_credits_per_minute: config.max_credits_per_minute || 30,
    overdraft_threshold: config.overdraft_threshold || 110,
    daily_refresh: config.daily_refresh || 100,
  };
}

// Content categories that should trigger steering (not blocking)
const STEER_AWAY_PATTERNS = [
  // Harmful/illegal content
  { pattern: /\b(how to (make|build|create) (a )?(bomb|weapon|explosive))/i, category: "dangerous_content" },
  { pattern: /\b(hack|steal|crack) (into|from|password)/i, category: "malicious_intent" },
  { pattern: /\b(illegal (drugs?|substances?))/i, category: "illegal_content" },
  // Medical/legal advice
  { pattern: /\b(should i (take|stop taking) (my )?(medication|medicine))/i, category: "medical_advice" },
  { pattern: /\b(is (this|it) legal (to|if i))/i, category: "legal_advice" },
  { pattern: /\b(sue|lawsuit|legal action against)/i, category: "legal_advice" },
  // Financial advice
  { pattern: /\b(should i (invest|buy|sell) (stocks?|crypto|bitcoin))/i, category: "financial_advice" },
  { pattern: /\b(guaranteed (returns?|profit|money))/i, category: "financial_advice" },
  // Self-harm
  { pattern: /\b(ways? to (hurt|harm|kill) (myself|yourself))/i, category: "self_harm" },
  { pattern: /\b(suicide methods?|how to end (my |it all))/i, category: "self_harm" },
];

// Steering responses by category - helpful redirection without judgment
const STEERING_RESPONSES: Record<string, string> = {
  dangerous_content: "I'm designed to help with creative ideation, brainstorming, and comparing AI perspectives. For safety-related questions, I'd recommend consulting official resources. How can I help you with a creative or analytical challenge instead?",
  malicious_intent: "ModelMix is built to help with ideation and exploring different AI perspectives. For cybersecurity learning, I'd suggest ethical hacking courses or official certifications. What creative or analytical topic can I help you explore?",
  illegal_content: "I'm here to help with creative thinking and comparing AI responses. For health-related questions, please consult qualified healthcare professionals. Is there a creative project or idea I can help you develop?",
  medical_advice: "I'm not able to provide medical advice - that's best handled by healthcare professionals who know your situation. ModelMix is great for brainstorming, research comparisons, and creative ideation. What can I help you explore in those areas?",
  legal_advice: "For legal questions, I'd recommend consulting with a qualified attorney who can review your specific situation. I'm better suited for creative ideation and comparing different perspectives. What ideas would you like to explore?",
  financial_advice: "Financial decisions are best made with a qualified financial advisor who understands your circumstances. I'm designed for ideation and comparing AI perspectives. What creative or analytical topic interests you?",
  self_harm: "I care about your wellbeing. If you're struggling, please reach out to a crisis helpline - they're available 24/7 and can provide real support. In the meantime, I'm here if you'd like to explore creative ideas or just chat about something that interests you."
};

// Check content and return steering response if needed (no credits deducted)
function checkContentModeration(messages: Array<{role: string, content: string}>): { shouldSteer: boolean; response?: string; category?: string } {
  const userMessages = messages.filter(m => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || "";
  const combinedContent = userMessages.map(m => m.content).join(" ");
  
  for (const { pattern, category } of STEER_AWAY_PATTERNS) {
    if (pattern.test(lastUserMessage) || pattern.test(combinedContent)) {
      return { 
        shouldSteer: true, 
        response: STEERING_RESPONSES[category] || STEERING_RESPONSES.dangerous_content,
        category 
      };
    }
  }
  
  return { shouldSteer: false };
}

// Report abuse to the abuse_reports table
async function reportAbuse(
  supabase: any,
  userId: string | null,
  fingerprint: string | null,
  sessionId: string,
  abuseType: string,
  severity: "low" | "medium" | "high" | "critical",
  confidence: number,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from("abuse_reports").insert({
      user_id: userId,
      fingerprint,
      session_id: sessionId,
      abuse_type: abuseType,
      severity,
      confidence,
      detected_by: "system",
      metadata
    });
    console.log(`Abuse reported: ${abuseType} (${severity}) for session ${sessionId}`);
  } catch (error) {
    console.error("Failed to report abuse:", error);
  }
}

// Detect suspicious patterns and report them
async function detectAbusePatterns(
  supabase: any,
  userId: string | null,
  fingerprint: string | null,
  sessionId: string,
  accountId: string,
  config: CreditConfig
) {
  const checks: Promise<void>[] = [];
  
  // Check 1: Excessive rate limit hits (3+ in last 5 minutes)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recentRates } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("credit_account_id", accountId)
    .gte("window_start", fiveMinAgo);
  
  if (recentRates && recentRates.length >= 3) {
    const totalRequests = recentRates.reduce((sum: number, r: any) => sum + r.request_count, 0);
    if (totalRequests > config.max_credits_per_minute * 3) {
      checks.push(reportAbuse(
        supabase, userId, fingerprint, sessionId,
        "rate_abuse",
        "medium",
        0.7,
        { request_count: totalRequests, window_minutes: 5 }
      ));
    }
  }
  
  // Check 2: Rapid fingerprint changes (different fingerprint same session pattern)
  // This is detected by having multiple accounts with similar session_ids
  if (fingerprint && !userId) {
    const { data: similarSessions } = await supabase
      .from("shadow_sessions")
      .select("fingerprint")
      .neq("fingerprint", fingerprint)
      .gte("started_at", fiveMinAgo)
      .limit(10);
    
    // If we see many different fingerprints in quick succession, it's suspicious
    if (similarSessions && similarSessions.length >= 5) {
      const uniqueFingerprints = new Set(similarSessions.map((s: any) => s.fingerprint));
      if (uniqueFingerprints.size >= 3) {
        checks.push(reportAbuse(
          supabase, userId, fingerprint, sessionId,
          "fingerprint_rotation",
          "high",
          0.6,
          { unique_fingerprints: uniqueFingerprints.size }
        ));
      }
    }
  }
  
  await Promise.all(checks);
}

async function getOrCreateCreditAccount(
  supabase: any, 
  userId: string | null, 
  fingerprint: string | null,
  config: CreditConfig,
  referralCode?: string
) {
  // Helper: check if daily refresh is due
  const checkDailyRefresh = async (account: any) => {
    if (config.daily_refresh <= 0) return account;
    
    const lastUpdate = new Date(account.updated_at);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    // If more than 24 hours since last update and balance is low, grant daily refresh
    if (hoursSinceUpdate >= 24 && account.balance < config.daily_refresh) {
      const refreshAmount = config.daily_refresh - account.balance;
      if (refreshAmount > 0) {
        const newBalance = account.balance + refreshAmount;
        const newEarned = account.lifetime_earned + refreshAmount;
        
        await supabase
          .from("user_credits")
          .update({ 
            balance: newBalance,
            lifetime_earned: newEarned,
            updated_at: now.toISOString()
          })
          .eq("id", account.id);
        
        await supabase.from("credit_transactions").insert({
          credit_account_id: account.id,
          amount: refreshAmount,
          balance_after: newBalance,
          source: "daily_refresh",
          description: "Daily credits refresh",
          usage_type: "system"
        });
        
        console.log(`Daily refresh: +${refreshAmount} credits for account ${account.id}`);
        return { ...account, balance: newBalance, lifetime_earned: newEarned };
      }
    }
    return account;
  };

  // First: check if user has an account by user_id
  if (userId) {
    const { data: userAccount } = await supabase
      .from("user_credits")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (userAccount) {
      return checkDailyRefresh(userAccount);
    }
    
    // User is authenticated but has no account - check if they have a fingerprint account to migrate
    if (fingerprint) {
      const { data: fingerprintAccount } = await supabase
        .from("user_credits")
        .select("*")
        .eq("fingerprint", fingerprint)
        .is("user_id", null)
        .maybeSingle();
      
      if (fingerprintAccount) {
        // Migrate fingerprint account to user account
        console.log(`Migrating fingerprint account ${fingerprintAccount.id} to user ${userId}`);
        
        // Add signup bonus since they're now registered
        const bonusCredits = config.signup_bonus;
        const newBalance = fingerprintAccount.balance + bonusCredits;
        const newEarned = fingerprintAccount.lifetime_earned + bonusCredits;
        
        await supabase
          .from("user_credits")
          .update({ 
            user_id: userId,
            balance: newBalance,
            lifetime_earned: newEarned
          })
          .eq("id", fingerprintAccount.id);
        
        // Record the signup bonus
        await supabase.from("credit_transactions").insert({
          credit_account_id: fingerprintAccount.id,
          amount: bonusCredits,
          balance_after: newBalance,
          source: "signup_bonus",
          description: "Signup bonus - account linked to user",
          usage_type: "system"
        });
        
        // Return updated account
        const { data: updatedAccount } = await supabase
          .from("user_credits")
          .select("*")
          .eq("id", fingerprintAccount.id)
          .single();
        
        return updatedAccount;
      }
    }
  } else if (fingerprint) {
    // Anonymous user - check fingerprint
    const { data: fingerprintAccount } = await supabase
      .from("user_credits")
      .select("*")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    
    if (fingerprintAccount) {
      return checkDailyRefresh(fingerprintAccount);
    }
  }
  
  // No existing account found - create new one
  const isRegistered = !!userId;
  let referredBy = null;
  
  if (isRegistered && referralCode) {
    const { data: referrer } = await supabase
      .from("user_credits")
      .select("id, user_id")
      .eq("referral_code", referralCode)
      .maybeSingle();
    
    if (referrer) {
      referredBy = referrer.user_id;
      
      // Grant referrer bonus
      const { data: referrerAccount } = await supabase
        .from("user_credits")
        .select("balance, lifetime_earned")
        .eq("id", referrer.id)
        .single();
      
      if (referrerAccount) {
        await supabase
          .from("user_credits")
          .update({ 
            balance: referrerAccount.balance + config.referral_bonus_referrer,
            lifetime_earned: referrerAccount.lifetime_earned + config.referral_bonus_referrer
          })
          .eq("id", referrer.id);
        
        await supabase.from("credit_transactions").insert({
          credit_account_id: referrer.id,
          amount: config.referral_bonus_referrer,
          balance_after: referrerAccount.balance + config.referral_bonus_referrer,
          source: "referral_earned",
          description: "Referral bonus for new user signup",
          usage_type: "system"
        });
      }
    }
  }
  
  const bonusAmount = isRegistered 
    ? (referredBy ? config.signup_bonus + config.referral_bonus_referee : config.signup_bonus)
    : config.trial_credits;
  
  const insertData: any = {
    balance: bonusAmount,
    lifetime_earned: bonusAmount,
    referred_by: referredBy,
  };
  
  if (userId) {
    insertData.user_id = userId;
  } else {
    insertData.fingerprint = fingerprint;
  }
  
  // Handle race condition with insert + conflict fallback
  let newAccount;
  
  if (!userId && fingerprint) {
    // For fingerprint-based accounts, try insert first, fallback to existing on conflict
    const { data: inserted, error: insertError } = await supabase
      .from("user_credits")
      .insert(insertData)
      .select()
      .single();
    
    if (insertError) {
      // Check if it's a unique constraint violation (race condition)
      if (insertError.code === '23505') {
        // Fetch the existing account that won the race
        const { data: existing } = await supabase
          .from("user_credits")
          .select("*")
          .eq("fingerprint", fingerprint)
          .is("user_id", null)
          .maybeSingle();
        
        if (existing) {
          console.log(`Race condition resolved: returning existing account ${existing.id}`);
          return existing;
        }
      }
      
      console.error("Error creating credit account:", insertError);
      throw insertError;
    }
    
    newAccount = inserted;
  } else {
    // For user-based accounts, standard insert
    const { data, error } = await supabase
      .from("user_credits")
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error("Error creating credit account:", error);
      throw error;
    }
    newAccount = data;
  }
  
  const source = isRegistered 
    ? (referredBy ? "referral_bonus" : "signup_bonus") 
    : "trial";
  
  await supabase.from("credit_transactions").insert({
    credit_account_id: newAccount.id,
    amount: bonusAmount,
    balance_after: bonusAmount,
    source,
    description: isRegistered 
      ? (referredBy ? "Signup bonus + referral bonus" : "Welcome bonus for signing up")
      : "Trial credits for new user",
    usage_type: "system"
  });
  
  return newAccount;
}

// Estimate credits needed for a request
function estimateCredits(messages: any[], config: CreditConfig, modelTier: string): number {
  const inputTokens = messages.reduce((acc, m) => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return acc + Math.ceil(content.length / 4);
  }, 0);
  
  // Estimate output at 2x input (conservative)
  const estimatedOutputTokens = inputTokens * 2;
  const totalTokens = inputTokens + estimatedOutputTokens;
  
  // Apply model multiplier
  const multiplierKey = `multiplier_${modelTier}` as keyof CreditConfig;
  const multiplier = (config[multiplierKey] as number || 100) / 100;
  
  return Math.ceil((totalTokens / config.tokens_per_credit) * multiplier);
}

// Check rate limits
async function checkRateLimit(
  supabase: any,
  accountId: string,
  estimatedCredits: number,
  config: CreditConfig
): Promise<{ allowed: boolean; message?: string }> {
  const windowStart = new Date();
  windowStart.setSeconds(0, 0); // Round to minute
  
  const { data: rateData } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("credit_account_id", accountId)
    .gte("window_start", new Date(Date.now() - 60000).toISOString())
    .single();
  
  const currentSpent = rateData?.credits_spent || 0;
  
  if (currentSpent + estimatedCredits > config.max_credits_per_minute) {
    return { 
      allowed: false, 
      message: `Rate limit exceeded. Please wait a moment before sending another message. (${currentSpent}/${config.max_credits_per_minute} credits this minute)` 
    };
  }
  
  return { allowed: true };
}

// Create credit hold
async function createHold(
  supabase: any,
  accountId: string,
  amount: number,
  reason: string = "streaming"
): Promise<string | null> {
  const { data, error } = await supabase
    .from("credit_holds")
    .insert({
      credit_account_id: accountId,
      amount,
      reason,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min expiry
    })
    .select()
    .single();
  
  if (error) {
    console.error("Failed to create hold:", error);
    return null;
  }
  
  // Reduce available balance
  await supabase
    .from("user_credits")
    .update({ balance: supabase.rpc ? undefined : -amount }) // Will be handled below
    .eq("id", accountId);
  
  // Actually decrement
  const { data: current } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("id", accountId)
    .single();
  
  if (current) {
    await supabase
      .from("user_credits")
      .update({ balance: current.balance - amount })
      .eq("id", accountId);
  }
  
  return data.id;
}

// Release hold and finalize
async function releaseHold(
  supabase: any,
  holdId: string,
  accountId: string,
  actualCredits: number,
  heldAmount: number,
  usageType: string,
  tokensUsed: number
) {
  // Mark hold as released
  await supabase
    .from("credit_holds")
    .update({ released: true })
    .eq("id", holdId);
  
  // Calculate refund (held - actual)
  const refund = Math.max(0, heldAmount - actualCredits);
  
  // Get current state
  const { data: current } = await supabase
    .from("user_credits")
    .select("balance, lifetime_spent")
    .eq("id", accountId)
    .single();
  
  if (current) {
    const newBalance = current.balance + refund;
    const newSpent = current.lifetime_spent + actualCredits;
    
    await supabase
      .from("user_credits")
      .update({ 
        balance: newBalance,
        lifetime_spent: newSpent
      })
      .eq("id", accountId);
    
    // Record transaction
    await supabase.from("credit_transactions").insert({
      credit_account_id: accountId,
      amount: -actualCredits,
      balance_after: newBalance,
      source: "usage",
      description: `AI chat (${tokensUsed} tokens)`,
      usage_type: usageType,
      metadata: { tokens_used: tokensUsed, held: heldAmount, refunded: refund }
    });
  }
  
  // Update rate limit tracking
  const windowStart = new Date();
  windowStart.setSeconds(0, 0);
  
  const { data: existingRate } = await supabase
    .from("rate_limits")
    .select("*")
    .eq("credit_account_id", accountId)
    .gte("window_start", windowStart.toISOString())
    .single();
  
  if (existingRate) {
    await supabase
      .from("rate_limits")
      .update({ 
        credits_spent: existingRate.credits_spent + actualCredits,
        request_count: existingRate.request_count + 1
      })
      .eq("id", existingRate.id);
  } else {
    await supabase
      .from("rate_limits")
      .insert({
        credit_account_id: accountId,
        window_start: windowStart.toISOString(),
        credits_spent: actualCredits,
        request_count: 1
      });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const config = await getConfig(supabase);

    // Validate request body with Zod
    let validatedInput: ChatRequest;
    try {
      const rawBody = await req.json();
      validatedInput = ChatRequestSchema.parse(rawBody);
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

    const { messages, model = "openai/gpt-4o-mini", maxTokens, systemPrompt, fingerprint, referralCode, usageType = "chat", sessionId, previousPrompts = [], slotPersonality, userApiKeys } = validatedInput;

    // Check if user is using BYOK (Bring Your Own Key)
    const isBYOK = userApiKeys && Object.keys(userApiKeys).length > 0;

    // Initialize provider router with user keys (if provided) or environment keys
    // User keys take priority for BYOK support
    const providerRouter = new ProviderRouter({
      openaiKey: userApiKeys?.openai || Deno.env.get("OPENAI_API_KEY"),
      anthropicKey: userApiKeys?.anthropic || Deno.env.get("ANTHROPIC_API_KEY"),
      googleKey: userApiKeys?.google || Deno.env.get("GOOGLE_API_KEY"),
      xaiKey: userApiKeys?.xai || Deno.env.get("XAI_API_KEY"),
      mistralKey: userApiKeys?.mistral || Deno.env.get("MISTRAL_API_KEY"),
      deepseekKey: userApiKeys?.deepseek || Deno.env.get("DEEPSEEK_API_KEY"),
      openrouterKey: userApiKeys?.openrouter || Deno.env.get("OPENROUTER_API_KEY"),
      useOpenRouterFallback: true, // Use OpenRouter as fallback if direct API fails
    });

    const availableProviders = providerRouter.getAvailableProviders();
    if (availableProviders.length === 0) {
      console.error("No API providers configured. Please set at least one API key.");
      return new Response(
        JSON.stringify({
          error: "No AI providers configured. Please add API keys in environment variables or use BYOK.",
          hint: "Required: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, OPENROUTER_API_KEY, or provide your own keys"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Available providers: ${availableProviders.join(", ")}`);
    if (userApiKeys) {
      console.log("Using BYOK mode with user-provided API keys");
    }

    // Use requested model (no validation - let provider router handle it)
    const selectedModel = model;
    const modelTier = getModelTier(selectedModel);

    // Get context ID from header (for tester tracking)
    const contextId = req.headers.get("x-modelmix-context-id") || sessionId || `anon_${Date.now()}`;

    // Get user from auth
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    let isTester = false;
    let isAdmin = false;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;

        // Check if user has tester role
        const { data: hasTesterRole } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'tester'
        });
        isTester = hasTesterRole === true;

        // Check if user has admin role
        const { data: hasAdminRole } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        isAdmin = hasAdminRole === true;

        if (isTester) {
          console.log(`Tester mode activated for user ${user.id}, context: ${contextId}`);
        }
        if (isAdmin) {
          console.log(`Admin access for user ${user.id}`);
        }
      }
    }

    if (!userId && !fingerprint) {
      return new Response(
        JSON.stringify({ error: "No identifier provided. Please provide fingerprint or sign in." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tier-based model access control (skip for admins and BYOK users)
    if (!isAdmin && !isBYOK) {
      const { data: canAccess } = await supabase.rpc('can_user_access_model', {
        p_model_id: selectedModel,
        p_user_id: userId,
        p_fingerprint: fingerprint
      });

      if (!canAccess) {
        const { data: userTier } = await supabase.rpc('get_user_tier', {
          p_user_id: userId,
          p_fingerprint: fingerprint
        });

        console.log(`Access denied: tier=${userTier}, model=${selectedModel}, userId=${userId}, fingerprint=${fingerprint}`);

        return new Response(
          JSON.stringify({
            error: "Model not available for your tier",
            tier: userTier,
            model: selectedModel,
            message: userTier === 'guest'
              ? "Please sign up for free to access more models."
              : "This model requires a higher tier. Upgrade to access premium models."
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (isBYOK) {
      console.log(`BYOK mode: Bypassing tier check for model ${selectedModel}`);
    }

    // Check if user is banned
    const { data: banStatus } = await supabase.rpc('is_user_banned', {
      _user_id: userId || null,
      _fingerprint: fingerprint || null
    });
    
    if (banStatus && banStatus.length > 0 && banStatus[0].is_banned) {
      const ban = banStatus[0];
      console.log(`Banned user attempted access: userId=${userId}, fingerprint=${fingerprint}, reason=${ban.ban_reason}`);
      return new Response(
        JSON.stringify({ 
          error: "Access denied", 
          reason: ban.ban_reason || "Account suspended",
          severity: ban.ban_severity,
          expires_at: ban.expires_at
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Content moderation - steer away without deducting credits
    const moderationResult = checkContentModeration(messages);
    if (moderationResult.shouldSteer) {
      console.log(`Content moderation triggered: category=${moderationResult.category}, userId=${userId}, fingerprint=${fingerprint}`);
      
      // Report for tracking but low severity since we're steering, not blocking
      await reportAbuse(
        supabase, userId, fingerprint || null, contextId,
        `content_${moderationResult.category}`,
        "low",
        0.8,
        { category: moderationResult.category, steered: true }
      );
      
      // Return helpful steering response - NO credits deducted
      return new Response(
        JSON.stringify({
          content: moderationResult.response,
          model: selectedModel,
          tokens: { prompt: 0, completion: 0, total: 0 },
          steered: true,
          category: moderationResult.category
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create credit account (skip for BYOK users - they pay directly via their API keys)
    let creditAccount: any = null;
    let estimatedCredits = 0;
    let holdId: string | null = null;

    if (!isBYOK) {
      creditAccount = await getOrCreateCreditAccount(
        supabase,
        userId,
        fingerprint || null,
        config,
        referralCode
      );

      // Run abuse detection in background (don't block the request)
      detectAbusePatterns(supabase, userId, fingerprint || null, contextId, creditAccount.id, config)
        .catch(err => console.error("Abuse detection error:", err));

      // Estimate credits needed
      estimatedCredits = estimateCredits(messages, config, modelTier);
    }

    // BYOK BYPASS: Skip credit checks entirely when user provides own API keys
    if (isBYOK) {
      console.log(`BYOK bypass: User is using their own API keys, skipping all credit checks`);
      holdId = `byok_${Date.now()}`;
    } else if (isTester) {
      // TESTER BYPASS: Skip credit checks but still track usage
      console.log(`Tester bypass: Skipping credit check for ${userId}, estimated=${estimatedCredits}, context=${contextId}`);
      // Create a "shadow" hold at 0 cost for tracking purposes
      holdId = `tester_${Date.now()}`;
    } else {
      // Normal credit flow for non-testers
      
      // Check overdraft threshold
      const requiredBalance = Math.ceil(estimatedCredits * (config.overdraft_threshold / 100));
      
      if (creditAccount.balance < requiredBalance) {
        const isRegistered = !!userId;
        console.log(`Insufficient credits: ${creditAccount.balance} < ${requiredBalance} (estimated: ${estimatedCredits})`);
        return new Response(
          JSON.stringify({ 
            error: "Insufficient credits",
            balance: creditAccount.balance,
            required: requiredBalance,
            isRegistered,
            message: isRegistered 
              ? "Your credit balance is too low for this request. Earn more through referrals or purchase credits!"
              : "Your trial credits are running low. Sign up to get 500 free credits!"
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check rate limit
      const rateCheck = await checkRateLimit(supabase, creditAccount.id, estimatedCredits, config);
      if (!rateCheck.allowed) {
        // Report rate limit abuse
        await reportAbuse(
          supabase, userId, fingerprint || null, contextId,
          "rate_limit_exceeded",
          "medium",
          0.9,
          { message: rateCheck.message, estimated_credits: estimatedCredits }
        );
        
        return new Response(
          JSON.stringify({ error: rateCheck.message }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create credit hold
      holdId = await createHold(supabase, creditAccount.id, estimatedCredits, "streaming");
      if (!holdId) {
        return new Response(
          JSON.stringify({ error: "Failed to reserve credits. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Processing chat: user=${userId || fingerprint}, balance=${creditAccount?.balance || 'BYOK'}, estimated=${estimatedCredits}, hold=${holdId}, tester=${isTester}, byok=${isBYOK}, context=${contextId}`);

    // Determine system prompt: use slot personality if provided, otherwise default
    const defaultSystemPrompt = "You are a helpful AI assistant. Provide clear, concise, and accurate responses. Format your answers with markdown when appropriate.";
    const systemPromptContent = (systemPrompt && systemPrompt.trim())
      ? systemPrompt.trim()
      : slotPersonality
        ? `${slotPersonality}\n\nRespond in markdown format. Keep initial responses concise (2-3 paragraphs max).`
        : defaultSystemPrompt;

    // Prepare messages with system prompt
    const finalMessages = [
      {
        role: "system" as const,
        content: systemPromptContent
      },
      ...messages,
    ];

    // Query cheapest API provider for this model
    let preferredProvider: string | undefined;
    const { data: costPreference } = await supabase
      .from("api_cost_preferences")
      .select("preferred_provider, cost_per_1m_tokens")
      .eq("model_id", selectedModel)
      .maybeSingle();

    if (costPreference) {
      preferredProvider = costPreference.preferred_provider;
      console.log(`Cheapest provider for ${selectedModel}: ${preferredProvider} ($${costPreference.cost_per_1m_tokens}/1M tokens)`);
    }

    // Route to appropriate AI provider
    let response: Response;
    let providerUsed: string;

    try {
      const routeResult = await providerRouter.route(
        {
          model: selectedModel,
          messages: finalMessages,
          stream: true,
          maxTokens,
        },
        preferredProvider
      );

      response = routeResult.response;
      providerUsed = routeResult.provider;
      console.log(`Successfully routed ${selectedModel} to ${providerUsed}`);

    } catch (error) {
      // Release hold on routing error (skip for BYOK and testers)
      if (!isTester && !isBYOK && holdId && !holdId.startsWith('tester_') && !holdId.startsWith('byok_')) {
        await releaseHold(supabase, holdId, creditAccount.id, 0, estimatedCredits, usageType, 0);
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Provider routing failed: ${errorMessage}`);

      return new Response(
        JSON.stringify({
          error: "AI provider error",
          details: errorMessage,
          availableProviders: availableProviders
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      // Release hold on error (skip for BYOK and testers)
      if (!isTester && !isBYOK && holdId && !holdId.startsWith('tester_') && !holdId.startsWith('byok_')) {
        await releaseHold(supabase, holdId, creditAccount.id, 0, estimatedCredits, usageType, 0);
      }

      const errorText = await response.text();
      console.error(`AI error (provider=${providerUsed}, tester=${isTester}):`, response.status, errorText);

      return new Response(
        JSON.stringify({ error: "AI service error", provider: providerUsed }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AI request successful: provider=${providerUsed}`);

    // Stream response and track usage
    const inputTokens = messages.reduce((acc, m) => {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return acc + Math.ceil(content.length / 4);
    }, 0);
    
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body!.getReader();
    
    let outputChars = 0;
    
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          outputChars += value.length;
          await writer.write(value);
        }
        
        // Calculate actual usage
        const outputTokens = Math.ceil(outputChars / 4);
        const totalTokens = inputTokens + outputTokens;
        
        // Apply multiplier (skip for BYOK users)
        const multiplierKey = `multiplier_${modelTier}` as keyof CreditConfig;
        const multiplier = (config[multiplierKey] as number || 100) / 100;
        const actualCredits = (isTester || isBYOK) ? 0 : Math.ceil((totalTokens / config.tokens_per_credit) * multiplier);

        // Release hold and finalize (skip for BYOK and testers)
        if (!isTester && !isBYOK && holdId && !holdId.startsWith('tester_') && !holdId.startsWith('byok_')) {
          await releaseHold(
            supabase, 
            holdId, 
            creditAccount.id, 
            actualCredits, 
            estimatedCredits, 
            usageType,
            totalTokens
          );
          
          // Log to usage_logs for regular users
          await supabase.from("usage_logs").insert({
            context_id: contextId,
            user_id: userId,
            is_tester_session: false,
            model_id: selectedModel,
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            cost_cents: actualCredits, // credits as proxy for cost
            metadata: {
              provider: providerUsed,
              held_credits: estimatedCredits,
              refunded: estimatedCredits - actualCredits
            }
          });
        } else if (isBYOK) {
          // Log BYOK usage for analytics (at $0 cost - user pays via their own API key)
          console.log(`BYOK usage logged: user=${userId}, tokens=${totalTokens}, context=${contextId}, model=${selectedModel}`);

          // Log to usage_logs for BYOK users (tracked but no credits charged)
          await supabase.from("usage_logs").insert({
            context_id: contextId,
            user_id: userId,
            is_tester_session: false,
            model_id: selectedModel,
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            cost_cents: 0, // BYOK users pay via their own keys
            metadata: {
              is_byok: true,
              estimated_credits: Math.ceil((totalTokens / config.tokens_per_credit) * multiplier),
              provider: providerUsed
            }
          });
        } else if (isTester) {
          // Log tester usage for analytics (at $0 cost)
          console.log(`Tester usage logged: user=${userId}, tokens=${totalTokens}, context=${contextId}, model=${selectedModel}`);

          // Record a $0 transaction for tracking
          await supabase.from("credit_transactions").insert({
            credit_account_id: creditAccount.id,
            amount: 0,
            balance_after: creditAccount.balance,
            source: "usage",
            description: `[TESTER] AI chat (${totalTokens} tokens)`,
            usage_type: `tester_${usageType}`,
            metadata: {
              tokens_used: totalTokens,
              is_tester_session: true,
              context_id: contextId,
              model: selectedModel,
              estimated_credits: Math.ceil((totalTokens / config.tokens_per_credit) * multiplier)
            }
          });

          // Log to usage_logs for testers (tracked but free)
          await supabase.from("usage_logs").insert({
            context_id: contextId,
            user_id: userId,
            is_tester_session: true,
            model_id: selectedModel,
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            cost_cents: 0, // testers don't pay
            metadata: {
              estimated_credits: Math.ceil((totalTokens / config.tokens_per_credit) * multiplier),
              provider: providerUsed
            }
          });
        }
        
        // Shadow analysis (non-blocking)
        const currentPrompt = messages.find(m => m.role === 'user')?.content || '';
        const fullResponse = ''; // We don't store content, just metadata
        
        if (sessionId) {
          try {
            const shadowUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/shadow-analyze`;
            fetch(shadowUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                fingerprint: userId ? null : fingerprint,
                sessionId,
                prompt: currentPrompt,
                response: `[${totalTokens} tokens]`, // Don't store content
                previousPrompts,
                conversationLength: messages.filter(m => m.role === 'user').length,
                tokensUsed: totalTokens,
                creditsSpent: actualCredits,
                creditsRemaining: isTester ? creditAccount.balance : creditAccount.balance - actualCredits,
                model: selectedModel,
                contextId: contextId,
                isTesterSession: isTester
              })
            }).catch(e => console.error('Shadow analysis failed:', e));
          } catch (e) {
            console.error('Shadow analysis error:', e);
          }
        }
        
        console.log(`Chat completed: tokens=${totalTokens}, credits=${actualCredits}, held=${estimatedCredits}, tester=${isTester}, context=${contextId}`);
      } catch (e) {
        console.error("Stream error:", e);
        // Release hold with 0 usage on error (skip for testers)
        if (!isTester && holdId && !holdId.startsWith('tester_')) {
          await releaseHold(supabase, holdId, creditAccount.id, 0, estimatedCredits, usageType, 0);
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
