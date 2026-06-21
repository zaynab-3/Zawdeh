import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

type CleanRecipeInput = {
  raw_text?: unknown;
  source_platform?: unknown;
  source_type?: unknown;
  target_language?: unknown;
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

  let input: CleanRecipeInput;
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const rawText = typeof input.raw_text === "string" ? input.raw_text.trim() : "";
  const targetLanguage = typeof input.target_language === "string" ? input.target_language : "en";
  const sourcePlatform = typeof input.source_platform === "string" ? input.source_platform : "Other";
  const sourceType = typeof input.source_type === "string" ? input.source_type : "caption";

  if (!rawText) {
    return json({ error: "Recipe text is required." }, 400);
  }

  if (rawText.length > 8000) {
    return json({ error: "Recipe text is too long." }, 400);
  }

  const geminiConfigured = Boolean(Deno.env.get("GEMINI_API_KEY"));
  const title = rawText.split(/\r?\n/)[0]?.slice(0, 120) || "Imported recipe";

  // TODO: Add a transactional user_rate_limits increment before any AI call.
  // TODO: Call Gemini only when GEMINI_API_KEY is configured, and never log full prompts or responses.
  return json({
    ai_enabled: false,
    confidence: geminiConfigured ? "medium" : "low",
    recipe: {
      ingredients: [{ name: "Review ingredient", quantity: "1", unit: "", note: "" }],
      instructions: ["Review imported instructions before saving."],
      notes: "Rule-based placeholder response.",
      source_platform: sourcePlatform,
      source_type: sourceType,
      tags: [sourcePlatform.toLowerCase()],
      target_language: targetLanguage,
      title,
    },
  });
});
