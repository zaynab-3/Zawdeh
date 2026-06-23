import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

type CleanRecipeInput = {
  images?: unknown;
  mode?: unknown;
  raw_text?: unknown;
  source_platform?: unknown;
  source_type?: unknown;
  source_url?: unknown;
  target_language?: unknown;
};

type CleanRecipeMode = "text" | "images";

type CleanRecipeImage = {
  base64: string;
  mime_type: string;
};

type GeminiPart =
  | {
      text: string;
    }
  | {
      inlineData: {
        data: string;
        mimeType: string;
      };
    };

type RecipeIngredient = {
  name: string;
  note?: string;
  position: number;
  quantity?: string;
  section?: string;
  unit?: string;
};

type RecipeStep = {
  instruction: string;
  position: number;
  section?: string;
  timer_minutes?: number;
};

type RecipeSection = {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  title: string;
};

type CleanRecipeCandidate = {
  confidence: "low" | "medium" | "high";
  cook_time_minutes?: number;
  description: string;
  notes: string[];
  original_language?: string;
  prep_time_minutes?: number;
  sections: RecipeSection[];
  servings?: string;
  tags: string[];
  title: string;
};

type CleanRecipeResult = {
  recipes: CleanRecipeCandidate[];
};

const ingredientSchema = {
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    note: { type: ["string", "null"] },
    position: { type: "integer" },
    quantity: { type: ["string", "null"] },
    section: { type: ["string", "null"] },
    unit: { type: ["string", "null"] },
  },
  required: ["name", "position"],
  type: "object",
};

const stepSchema = {
  additionalProperties: false,
  properties: {
    instruction: { type: "string" },
    position: { type: "integer" },
    section: { type: ["string", "null"] },
    timer_minutes: { type: ["integer", "null"] },
  },
  required: ["instruction", "position"],
  type: "object",
};

const sectionSchema = {
  additionalProperties: false,
  properties: {
    ingredients: { items: ingredientSchema, type: "array" },
    steps: { items: stepSchema, type: "array" },
    title: { type: "string" },
  },
  required: ["title", "ingredients", "steps"],
  type: "object",
};

const recipeCandidateSchema = {
  additionalProperties: false,
  properties: {
    confidence: { enum: ["low", "medium", "high"], type: "string" },
    cook_time_minutes: { type: ["integer", "null"] },
    description: { type: "string" },
    notes: { items: { type: "string" }, type: "array" },
    original_language: { type: ["string", "null"] },
    prep_time_minutes: { type: ["integer", "null"] },
    sections: { items: sectionSchema, type: "array" },
    servings: { type: ["string", "null"] },
    tags: { items: { type: "string" }, type: "array" },
    title: { type: "string" },
  },
  required: ["title", "description", "sections", "notes", "tags", "confidence"],
  type: "object",
};

const recipeResultSchema = {
  additionalProperties: false,
  properties: {
    recipes: {
      items: recipeCandidateSchema,
      type: "array",
    },
  },
  required: ["recipes"],
  type: "object",
};

const MAX_IMAGES = 5;
const MAX_IMAGE_BASE64_CHARS = 8_000_000;
const MAX_TOTAL_IMAGE_BASE64_CHARS = 16_000_000;
const allowedImageMimeTypes = new Set(["image/heic", "image/heif", "image/jpeg", "image/png", "image/webp"]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { headers, status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalString(value: unknown, maxLength: number) {
  const trimmed = cleanString(value, maxLength);
  return trimmed || undefined;
}

function optionalPositiveInteger(value: unknown) {
  const parsed = typeof value === "string" ? Number.parseInt(value.trim(), 10) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0 && parsed <= 1440 ? parsed : undefined;
}

function parseMode(value: unknown): CleanRecipeMode | null {
  if (value === undefined || value === null) {
    return "text";
  }

  if (value === "text" || value === "images") {
    return value;
  }

  return null;
}

function parseImages(value: unknown): { images: CleanRecipeImage[] } | { response: Response } {
  if (!Array.isArray(value)) {
    return { response: json({ error: "Images are required." }, 400) };
  }

  if (value.length === 0 || value.length > MAX_IMAGES) {
    return { response: json({ error: "Select 1 to 5 screenshots." }, 400) };
  }

  let totalBase64Length = 0;
  const images: CleanRecipeImage[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return { response: json({ error: "Invalid image payload." }, 400) };
    }

    const base64 = typeof item.base64 === "string" ? item.base64.trim().replace(/\s/gu, "") : "";
    const mimeType = cleanString(item.mime_type, 80).toLowerCase();

    if (!base64) {
      return { response: json({ error: "Invalid image payload." }, 400) };
    }

    if (base64.length > MAX_IMAGE_BASE64_CHARS) {
      return { response: json({ error: "Images are too large." }, 400) };
    }

    totalBase64Length += base64.length;

    if (totalBase64Length > MAX_TOTAL_IMAGE_BASE64_CHARS) {
      return { response: json({ error: "Images are too large." }, 400) };
    }

    if (!allowedImageMimeTypes.has(mimeType)) {
      return { response: json({ error: "Unsupported image type." }, 400) };
    }

    images.push({ base64, mime_type: mimeType });
  }

  return { images };
}

function parseConfidence(value: unknown): CleanRecipeCandidate["confidence"] {
  return value === "medium" || value === "high" ? value : "low";
}

function parseStringList(value: unknown, maxItems: number, maxLength: number) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim().slice(0, maxLength)];
  }

  return [];
}

function stripListMarker(value: string) {
  return value.replace(/^\s*(?:[-*•]+|\d+[.)-])\s*/u, "").trim();
}

function parseIngredients(value: unknown, fallbackSection?: string): RecipeIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((ingredient, index) => ({
      name: stripListMarker(cleanString(ingredient.name, 160)),
      note: optionalString(ingredient.note, 500),
      position: optionalPositiveInteger(ingredient.position) ?? index + 1,
      quantity: optionalString(ingredient.quantity, 80),
      section: optionalString(ingredient.section, 120) ?? fallbackSection,
      unit: optionalString(ingredient.unit, 80),
    }))
    .filter((ingredient) => ingredient.name.length > 0)
    .slice(0, 120);
}

function parseSteps(value: unknown, fallbackSection?: string): RecipeStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((step, index) => {
      if (typeof step === "string") {
        return {
          instruction: cleanString(step, 4000),
          position: index + 1,
          section: fallbackSection,
        };
      }

      if (isRecord(step)) {
        return {
          instruction: cleanString(step.instruction, 4000),
          position: optionalPositiveInteger(step.position) ?? index + 1,
          section: optionalString(step.section, 120) ?? fallbackSection,
          timer_minutes: optionalPositiveInteger(step.timer_minutes),
        };
      }

      return { instruction: "", position: index + 1, section: fallbackSection };
    })
    .filter((step) => step.instruction.length > 0)
    .slice(0, 120);
}

function parseSections(value: unknown): RecipeSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((section) => {
      const title = cleanString(section.title, 120) || "Main";

      return {
        ingredients: parseIngredients(section.ingredients, title),
        steps: parseSteps(section.steps, title),
        title,
      };
    })
    .filter((section) => section.ingredients.length > 0 || section.steps.length > 0)
    .slice(0, 30);
}

function parseCleanRecipeCandidate(value: unknown): CleanRecipeCandidate | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = cleanString(value.title, 180);
  const description = cleanString(value.description, 2000) || "Imported from cleaned text.";
  const parsedSections = parseSections(value.sections);
  const sections =
    parsedSections.length > 0
      ? parsedSections
      : [
          {
            ingredients: parseIngredients(value.ingredients),
            steps: parseSteps(value.steps),
            title: "Main",
          },
        ].filter((section) => section.ingredients.length > 0 || section.steps.length > 0);

  if (!title || sections.length === 0) {
    return null;
  }

  return {
    confidence: parseConfidence(value.confidence),
    cook_time_minutes: optionalPositiveInteger(value.cook_time_minutes),
    description,
    notes: parseStringList(value.notes, 20, 1000),
    original_language: optionalString(value.original_language, 80),
    prep_time_minutes: optionalPositiveInteger(value.prep_time_minutes),
    sections,
    servings: optionalString(value.servings, 80),
    tags: parseStringList(value.tags, 20, 80),
    title,
  };
}

function parseCleanRecipeResult(value: unknown): CleanRecipeResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const recipes = Array.isArray(value.recipes)
    ? value.recipes.map(parseCleanRecipeCandidate).filter((recipe): recipe is CleanRecipeCandidate => Boolean(recipe))
    : [parseCleanRecipeCandidate(value)].filter((recipe): recipe is CleanRecipeCandidate => Boolean(recipe));

  return recipes.length > 0 ? { recipes: recipes.slice(0, 10) } : null;
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

function flattenIngredients(recipe: CleanRecipeCandidate) {
  return recipe.sections.flatMap((section) =>
    section.ingredients.map((ingredient) => ({
      ...ingredient,
      section: ingredient.section ?? section.title,
    })),
  );
}

function flattenSteps(recipe: CleanRecipeCandidate) {
  return recipe.sections.flatMap((section) =>
    section.steps.map((step) => ({
      ...step,
      section: step.section ?? section.title,
    })),
  );
}

function toResponsePayload(result: CleanRecipeResult) {
  const firstRecipe = result.recipes[0];

  if (!firstRecipe) {
    return { recipes: [] };
  }

  return {
    confidence: firstRecipe.confidence,
    cook_time_minutes: firstRecipe.cook_time_minutes,
    description: firstRecipe.description,
    ingredients: flattenIngredients(firstRecipe),
    notes: firstRecipe.notes,
    original_language: firstRecipe.original_language,
    prep_time_minutes: firstRecipe.prep_time_minutes,
    recipes: result.recipes,
    servings: firstRecipe.servings,
    steps: flattenSteps(firstRecipe),
    tags: firstRecipe.tags,
    title: firstRecipe.title,
  };
}

async function callGemini(input: {
  images?: CleanRecipeImage[];
  mode: CleanRecipeMode;
  rawText?: string;
  sourcePlatform: string;
  sourceType: string;
  sourceUrl?: string;
  targetLanguage: string;
}) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

  if (!apiKey) {
    return { response: json({ error: "AI cleaner is not ready yet." }, 503) };
  }

  const prompt = [
    input.mode === "images"
      ? "Extract recipe candidates from the attached screenshots. Read the screenshots in order."
      : "Extract recipe candidates from the user's pasted text.",
    "Return only valid JSON in this shape: " + JSON.stringify(recipeResultSchema),
    "A sauce, frosting, filling, topping, dough, stuffing, or marinade that belongs to a cake, dessert, pastry, or dish must stay inside the same recipe as a section.",
    "Do not split sauce, frosting, filling, topping, dough, stuffing, or marinade into a separate recipe unless it is clearly standalone.",
    "Preserve useful section names such as Main, Sauce, Frosting, Filling, Topping, Dough, Stuffing, and Marinade.",
    "If the source contains multiple independent recipes, return multiple items in recipes.",
    "If uncertain whether something is a separate recipe or a section, keep it as a section and set confidence low.",
    "Preserve the order from the screenshot or text. Use 1-based position values inside each section.",
    "Do not invent ingredients or missing steps. If a recipe has ingredients only, return an empty steps array.",
    "Split ingredients into name, quantity, unit, note, section, and position. Remove bullets, dashes, and numbering from ingredient names.",
    "Avoid awkward ingredient names like hot liquid cream. Prefer heated cream, or use name liquid cream with note heated.",
    "Remove social media noise: usernames, follow buttons, hashtags, dates, and captions not related to the recipe.",
    "Preserve Arabic when the target language is Arabic. Translate recipe fields to English when the target language is English.",
    "Use section title Main for unsectioned ingredients or steps.",
    `Target language: ${input.targetLanguage}`,
    `Source type: ${input.sourceType}`,
    `Source platform: ${input.sourcePlatform}`,
    input.sourceUrl ? `Source URL: ${input.sourceUrl}` : "",
    input.mode === "text" ? "Pasted text:" : "Screenshots are attached as inline image data.",
    input.mode === "text" ? input.rawText : "",
  ]
    .filter(Boolean)
    .join("\n");

  const parts: GeminiPart[] = [{ text: prompt }];

  if (input.mode === "images") {
    parts.push(
      ...(input.images ?? []).map((image) => ({
        inlineData: {
          data: image.base64,
          mimeType: image.mime_type,
        },
      })),
    );
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini request failed", {
      body: errorBody.slice(0, 500),
      status: response.status,
    });

    return { response: json({ error: "AI cleaner is not ready yet." }, 502) };
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: unknown }) => (typeof part.text === "string" ? part.text : ""))
    .join("");

  if (typeof text !== "string" || !text.trim()) {
    return { response: json({ error: "AI cleaner returned an invalid response." }, 502) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { response: json({ error: "AI cleaner returned invalid JSON." }, 502) };
  }

  const cleanRecipeResult = parseCleanRecipeResult(parsed);

  if (!cleanRecipeResult) {
    return { response: json({ error: "AI cleaner returned an incomplete recipe." }, 502) };
  }

  return { result: cleanRecipeResult };
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

  const rawText = cleanString(input.raw_text, 8000);
  const mode = parseMode(input.mode);
  const targetLanguage = cleanString(input.target_language, 40) || "en";
  const sourcePlatform = cleanString(input.source_platform, 80) || "Other";
  const sourceType = cleanString(input.source_type, 40) || (mode === "images" ? "screenshots" : "caption");
  const sourceUrl = optionalString(input.source_url, 500);

  if (!mode) {
    return json({ error: "Invalid clean mode." }, 400);
  }

  if (mode === "text" && !rawText) {
    return json({ error: "Recipe text is required." }, 400);
  }

  if (mode === "text" && typeof input.raw_text === "string" && input.raw_text.length > 8000) {
    return json({ error: "Recipe text is too long." }, 400);
  }

  const parsedImages = mode === "images" ? parseImages(input.images) : null;

  if (parsedImages && "response" in parsedImages) {
    return parsedImages.response;
  }

  const result = await callGemini({
    images: parsedImages?.images,
    mode,
    rawText: mode === "text" ? rawText : undefined,
    sourcePlatform,
    sourceType,
    sourceUrl,
    targetLanguage,
  });

  if ("response" in result) {
    return result.response;
  }

  return json(toResponsePayload(result.result));
});
