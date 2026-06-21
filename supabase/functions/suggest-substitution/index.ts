import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const localRules: Record<string, { can_skip: boolean; impact: string; substitutes: string[]; warning?: string }> = {
  butter: {
    can_skip: false,
    impact: "Oil can work in many cooked recipes, but baked texture may change.",
    substitutes: ["olive oil", "neutral oil"],
  },
  "black pepper": {
    can_skip: true,
    impact: "You can skip this. The recipe will be a little less warm.",
    substitutes: [],
  },
  cheese: {
    can_skip: true,
    impact: "If this is a cheeseburger, it becomes a burger without cheese.",
    substitutes: [],
  },
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

  let input: { missing_ingredient?: unknown; recipe_context?: unknown };
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const missingIngredient = typeof input.missing_ingredient === "string" ? input.missing_ingredient.trim() : "";
  const recipeContext = typeof input.recipe_context === "string" ? input.recipe_context.slice(0, 2000) : "";

  if (!missingIngredient) {
    return json({ error: "Missing ingredient is required." }, 400);
  }

  if (missingIngredient.length > 160) {
    return json({ error: "Missing ingredient is too long." }, 400);
  }

  // TODO: Add durable daily rate-limit checks in user_rate_limits before any AI fallback.
  const suggestion = localRules[missingIngredient.toLowerCase()] ?? {
    can_skip: false,
    impact: "Add it to the shopping list or continue with a changed result.",
    substitutes: [],
    warning: "No reliable local substitution yet.",
  };

  return json({
    missing_ingredient: missingIngredient,
    recipe_context_used: Boolean(recipeContext),
    suggestion,
  });
});
