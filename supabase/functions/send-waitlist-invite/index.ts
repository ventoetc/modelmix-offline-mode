import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  entries: Array<{
    id: string;
    email: string;
    full_name: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      console.error("User is not admin:", user.id);
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { entries }: InviteRequest = await req.json();
    console.log(`Sending invites to ${entries.length} users`);

    const results = [];
    const errors = [];

    for (const entry of entries) {
      try {
        const emailResponse = await resend.emails.send({
          from: "ModelMix <onboarding@resend.dev>",
          to: [entry.email],
          subject: "You're invited to ModelMix Beta! 🎉",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #7c3aed; margin-bottom: 24px;">Welcome to ModelMix, ${entry.full_name}!</h1>
              
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">
                Great news! You've been selected for early access to ModelMix - the AI comparison platform that lets you query multiple AI models simultaneously.
              </p>
              
              <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <a href="https://modelmix.app/auth" style="display: inline-block; background: white; color: #7c3aed; font-weight: 600; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">
                  Get Started Now →
                </a>
              </div>
              
              <h3 style="color: #1f2937; margin-top: 32px;">What you can do with ModelMix:</h3>
              <ul style="font-size: 15px; line-height: 1.8; color: #4b5563;">
                <li>Compare GPT-4, Claude, Gemini, and more side-by-side</li>
                <li>See transparent pricing for every query</li>
                <li>Find the best AI for your specific task</li>
                <li>Save time by querying multiple models at once</li>
              </ul>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                Questions? Just reply to this email. We'd love to hear from you!
              </p>
              
              <p style="font-size: 14px; color: #6b7280;">
                — The ModelMix Team
              </p>
            </div>
          `,
        });

        console.log(`Email sent to ${entry.email}:`, emailResponse);
        results.push({ id: entry.id, email: entry.email, success: true });
      } catch (emailError: any) {
        console.error(`Failed to send to ${entry.email}:`, emailError);
        errors.push({ id: entry.id, email: entry.email, error: emailError.message });
      }
    }

    // Update notified status for successful sends using service role
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const successIds = results.filter(r => r.success).map(r => r.id);
    if (successIds.length > 0) {
      const { error: updateError } = await serviceSupabase
        .from("waitlist")
        .update({ notified: true })
        .in("id", successIds);

      if (updateError) {
        console.error("Failed to update notified status:", updateError);
      } else {
        console.log(`Updated notified status for ${successIds.length} entries`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.length, 
        errors: errors.length,
        details: { results, errors }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-waitlist-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
