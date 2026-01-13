import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Zod schema for input validation
const CreditsRequestSchema = z.object({
  fingerprint: z.string().max(100).optional(),
  action: z.enum(["balance", "history", "referral-code"]).optional()
});

type CreditsRequest = z.infer<typeof CreditsRequestSchema>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate request body with Zod
    let validatedInput: CreditsRequest;
    try {
      const rawBody = await req.json();
      validatedInput = CreditsRequestSchema.parse(rawBody);
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

    const { fingerprint, action = "balance" } = validatedInput;

    // Get user from auth header if present
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId && !fingerprint) {
      return new Response(
        JSON.stringify({ error: "No identifier provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get credit config
    const { data: configData } = await supabase.from("credit_config").select("key, value");
    const config: Record<string, number> = {};
    for (const row of configData || []) {
      config[row.key] = row.value;
    }

    // Find credit account - check user_id first, then fingerprint
    let creditAccount = null;
    
    if (userId) {
      const { data: userAccount } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      creditAccount = userAccount;
      
      // If no user account but fingerprint provided, check for fingerprint account
      if (!creditAccount && fingerprint) {
        const { data: fingerprintAccount } = await supabase
          .from("user_credits")
          .select("*")
          .eq("fingerprint", fingerprint)
          .is("user_id", null)
          .maybeSingle();
        
        // Migration will happen on next chat request, but show the fingerprint balance for now
        creditAccount = fingerprintAccount;
      }
    } else if (fingerprint) {
      const { data: fingerprintAccount } = await supabase
        .from("user_credits")
        .select("*")
        .eq("fingerprint", fingerprint)
        .maybeSingle();
      
      creditAccount = fingerprintAccount;
    }

    if (!creditAccount) {
      // Return default state for new users
      return new Response(
        JSON.stringify({
          balance: userId ? config.signup_bonus || 500 : config.trial_credits || 100,
          isNewUser: true,
          isRegistered: !!userId,
          referralCode: null,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "history") {
      const { data: transactions } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("credit_account_id", creditAccount.id)
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({
          balance: creditAccount.balance,
          transactions: transactions || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "referral-code") {
      return new Response(
        JSON.stringify({
          referralCode: creditAccount.referral_code,
          referralUrl: `${req.headers.get("origin") || "https://modelmix.app"}?ref=${creditAccount.referral_code}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: return balance
    return new Response(
      JSON.stringify({
        balance: creditAccount.balance,
        isRegistered: !!userId,
        referralCode: creditAccount.referral_code,
        lifetimeEarned: creditAccount.lifetime_earned,
        lifetimeSpent: creditAccount.lifetime_spent,
        tokensPerCredit: config.tokens_per_credit || 1000,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Credits function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
