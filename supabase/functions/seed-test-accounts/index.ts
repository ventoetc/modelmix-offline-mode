import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-defined test accounts with simple passwords
const TEST_ACCOUNTS = [
  { email: "tester1@modelmix.test", password: "Test1234!", credits: 1000 },
  { email: "tester2@modelmix.test", password: "Test5678!", credits: 1000 },
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { action } = await req.json().catch(() => ({ action: "create" }));
    
    const results: Array<{ email: string; password: string; status: string; userId?: string }> = [];

    for (const account of TEST_ACCOUNTS) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser?.users?.some(u => u.email === account.email);

        if (userExists && action === "create") {
          console.log(`User ${account.email} already exists, skipping...`);
          results.push({
            email: account.email,
            password: account.password,
            status: "already_exists"
          });
          continue;
        }

        if (action === "reset" && userExists) {
          // Delete existing user first
          const existingUserId = existingUser?.users?.find(u => u.email === account.email)?.id;
          if (existingUserId) {
            await supabaseAdmin.auth.admin.deleteUser(existingUserId);
            console.log(`Deleted existing user ${account.email}`);
          }
        }

        // Create user with admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true, // Auto-confirm email
        });

        if (createError) {
          console.error(`Create user error for ${account.email}:`, createError);
          results.push({
            email: account.email,
            password: account.password,
            status: `error: ${createError.message}`
          });
          continue;
        }

        // Add tester role
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: newUser.user.id, role: "tester" }, { onConflict: "user_id,role" });

        // Record in test_accounts for tracking
        await supabaseAdmin
          .from("test_accounts")
          .upsert({
            email: account.email,
            starting_credits: account.credits,
            description: "Generic test account for prompt testing"
          }, { onConflict: "email" });

        // Create credit account with starting credits
        const { data: existingCredits } = await supabaseAdmin
          .from("user_credits")
          .select("id")
          .eq("user_id", newUser.user.id)
          .maybeSingle();

        if (!existingCredits) {
          const { data: creditAccount } = await supabaseAdmin
            .from("user_credits")
            .insert({
              user_id: newUser.user.id,
              balance: account.credits,
              lifetime_earned: account.credits
            })
            .select("id")
            .single();

          if (creditAccount) {
            await supabaseAdmin
              .from("credit_transactions")
              .insert({
                credit_account_id: creditAccount.id,
                amount: account.credits,
                balance_after: account.credits,
                source: "admin_grant",
                description: "Test account initial credits"
              });
          }
        }

        console.log(`Test user created: ${account.email}`);
        results.push({
          email: account.email,
          password: account.password,
          status: "created",
          userId: newUser.user.id
        });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing ${account.email}:`, err);
        results.push({
          email: account.email,
          password: account.password,
          status: `error: ${message}`
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test accounts processed",
        accounts: results,
        instructions: [
          "Go to /tester-access",
          "Sign in with one of the test accounts below:",
          ...results.map(r => `  Email: ${r.email} | Password: ${r.password} | Status: ${r.status}`)
        ]
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error seeding test accounts:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
