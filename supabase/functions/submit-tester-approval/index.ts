import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { inviteCode, email } = await req.json();

    if (!inviteCode || !email) {
      return new Response(
        JSON.stringify({ error: "Missing inviteCode or email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate invite code
    const { data: invite, error: inviteError } = await supabase
      .from("tester_invites")
      .select("*")
      .eq("invite_code", inviteCode)
      .eq("is_active", true)
      .maybeSingle();

    if (inviteError || !invite) {
      console.error("Invalid invite code:", inviteCode);
      return new Response(
        JSON.stringify({ error: "Invalid invite code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already at max uses
    if (invite.uses_count >= invite.max_uses) {
      return new Response(
        JSON.stringify({ error: "Invite code has reached its limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already pending
    const { data: existing } = await supabase
      .from("pending_tester_approvals")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Already submitted for approval" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create pending approval
    const { error: insertError } = await supabase
      .from("pending_tester_approvals")
      .insert({
        user_id: user.id,
        email,
        invite_code: inviteCode,
        team_name: invite.team_name,
        status: "pending"
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit approval request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment uses count
    await supabase
      .from("tester_invites")
      .update({ uses_count: invite.uses_count + 1 })
      .eq("id", invite.id);

    console.log(`Tester approval submitted: ${email} for ${invite.team_name}`);

    return new Response(
      JSON.stringify({ success: true, message: "Approval request submitted" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});