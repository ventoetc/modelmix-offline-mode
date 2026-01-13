import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Initialize Resend lazily to avoid runtime errors when secret is missing

// Generate a readable password
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendWelcomeEmail(
  email: string, 
  password: string, 
  credits: number,
  createdByEmail: string
): Promise<void> {
  try {
    const appUrl = "https://modelmix.app";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.warn("RESEND_API_KEY not set; skipping welcome email");
      return;
    }
    const resend = new Resend(resendKey);
    
    const { error } = await resend.emails.send({
      from: "ModelMix <onboarding@resend.dev>",
      to: [email],
      subject: "🔑 Your ModelMix Beta Account is Ready!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fdfcfa; margin: 0; padding: 40px 20px; }
              .container { max-width: 540px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(124, 58, 237, 0.1); }
              .logo { text-align: center; margin-bottom: 24px; }
              .logo-icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%); border-radius: 14px; color: white; font-weight: 700; font-size: 22px; }
              h1 { color: #2d2a26; font-size: 26px; text-align: center; margin: 0 0 8px 0; }
              .subtitle { color: #7c3aed; font-size: 14px; font-weight: 600; text-align: center; margin-bottom: 28px; }
              p { color: #5c574f; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0; }
              .credentials-box { background: linear-gradient(135deg, #f8f6f3 0%, #f3f1ee 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e8e4df; }
              .credential-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e8e4df; }
              .credential-row:last-child { border-bottom: none; }
              .credential-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8a857d; }
              .credential-value { font-family: 'SF Mono', 'Monaco', monospace; font-size: 15px; font-weight: 600; color: #2d2a26; }
              .password-value { color: #7c3aed; background: #f3f1ee; padding: 6px 12px; border-radius: 6px; }
              .credits-badge { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%); color: white; padding: 8px 16px; border-radius: 100px; font-size: 14px; font-weight: 600; margin: 4px 0; }
              .cta { display: block; background: linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-weight: 600; text-align: center; margin: 28px 0; font-size: 16px; }
              .steps { background: #faf9f7; border-radius: 12px; padding: 20px; margin: 24px 0; }
              .steps h3 { color: #2d2a26; font-size: 15px; margin: 0 0 14px 0; }
              .steps ol { margin: 0; padding-left: 22px; color: #5c574f; font-size: 14px; line-height: 1.9; }
              .warning { background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #856404; }
              .footer { text-align: center; font-size: 12px; color: #8a857d; margin-top: 32px; padding-top: 20px; border-top: 1px solid #e8e4df; }
              .created-by { font-size: 12px; color: #8a857d; text-align: center; margin-top: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">
                <div class="logo-icon">M²</div>
              </div>
              <h1>Your Beta Account is Ready!</h1>
              <p class="subtitle">Exclusive Tester Access</p>
              
              <p>Welcome to ModelMix! You've been personally invited to join our private beta. Your account is ready with full tester privileges.</p>
              
              <div class="credentials-box">
                <div class="credential-row">
                  <span class="credential-label">Email</span>
                  <span class="credential-value">${email}</span>
                </div>
                <div class="credential-row">
                  <span class="credential-label">Password</span>
                  <span class="credential-value password-value">${password}</span>
                </div>
                <div class="credential-row">
                  <span class="credential-label">Starting Credits</span>
                  <span class="credits-badge">${credits} credits</span>
                </div>
              </div>
              
              <div class="warning">
                ⚠️ <strong>Save your password!</strong> This is the only time it will be shown. You can reset it later if needed.
              </div>
              
              <div class="steps">
                <h3>Getting Started:</h3>
                <ol>
                  <li>Click the button below to open ModelMix</li>
                  <li>Go to <strong>Tester Access</strong> from the menu</li>
                  <li>Sign in with your email and password above</li>
                  <li>Start comparing AI models side-by-side!</li>
                </ol>
              </div>
              
              <a href="${appUrl}/tester-access?email=${encodeURIComponent(email)}" class="cta">Sign In to ModelMix →</a>
              
              <p>As a tester, you have unlimited access to compare responses from GPT-4, Claude, Gemini, and more. Your feedback helps shape the product!</p>
              
              <p class="created-by">Account created by ${createdByEmail}</p>
              
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
      console.error("Failed to send welcome email:", error);
    } else {
      console.log(`Welcome email sent to ${email}`);
    }
  } catch (err) {
    console.error("Error sending welcome email:", err);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, startingCredits = 500, sendEmail = true } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const password = generatePassword();

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (createError) {
      console.error("Create user error:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add tester role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "tester" });

    // Record in test_accounts for tracking
    await supabaseAdmin
      .from("test_accounts")
      .insert({
        email,
        created_by: caller.id,
        starting_credits: startingCredits,
        description: `Created by ${caller.email}`
      });

    // Create credit account with starting credits
    if (startingCredits > 0) {
      const { data: creditAccount } = await supabaseAdmin
        .from("user_credits")
        .insert({
          user_id: newUser.user.id,
          balance: startingCredits,
          lifetime_earned: startingCredits
        })
        .select("id")
        .single();

      if (creditAccount) {
        await supabaseAdmin
          .from("credit_transactions")
          .insert({
            credit_account_id: creditAccount.id,
            amount: startingCredits,
            balance_after: startingCredits,
            source: "admin_grant",
            description: `Tester account created by ${caller.email}`
          });
      }
    }

    // Send welcome email with credentials
    if (sendEmail) {
      await sendWelcomeEmail(email, password, startingCredits, caller.email || "Admin");
    }

    console.log(`Test user created: ${email} by ${caller.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        email,
        password,
        userId: newUser.user.id,
        emailSent: sendEmail,
        message: sendEmail 
          ? "Test user created and welcome email sent with credentials."
          : "Test user created. Save this password - it won't be shown again."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error creating test user:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
