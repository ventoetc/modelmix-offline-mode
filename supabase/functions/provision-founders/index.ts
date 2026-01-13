import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 14; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const resend = new Resend(resendApiKey);

    // Founder accounts to create
    const founders = [
      { email: "charles@ventohost.com", name: "Charles" },
    ];

    const results = [];

    for (const founder of founders) {
      const password = generatePassword();

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === founder.email);

      let userId: string;

      if (existingUser) {
        console.log(`User ${founder.email} already exists, updating...`);
        userId = existingUser.id;
        
        // Update password
        await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: founder.email,
          password,
          email_confirm: true,
        });

        if (createError) {
          console.error(`Failed to create ${founder.email}:`, createError);
          results.push({ email: founder.email, success: false, error: createError.message });
          continue;
        }

        userId = newUser.user.id;
        console.log(`Created user ${founder.email} with ID ${userId}`);
      }

      // Add admin role (upsert to avoid duplicates)
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: userId, role: "admin" },
          { onConflict: "user_id,role" }
        );

      if (roleError) {
        console.error(`Failed to add admin role for ${founder.email}:`, roleError);
      } else {
        console.log(`Added admin role for ${founder.email}`);
      }

      // Create or update credit account with 50 credits
      const { data: existingCredits } = await supabaseAdmin
        .from("user_credits")
        .select("id, balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingCredits) {
        await supabaseAdmin
          .from("user_credits")
          .update({ balance: 50, lifetime_earned: 50 })
          .eq("id", existingCredits.id);
      } else {
        await supabaseAdmin
          .from("user_credits")
          .insert({
            user_id: userId,
            balance: 50,
            lifetime_earned: 50
          });
      }

      // Get credit account for transaction log
      const { data: creditAccount } = await supabaseAdmin
        .from("user_credits")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (creditAccount) {
        await supabaseAdmin
          .from("credit_transactions")
          .insert({
            credit_account_id: creditAccount.id,
            amount: 50,
            balance_after: 50,
            source: "admin",
            description: "Founder account initial credits"
          });
      }

      console.log(`Set 50 credits for ${founder.email}`);

      // Send welcome email with credentials
      try {
        const { error: emailError } = await resend.emails.send({
          from: "Thinking Economy <onboarding@resend.dev>",
          to: [founder.email],
          subject: "🎉 Your Founder Account is Ready!",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="color: #1a1a2e; margin-bottom: 24px;">Welcome, ${founder.name}! 🚀</h1>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Your founder-level admin account for <strong>Thinking Economy</strong> has been created.
              </p>
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin: 24px 0; color: white;">
                <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Login Credentials</h3>
                <p style="margin: 8px 0; font-size: 16px;"><strong>Email:</strong> ${founder.email}</p>
                <p style="margin: 8px 0; font-size: 16px;"><strong>Password:</strong> <code style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px;">${password}</code></p>
              </div>
              
              <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  <strong>🔐 Security Note:</strong> Please change your password after your first login. This is your only copy of the initial password.
                </p>
              </div>
              
              <div style="background: #e8f5e9; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                  <strong>💳 Account Status:</strong> Admin privileges with 50 credits loaded
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                Questions? Just reply to this email.<br><br>
                — The Thinking Economy Team
              </p>
            </div>
          `,
        });

        if (emailError) {
          console.error(`Failed to send email to ${founder.email}:`, emailError);
          results.push({ email: founder.email, success: true, emailSent: false, password });
        } else {
          console.log(`Email sent to ${founder.email}`);
          results.push({ email: founder.email, success: true, emailSent: true });
        }
      } catch (emailErr) {
        console.error(`Email error for ${founder.email}:`, emailErr);
        results.push({ email: founder.email, success: true, emailSent: false, password });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Provision founders error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
