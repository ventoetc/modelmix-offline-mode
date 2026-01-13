import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Initialize Resend lazily to avoid runtime errors when secret is missing

async function sendApprovalEmail(email: string, teamName: string, credits: number): Promise<void> {
  try {
    const appUrl = "https://modelmix.app";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("RESEND_API_KEY not set; skipping approval email");
      return;
    }
    const resend = new Resend(resendKey);
    
    const { error } = await resend.emails.send({
      from: "ModelMix <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 You're approved for ModelMix Beta!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fdfcfa; margin: 0; padding: 40px 20px; }
              .container { max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(124, 58, 237, 0.1); }
              .logo { text-align: center; margin-bottom: 24px; }
              .logo-icon { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%); border-radius: 12px; color: white; font-weight: 700; font-size: 18px; }
              h1 { color: #2d2a26; font-size: 24px; text-align: center; margin: 0 0 8px 0; }
              .subtitle { color: #7c3aed; font-size: 14px; font-weight: 600; text-align: center; margin-bottom: 24px; }
              p { color: #5c574f; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
              .credits-box { background: linear-gradient(135deg, #f8f6f3 0%, #f3f1ee 100%); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; border: 1px solid #e8e4df; }
              .credits-amount { font-size: 36px; font-weight: 700; color: #7c3aed; }
              .credits-label { font-size: 13px; color: #8a857d; text-transform: uppercase; letter-spacing: 1px; }
              .cta { display: block; background: linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; text-align: center; margin: 24px 0; }
              .features { background: #f8f6f3; border-radius: 12px; padding: 20px; margin: 24px 0; }
              .features h3 { color: #2d2a26; font-size: 14px; margin: 0 0 12px 0; }
              .features ul { margin: 0; padding-left: 20px; color: #5c574f; font-size: 14px; }
              .features li { margin-bottom: 8px; }
              .footer { text-align: center; font-size: 12px; color: #8a857d; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e8e4df; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">
                <div class="logo-icon">M²</div>
              </div>
              <h1>Welcome to ModelMix Beta!</h1>
              <p class="subtitle">${teamName} Team Member</p>
              
              <p>Great news! Your request to join the ModelMix beta has been approved. You now have full access to compare AI models side-by-side.</p>
              
              <div class="credits-box">
                <div class="credits-amount">${credits}</div>
                <div class="credits-label">Welcome Credits</div>
              </div>
              
              <p>These credits let you send prompts to multiple AI models simultaneously and see their responses in real-time.</p>
              
              <a href="${appUrl}/tester-access" class="cta">Start Exploring →</a>
              
              <div class="features">
                <h3>What you can do:</h3>
                <ul>
                  <li>Compare responses from GPT-4, Claude, Gemini, and more</li>
                  <li>Test prompts across models in seconds</li>
                  <li>Discover which AI works best for your tasks</li>
                  <li>Provide feedback to help shape the product</li>
                </ul>
              </div>
              
              <p>Questions or feedback? Just reply to this email — we'd love to hear from you!</p>
              
              <div class="footer">
                ModelMix — Compare AI minds. One prompt, many answers.<br>
                © 2026 ModelMix. All rights reserved.
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send approval email:", error);
    } else {
      console.log(`Approval email sent to ${email}`);
    }
  } catch (err) {
    console.error("Error sending approval email:", err);
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

    // Get admin from auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: admin }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !admin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: admin.id,
      _role: "admin"
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { approvalId, action } = await req.json();

    if (!approvalId || !["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Missing approvalId or invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pending approval
    const { data: pending, error: pendingError } = await supabase
      .from("pending_tester_approvals")
      .select("*")
      .eq("id", approvalId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingError || !pending) {
      return new Response(
        JSON.stringify({ error: "Approval not found or already processed" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const startingCredits = 500;

    // Update approval status
    await supabase
      .from("pending_tester_approvals")
      .update({
        status: newStatus,
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", approvalId);

    // If approved, grant tester role and send email
    if (action === "approve") {
      // Add tester role
      await supabase
        .from("user_roles")
        .insert({
          user_id: pending.user_id,
          role: "tester"
        });

      // Grant starting credits if not already have
      const { data: existingCredits } = await supabase
        .from("user_credits")
        .select("id, balance")
        .eq("user_id", pending.user_id)
        .maybeSingle();

      let finalCredits = startingCredits;

      if (!existingCredits) {
        const { data: newCredits } = await supabase
          .from("user_credits")
          .insert({
            user_id: pending.user_id,
            balance: startingCredits,
            lifetime_earned: startingCredits
          })
          .select("id")
          .single();

        if (newCredits) {
          await supabase
            .from("credit_transactions")
            .insert({
              credit_account_id: newCredits.id,
              amount: startingCredits,
              balance_after: startingCredits,
              source: "admin_grant",
              description: `Tester approval - ${pending.team_name}`
            });
        }
      } else {
        finalCredits = existingCredits.balance;
      }

      // Send approval email (non-blocking)
      sendApprovalEmail(pending.email, pending.team_name, finalCredits).catch(err => {
        console.error("Background email send failed:", err);
      });

      console.log(`Tester approved: ${pending.email} (${pending.team_name}) by ${admin.id}`);
    } else {
      console.log(`Tester rejected: ${pending.email} (${pending.team_name}) by ${admin.id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${action === "approve" ? "approved" : "rejected"}`,
        email: pending.email
      }),
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
