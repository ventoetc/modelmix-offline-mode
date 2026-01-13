import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const email = "charles@vento.cc";

    // 1. Create or Get User
    let userId;
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: "Charles Admin" }
    });

    if (createError) {
      console.log("User might already exist, fetching...");
      const { data: listData } = await supabase.auth.admin.listUsers();
      const user = listData.users.find(u => u.email === email);
      if (!user) {
          throw new Error(`Could not create or find user: ${createError.message}`);
      }
      userId = user.id;
    } else {
      userId = createData.user.id;
    }

    // 2. Assign Admin Role
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id, role" });

    if (roleError) console.error("Role Error (Admin):", roleError);

    // 3. Assign Tester Role
    const { error: testerError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "tester" }, { onConflict: "user_id, role" });
      
    if (testerError) console.error("Role Error (Tester):", testerError);

    // 4. Set Credits
    const { data: creditAccount } = await supabase
        .from("user_credits")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

    if (creditAccount) {
        await supabase.from("user_credits").update({ balance: 50000 }).eq("id", creditAccount.id);
    } else {
        await supabase.from("user_credits").insert({ user_id: userId, balance: 50000, lifetime_earned: 50000 });
    }
    
    // 5. Set Preferences (Profile)
    const preferences = {
        persona: "Expert Tester",
        testing_prompt: "You are a critical software tester. Report all bugs."
    };
    
    const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ 
            user_id: userId, 
            email: email,
            preferences: preferences 
        }, { onConflict: "user_id" });
        
    if (profileError) console.error("Profile Error:", profileError);

    // 6. Generate Password Reset Link
    // Set to production URL
    const redirectTo = "https://modelmix.app/auth/callback?next=/tester-access";
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: redirectTo
      }
    });

    if (linkError) throw linkError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user bootstrapped successfully",
        email: email,
        userId: userId,
        recoveryLink: linkData.properties.action_link,
        note: "Use this link to set your password."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
