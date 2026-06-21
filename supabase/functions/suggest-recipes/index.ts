import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { headers, status });
}

async function requireUser(req: Request) {
  const authorization = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!authorization) {
    return { response: json({ error: "Authentication required." }, 401) };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response: json({ error: "Function is not configured." }, 500) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { response: json({ error: "Authentication required." }, 401) };
  }

  return { userId: data.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const auth = await requireUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  let input: { available_ingredients?: unknown; preferences?: unknown };
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const ingredients = Array.isArray(input.available_ingredients)
    ? input.available_ingredients.filter((item): item is string => typeof item === "string").slice(0, 100)
    : [];
  const preferences = typeof input.preferences === "string" ? input.preferences.slice(0, 1000) : "";

  if (ingredients.length === 0) {
    return json({ error: "Add at least one available ingredient." }, 400);
  }

  // TODO: Add durable daily rate-limit checks in user_rate_limits before AI suggestions.
  return json({
    preferences,
    suggestions: [
      {
        cookability: ingredients.some((item) => item.toLowerCase().includes("lentil")) ? "ready_as_is" : "ready_with_substitutions",
        missing_ingredients: [],
        title: "Pantry dinner",
        why: "Built from available ingredients with flexible substitutions.",
      },
    ],
  });
});
