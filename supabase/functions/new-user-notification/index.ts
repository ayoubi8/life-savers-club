import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { record } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const { data: adminUsers, error: adminUsersError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminUsersError) {
      console.error("Error fetching admin users:", adminUsersError);
      return new Response("Error fetching admin users", { status: 500 });
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log("No admin users found, so no notification email will be sent.");
      return new Response(JSON.stringify({ message: "No admin users found" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const adminEmails = await Promise.all(
      adminUsers.map(async (admin) => {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(admin.user_id);
        if (userError) {
          console.error(`Error fetching user data for ${admin.user_id}:`, userError);
          return null;
        }
        return userData.user.email;
      })
    );

    const validEmails = adminEmails.filter((email) => email !== null) as string[];

    if (validEmails.length > 0) {
      console.log(`New user registered: ${record.email}. Notifying admins:`, validEmails.join(", "));
      // Here, you would add your email sending logic, e.g., using a third-party service.
      // Since this is a serverless function, we are just logging to the console.
    }

    return new Response(JSON.stringify({ message: "Admin notification process completed" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});