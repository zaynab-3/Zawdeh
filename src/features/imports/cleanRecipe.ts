import { createReviewDraft } from '@/features/imports/importParser';
import { detectImportedLanguage, normalizeDetectedLanguage } from '@/features/imports/languageDetection';
import type { RecipeImportInput, RecipeImportReview } from '@/features/imports/importTypes';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import { isNetworkUnavailableError } from '@/lib/supabaseStatus';

export const AI_CLEANER_NOT_READY_MESSAGE = 'AI cleaner is not ready yet. You can still review manually.';
export const SCREENSHOT_AI_NOT_READY_MESSAGE = 'Could not read screenshots yet. You can paste the text manually.';
export const URL_AI_NOT_READY_MESSAGE = 'Could not import this recipe link yet. You can paste the recipe text manually.';
export const SOCIAL_CAPTION_UNAVAILABLE_MESSAGE =
  'This social link did not include enough recipe details to import automatically. Use screenshot import or paste the full recipe text.';
export const MANUAL_CAPTION_CLEANUP_FAILED_MESSAGE = 'Caption did not contain enough recipe details.';

type CleanRecipeConfidence = 'low' | 'medium' | 'high';
type ImportDiagnosticPath =
  | 'ai_cleanup_fallback'
  | 'blocked_or_unfetchable_social_url'
  | 'caption_unavailable_from_public_metadata'
  | 'incomplete_recipe'
  | 'instagram_caption_candidate_length'
  | 'instagram_caption_candidate_source'
  | 'instagram_caption_recipe_signals_found'
  | 'instagram_html_length'
  | 'instagram_meta_description_length'
  | 'instagram_og_description_length'
  | 'instagram_og_title_length'
  | 'instagram_social_url'
  | 'json_ld_recipe'
  | 'manual_caption_cleanup'
  | 'social_metadata_only';
type SocialUrlPlatform = 'facebook' | 'instagram' | 'tiktok' | 'youtube';

type SocialUrlDetection = {
  platform: SocialUrlPlatform;
  sourcePlatform: RecipeImportInput['sourcePlatform'];
};

type SocialUrlMetadata = SocialUrlDetection & {
  description?: string;
  rawText: string;
  title?: string;
  url: string;
};

type CleanRecipeIngredient = {
  name: string;
  note?: string;
  position?: number;
  quantity?: string;
  section?: string;
  unit?: string;
};

type CleanRecipeStep = {
  instruction: string;
  position?: number;
  section?: string;
  timer_minutes?: number;
};

type CleanRecipeSection = {
  ingredients: CleanRecipeIngredient[];
  steps: CleanRecipeStep[];
  title: string;
};

type CleanRecipeCandidate = {
  confidence: CleanRecipeConfidence;
  cook_time_minutes?: number;
  description: string;
  notes: string[];
  original_language?: string;
  prep_time_minutes?: number;
  sections: CleanRecipeSection[];
  servings?: string;
  tags: string[];
  title: string;
};

export type CleanRecipeImagePayload = {
  base64: string;
  mime_type: string;
};

const socialHosts: { hosts: string[]; platform: SocialUrlPlatform; sourcePlatform: RecipeImportInput['sourcePlatform'] }[] = [
  { hosts: ['instagram.com'], platform: 'instagram', sourcePlatform: 'Instagram' },
  { hosts: ['tiktok.com'], platform: 'tiktok', sourcePlatform: 'TikTok' },
  { hosts: ['facebook.com', 'fb.watch'], platform: 'facebook', sourcePlatform: 'Facebook' },
  { hosts: ['youtube.com', 'youtu.be'], platform: 'youtube', sourcePlatform: 'YouTube' },
];

function logImportDiagnostic(path: ImportDiagnosticPath, details: Record<string, unknown> = {}) {
  console.info('[recipe-import:url]', { path, ...details });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function parseConfidence(value: unknown): CleanRecipeConfidence {
  return value === 'medium' || value === 'high' ? value : 'low';
}

function parseStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 40);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function stripListMarker(value: string) {
  return value.replace(/^\s*(?:[-*\u2022]+|\d+[.)-])\s*/u, '').trim();
}

function getSectionTitle(value: unknown) {
  return optionalString(value) ?? 'Main';
}

function parseIngredients(value: unknown, fallbackSection?: string): CleanRecipeIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((ingredient, index) => ({
      name: stripListMarker(optionalString(ingredient.name) ?? ''),
      note: optionalString(ingredient.note),
      position: optionalPositiveInteger(ingredient.position) ?? index + 1,
      quantity: optionalString(ingredient.quantity),
      section: optionalString(ingredient.section) ?? fallbackSection,
      unit: optionalString(ingredient.unit),
    }))
    .filter((ingredient) => ingredient.name.length > 0)
    .slice(0, 80);
}

function parseSteps(value: unknown, fallbackSection?: string): CleanRecipeStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((step, index) => {
      if (typeof step === 'string') {
        return {
          instruction: step.trim(),
          position: index + 1,
          section: fallbackSection,
        };
      }

      if (isRecord(step)) {
        return {
          instruction: optionalString(step.instruction) ?? '',
          position: optionalPositiveInteger(step.position) ?? index + 1,
          section: optionalString(step.section) ?? fallbackSection,
          timer_minutes: optionalPositiveInteger(step.timer_minutes),
        };
      }

      return { instruction: '', position: index + 1, section: fallbackSection };
    })
    .filter((step) => step.instruction.length > 0)
    .slice(0, 80);
}

function parseSections(value: unknown): CleanRecipeSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((section) => {
      const title = getSectionTitle(section.title);

      return {
        ingredients: parseIngredients(section.ingredients, title),
        steps: parseSteps(section.steps, title),
        title,
      };
    })
    .filter((section) => section.ingredients.length > 0 || section.steps.length > 0)
    .slice(0, 20);
}

function parseCandidate(value: unknown): CleanRecipeCandidate | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = optionalString(value.title);
  const description = optionalString(value.description) ?? 'Imported from cleaned text.';
  const parsedSections = parseSections(value.sections);
  const sections =
    parsedSections.length > 0
      ? parsedSections
      : [
          {
            ingredients: parseIngredients(value.ingredients),
            steps: parseSteps(value.steps),
            title: 'Main',
          },
        ].filter((section) => section.ingredients.length > 0 || section.steps.length > 0);

  if (!title || sections.length === 0) {
    return null;
  }

  return {
    confidence: parseConfidence(value.confidence),
    cook_time_minutes: optionalPositiveInteger(value.cook_time_minutes),
    description,
    notes: parseStringList(value.notes),
    original_language: optionalString(value.original_language),
    prep_time_minutes: optionalPositiveInteger(value.prep_time_minutes),
    sections,
    servings: optionalString(value.servings),
    tags: parseStringList(value.tags),
    title,
  };
}

function parseCleanRecipeCandidates(value: unknown): CleanRecipeCandidate[] {
  if (!isRecord(value)) {
    return [];
  }

  if (Array.isArray(value.recipes)) {
    return value.recipes.map(parseCandidate).filter((candidate): candidate is CleanRecipeCandidate => Boolean(candidate));
  }

  const legacyCandidate = parseCandidate(value);
  return legacyCandidate ? [legacyCandidate] : [];
}

function hasNamedSections(output: CleanRecipeCandidate) {
  return output.sections.length > 1 || output.sections.some((section) => section.title.toLowerCase() !== 'main');
}

function outputToReview(input: RecipeImportInput, output: CleanRecipeCandidate): RecipeImportReview {
  const shouldKeepSections = hasNamedSections(output);
  const ingredients = output.sections.flatMap((section) =>
    section.ingredients.map((ingredient, index) => ({
      id: `ingredient-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'section'}-${ingredient.position ?? index + 1}`,
      name: ingredient.name,
      note: ingredient.note,
      quantity: ingredient.quantity,
      section: shouldKeepSections ? (ingredient.section ?? section.title) : undefined,
      unit: ingredient.unit,
    })),
  );
  const steps = output.sections.flatMap((section) =>
    section.steps.map((step, index) => ({
      id: `step-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'section'}-${step.position ?? index + 1}`,
      instruction: step.instruction,
      position: step.position ?? index + 1,
      section: shouldKeepSections ? (step.section ?? section.title) : undefined,
      timerMinutes: step.timer_minutes,
    })),
  );

  return {
    confidence: output.confidence,
    cookTimeMinutes: output.cook_time_minutes,
    description: output.description,
    importMode: 'ai',
    ingredients,
    notes: output.notes.join('\n'),
    originalLanguage:
      normalizeDetectedLanguage(output.original_language) === 'unknown'
        ? detectImportedLanguage([output.title, output.description, input.rawText].join('\n'))
        : normalizeDetectedLanguage(output.original_language),
    prepTimeMinutes: output.prep_time_minutes,
    servings: output.servings,
    sourcePlatform: input.sourcePlatform,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    steps: steps.map((step, index) => ({ ...step, position: index + 1 })),
    tags: output.tags.length > 0 ? output.tags : [input.sourcePlatform.toLowerCase()],
    title: output.title,
  };
}


async function getFunctionErrorMessage(error: unknown, fallbackMessage: string) {
  if (isNetworkUnavailableError(error)) {
    return fallbackMessage;
  }

  if (!error || typeof error !== 'object') {
    return fallbackMessage;
  }

  const maybeError = error as { context?: unknown; message?: unknown };
  const context = maybeError.context;

  if (context && typeof context === 'object') {
    const responseLike = context as { clone?: unknown; json?: unknown; text?: unknown };
    const readable = typeof responseLike.clone === 'function' ? (responseLike.clone as () => unknown)() : responseLike;

    if (readable && typeof readable === 'object') {
      const bodyReader = readable as { json?: unknown; text?: unknown };

      if (typeof bodyReader.json === 'function') {
        try {
          const body = await (bodyReader.json as () => Promise<unknown>)();

          if (body && typeof body === 'object' && 'error' in body) {
            const message = (body as { error?: unknown }).error;

            if (typeof message === 'string' && message.trim()) {
              return message;
            }
          }
        } catch {
          // Try text below.
        }
      }

      if (typeof bodyReader.text === 'function') {
        try {
          const text = await (bodyReader.text as () => Promise<string>)();
          const parsed = JSON.parse(text) as unknown;

          if (parsed && typeof parsed === 'object' && 'error' in parsed) {
            const message = (parsed as { error?: unknown }).error;

            if (typeof message === 'string' && message.trim()) {
              return message;
            }
          }

          if (text.trim()) {
            return text.slice(0, 300);
          }
        } catch {
          // Keep fallback message.
        }
      }
    }
  }

  if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
    return maybeError.message;
  }

  return fallbackMessage;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/giu, (match, codePoint: string) => {
      const parsed = Number.parseInt(codePoint, 16);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 0x10ffff ? String.fromCodePoint(parsed) : match;
    })
    .replace(/&#(\d+);/gu, (match, codePoint: string) => {
      const parsed = Number.parseInt(codePoint, 10);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 0x10ffff ? String.fromCodePoint(parsed) : match;
    })
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&rsquo;/gu, "'")
    .replace(/&lsquo;/gu, "'")
    .replace(/&rdquo;/gu, '"')
    .replace(/&ldquo;/gu, '"')
    .replace(/&nbsp;/gu, ' ');
}

function decodeEscapedMetadataText(value: string) {
  const decoded = decodeHtmlEntities(value)
    .replace(/\\u([0-9a-f]{4})/giu, (match, codePoint: string) => {
      const parsed = Number.parseInt(codePoint, 16);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 0x10ffff ? String.fromCodePoint(parsed) : match;
    })
    .replace(/\\n/gu, '\n')
    .replace(/\\r/gu, '\n')
    .replace(/\\t/gu, ' ')
    .replace(/\\"/gu, '"')
    .replace(/\\'/gu, "'")
    .replace(/\\\//gu, '/');

  return decodeHtmlEntities(decoded);
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/giu, ' ')
      .replace(/<style[\s\S]*?<\/style>/giu, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/giu, ' ')
      .replace(/<[^>]+>/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim(),
  );
}

function getHtmlAttribute(tag: string, name: string) {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'iu');
  return decodeHtmlEntities(pattern.exec(tag)?.[2] ?? '').trim();
}

function extractMetaContent(html: string, key: string) {
  const metaTags = html.match(/<meta\b[^>]*>/giu) ?? [];
  const normalizedKey = key.toLowerCase();

  for (const tag of metaTags) {
    const property = getHtmlAttribute(tag, 'property') || getHtmlAttribute(tag, 'name');

    if (property.toLowerCase() === normalizedKey) {
      return getHtmlAttribute(tag, 'content');
    }
  }

  return '';
}

function detectSocialUrl(sourceUrl?: string): SocialUrlDetection | null {
  const trimmedUrl = sourceUrl?.trim();

  if (!trimmedUrl) {
    return null;
  }

  try {
    const host = new URL(trimmedUrl).hostname.toLowerCase().replace(/^www\./u, '');
    const match = socialHosts.find((entry) => entry.hosts.some((knownHost) => host.endsWith(knownHost)));
    return match ? { platform: match.platform, sourcePlatform: match.sourcePlatform } : null;
  } catch {
    return null;
  }
}

function decodeJsonStringLiteral(value: string) {
  try {
    return JSON.parse(`"${value.replace(/"/gu, '\\"')}"`) as string;
  } catch {
    return value;
  }
}

function isGenericSocialMetadata(value: string) {
  const text = value.toLowerCase();

  return (
    text.includes('log in to instagram') ||
    text.includes('sign up to see photos') ||
    text.includes('create an account or log in') ||
    text.includes('see instagram photos and videos') ||
    text.includes('watch more exciting videos') ||
    text.includes('open the tiktok app') ||
    text.includes('make your day') ||
    text.includes('explore facebook') ||
    text.includes('this browser is no longer supported')
  );
}

function normalizeMetadataText(value?: string) {
  const text = stripHtml(decodeEscapedMetadataText(value ?? ''))
    .replace(/\s+/gu, ' ')
    .trim();

  return text && !isGenericSocialMetadata(text) ? text : '';
}

function getInstagramCanonicalUrl(sourceUrl: string) {
  const fallbackUrl = sourceUrl.trim();

  try {
    const url = new URL(fallbackUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./u, '');

    if (!host.endsWith('instagram.com')) {
      return fallbackUrl;
    }

    const match = /^\/(reel|p|tv)\/([^/?#]+)\/?/iu.exec(url.pathname);

    if (!match?.[1] || !match[2]) {
      return fallbackUrl;
    }

    return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`;
  } catch {
    return fallbackUrl;
  }
}

function stripInstagramWrapper(value: string) {
  let text = normalizeMetadataText(value);
  const originalText = text;

  text = text
    .replace(/^[\d.,]+[kmb]?\s+likes?,\s+[\d.,]+[kmb]?\s+comments?\s+-\s+.*?\son\s+[^:]+:\s*/iu, '')
    .trim();

  if (text === originalText) {
    text = text.replace(/^.+?\son\s+Instagram:\s*/iu, '').trim();
  }

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”'))) {
    text = text.slice(1, -1).trim();
  }

  return text;
}

function pickInstagramCaptionCandidate(html: string, sourceUrl: string) {
  const metaDescription = extractMetaContent(html, 'description');
  const ogDescription = extractMetaContent(html, 'og:description');
  const ogTitle = extractMetaContent(html, 'og:title');

  logImportDiagnostic('instagram_html_length', { length: html.length, sourceUrl });
  logImportDiagnostic('instagram_meta_description_length', { length: normalizeMetadataText(metaDescription).length, sourceUrl });
  logImportDiagnostic('instagram_og_description_length', { length: normalizeMetadataText(ogDescription).length, sourceUrl });
  logImportDiagnostic('instagram_og_title_length', { length: normalizeMetadataText(ogTitle).length, sourceUrl });

  const candidates = [
    { source: 'meta_description', text: stripInstagramWrapper(metaDescription) },
    { source: 'og_description', text: stripInstagramWrapper(ogDescription) },
    { source: 'og_title', text: stripInstagramWrapper(ogTitle) },
  ].filter((candidate) => candidate.text.length > 0 && !isGenericSocialMetadata(candidate.text));

  const uniqueCandidates = candidates.filter(
    (candidate, index, values) => values.findIndex((value) => value.text === candidate.text) === index,
  );
  const candidate =
    uniqueCandidates.find((value) => hasEnoughRecipeText(value.text)) ??
    [...uniqueCandidates].sort((left, right) => right.text.length - left.text.length)[0];
  const recipeSignalCount = candidate ? getRecipeSignalCount(candidate.text) : 0;

  logImportDiagnostic('instagram_caption_candidate_source', { source: candidate?.source ?? 'none', sourceUrl });
  logImportDiagnostic('instagram_caption_candidate_length', { length: candidate?.text.length ?? 0, sourceUrl });
  logImportDiagnostic('instagram_caption_recipe_signals_found', {
    found: Boolean(candidate && hasEnoughRecipeText(candidate.text)),
    recipeSignalCount,
    sourceUrl,
  });

  return candidate;
}

function extractEmbeddedSocialTexts(html: string) {
  const texts: string[] = [];
  const patterns = [
    /"edge_media_to_caption"\s*:\s*\{[\s\S]{0,5000}?"text"\s*:\s*"([^"]{20,4000})"/giu,
    /"caption"\s*:\s*\{[\s\S]{0,2500}?"text"\s*:\s*"([^"]{20,4000})"/giu,
    /"caption"\s*:\s*"([^"]{20,4000})"/giu,
    /"description"\s*:\s*"([^"]{20,4000})"/giu,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const text = normalizeMetadataText(decodeJsonStringLiteral(match[1] ?? ''));

      if (text && !texts.includes(text)) {
        texts.push(text);
      }
    }
  }

  return texts.slice(0, 5);
}

function buildSocialMetadataText(metadata: Pick<SocialUrlMetadata, 'description' | 'rawText' | 'title'>) {
  return [metadata.description, metadata.rawText, metadata.title]
    .map(normalizeMetadataText)
    .filter(Boolean)
    .filter((text, index, values) => values.indexOf(text) === index)
    .join('\n\n')
    .slice(0, 8000);
}

function extractSocialMetadataFromHtml(html: string, sourceUrl: string, social: SocialUrlDetection): SocialUrlMetadata {
  if (social.platform === 'instagram') {
    const captionCandidate = pickInstagramCaptionCandidate(html, sourceUrl);
    const title = stripInstagramWrapper(extractMetaContent(html, 'og:title'));
    const description = stripInstagramWrapper(extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description'));

    return {
      ...social,
      description: description || undefined,
      rawText: captionCandidate?.text ?? '',
      title: title || undefined,
      url: sourceUrl,
    };
  }

  const title = normalizeMetadataText(
    extractMetaContent(html, 'og:title') ||
      extractMetaContent(html, 'twitter:title') ||
      extractMetaContent(html, 'title'),
  );
  const description = normalizeMetadataText(
    extractMetaContent(html, 'og:description') ||
      extractMetaContent(html, 'description') ||
      extractMetaContent(html, 'twitter:description'),
  );
  const embeddedText = extractEmbeddedSocialTexts(html).join('\n\n');
  const rawText = buildSocialMetadataText({ description, rawText: embeddedText, title });

  return {
    ...social,
    description: description || undefined,
    rawText,
    title: title || undefined,
    url: sourceUrl,
  };
}

function getRecipeSignalCount(value: string) {
  const text = value.toLowerCase();
  const lines = value
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean);
  const checks = [
    /\b(?:ingredients?|ingredienti|ingr[eé]dients?|مكونات|مقادير)\b/iu.test(text),
    /\b(?:method|directions?|instructions?|steps?|preparation|طريقة|خطوات|تحضير)\b/iu.test(text),
    /\b\d+(?:[.,]\d+)?\s*(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|grams?|g|kg|ml|l|liters?|oz|ounces?|lb|pounds?|cloves?|بيض|كوب|غرام|مل|ملعقة)\b/iu.test(
      text,
    ),
    /(?:^|\n)\s*(?:[-*\u2022]|\d+[.)])\s+\S/iu.test(value),
    /\b(?:\b(?:add|bake|boil|chop|combine|cook|fry|knead|mix|pour|roast|simmer|stir|whisk|اخبز|اطبخ|اخلط|أضف|اقلي|cuire|m[eé]langer|m[eé]langez|ajoutez|versez|placez|d[eé]posez|enfournez|pr[eé]chauffez|laissez|r[eé]alisez|refroidir|cuisson)\b)\b/iu.test(
      text,
    ),
    /(?:farine|beurre|sucre|oeufs?|œufs?|vanille|chocolat|p[eé]pites?|p[aâ]te|four|cong[eé]lateur|cuisson|ملح|سكر|طحين|زبدة|بيض|فانيليا|شوكولا)/iu.test(text),
    lines.length >= 4,
  ];

  return checks.filter(Boolean).length;
}

function hasEnoughRecipeText(value: string) {
  const text = value.trim();

  if (!text) {
    return false;
  }

  const signalCount = getRecipeSignalCount(text);
  const hasQuantityOrIngredientHeader =
    /\b(?:ingredients?|ingr[eé]dients?|recette|مكونات|مقادير)\b/iu.test(text) ||
    /(?:farine|beurre|sucre|oeufs?|œufs?|vanille|chocolat|p[eé]pites?|p[aâ]te|four|cong[eé]lateur|cuisson|ملح|سكر|طحين|زبدة|بيض|فانيليا|شوكولا)/iu.test(text) ||
    /\b\d+(?:[.,]\d+)?\s*(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|grams?|g|kg|ml|l|oz|lb|cloves?|بيض|كوب|غرام|مل|ملعقة)\b/iu.test(
      text,
    );

  return (text.length >= 160 && signalCount >= 2 && hasQuantityOrIngredientHeader) || (signalCount >= 4 && hasQuantityOrIngredientHeader);
}

function extractRawJsonLdBlocks(html: string) {
  return Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu))
    .map((match) => (match[1] ?? '').trim())
    .filter(Boolean)
    .slice(0, 10);
}

function extractJsonLdBlocks(html: string) {
  return extractRawJsonLdBlocks(html)
    .map((block) => stripHtml(block))
    .filter(Boolean)
    .slice(0, 5);
}

function pickFirstText(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = stripHtml(String(value));
    return text || undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = pickFirstText(item);

      if (text) {
        return text;
      }
    }

    return undefined;
  }

  if (isRecord(value)) {
    return (
      pickFirstText(value.text) ??
      pickFirstText(value.name) ??
      pickFirstText(value.headline) ??
      pickFirstText(value.description) ??
      pickFirstText(value['@value'])
    );
  }

  return undefined;
}

function getSchemaTypes(value: unknown) {
  const rawTypes = Array.isArray(value) ? value : [value];

  return rawTypes
    .filter((type): type is string => typeof type === 'string')
    .map((type) => type.toLowerCase().split(/[\/#]/u).pop() ?? type.toLowerCase());
}

function isRecipeSchemaNode(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && getSchemaTypes(value['@type']).includes('recipe');
}

function collectRecipeSchemaNodes(value: unknown, recipes: Record<string, unknown>[] = []) {
  if (recipes.length >= 10) {
    return recipes;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecipeSchemaNodes(item, recipes);
    }

    return recipes;
  }

  if (!isRecord(value)) {
    return recipes;
  }

  if (isRecipeSchemaNode(value)) {
    recipes.push(value);
    return recipes;
  }

  for (const key of ['@graph', 'graph', 'itemListElement', 'mainEntity', 'mainEntityOfPage']) {
    collectRecipeSchemaNodes(value[key], recipes);
  }

  return recipes;
}

function parseSchemaDurationMinutes(value: unknown) {
  const text = pickFirstText(value);

  if (!text) {
    return undefined;
  }

  const isoMatch = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/iu.exec(
    text,
  );

  if (isoMatch) {
    const days = Number(isoMatch[1] ?? 0);
    const hours = Number(isoMatch[2] ?? 0);
    const minutes = Number(isoMatch[3] ?? 0);
    const seconds = Number(isoMatch[4] ?? 0);
    const total = days * 1440 + hours * 60 + minutes + Math.ceil(seconds / 60);

    return total > 0 ? Math.round(total) : undefined;
  }

  const hours = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/iu.exec(text)?.[1];
  const minutes = /(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/iu.exec(text)?.[1];
  const total = Number(hours ?? 0) * 60 + Number(minutes ?? 0);

  return total > 0 ? Math.round(total) : undefined;
}

function parseSchemaRecipeIngredients(value: unknown): CleanRecipeIngredient[] {
  const rawIngredients = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];

  return rawIngredients
    .map((ingredient, index) => ({
      name: stripListMarker(pickFirstText(ingredient) ?? ''),
      position: index + 1,
      section: 'Main',
    }))
    .filter((ingredient) => ingredient.name.length > 0)
    .slice(0, 120);
}

function parseSchemaInstructionItems(value: unknown, fallbackSection = 'Main'): CleanRecipeStep[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseSchemaInstructionItems(item, fallbackSection));
  }

  if (typeof value === 'string') {
    const instruction = stripListMarker(stripHtml(value));
    return instruction ? [{ instruction, section: fallbackSection }] : [];
  }

  if (!isRecord(value)) {
    return [];
  }

  const nested = value.itemListElement ?? value.steps ?? value.recipeInstructions;

  if (nested) {
    const sectionTitle = pickFirstText(value.name) ?? fallbackSection;
    return parseSchemaInstructionItems(nested, sectionTitle);
  }

  const instruction =
    pickFirstText(value.text) ?? pickFirstText(value.name) ?? pickFirstText(value.description) ?? '';

  return instruction ? [{ instruction: stripListMarker(instruction), section: fallbackSection }] : [];
}

function parseSchemaRecipeSteps(value: unknown): CleanRecipeStep[] {
  return parseSchemaInstructionItems(value)
    .map((step, index) => ({
      ...step,
      position: index + 1,
    }))
    .filter((step) => step.instruction.length > 0)
    .slice(0, 120);
}

function groupSchemaSections(ingredients: CleanRecipeIngredient[], steps: CleanRecipeStep[]): CleanRecipeSection[] {
  const sections = new Map<string, CleanRecipeSection>();

  function ensureSection(title: string) {
    const normalizedTitle = title.trim() || 'Main';
    const existing = sections.get(normalizedTitle);

    if (existing) {
      return existing;
    }

    const section: CleanRecipeSection = { ingredients: [], steps: [], title: normalizedTitle };
    sections.set(normalizedTitle, section);
    return section;
  }

  for (const ingredient of ingredients) {
    ensureSection(ingredient.section ?? 'Main').ingredients.push(ingredient);
  }

  for (const step of steps) {
    ensureSection(step.section ?? 'Main').steps.push(step);
  }

  return Array.from(sections.values()).filter((section) => section.ingredients.length > 0 || section.steps.length > 0);
}

function parseStructuredRecipeCandidate(value: Record<string, unknown>): CleanRecipeCandidate | null {
  const title = pickFirstText(value.name) ?? pickFirstText(value.headline);
  const ingredients = parseSchemaRecipeIngredients(value.recipeIngredient ?? value.ingredients);
  const steps = parseSchemaRecipeSteps(value.recipeInstructions ?? value.instructions ?? value.step);
  const sections = groupSchemaSections(ingredients, steps);

  if (!title || sections.length === 0) {
    return null;
  }

  return {
    confidence: ingredients.length > 0 && steps.length > 0 ? 'high' : 'medium',
    cook_time_minutes: parseSchemaDurationMinutes(value.cookTime),
    description: pickFirstText(value.description) ?? 'Imported from recipe metadata.',
    notes: [],
    original_language: pickFirstText(value.inLanguage),
    prep_time_minutes: parseSchemaDurationMinutes(value.prepTime),
    sections,
    servings: pickFirstText(value.recipeYield ?? value.yield),
    tags: ['website'],
    title,
  };
}

function parseStructuredRecipeCandidatesFromHtml(html: string): CleanRecipeCandidate[] {
  const candidates: CleanRecipeCandidate[] = [];

  for (const block of extractRawJsonLdBlocks(html)) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(block);
    } catch {
      try {
        parsed = JSON.parse(decodeHtmlEntities(block));
      } catch {
        continue;
      }
    }

    for (const recipeNode of collectRecipeSchemaNodes(parsed)) {
      const candidate = parseStructuredRecipeCandidate(recipeNode);

      if (candidate && !candidates.some((existing) => existing.title.toLowerCase() === candidate.title.toLowerCase())) {
        candidates.push(candidate);
      }
    }
  }

  return candidates.slice(0, 10);
}

function buildRecipePageText(html: string) {
  const title = extractMetaContent(html, 'og:title') || extractMetaContent(html, 'twitter:title');
  const description =
    extractMetaContent(html, 'og:description') ||
    extractMetaContent(html, 'description') ||
    extractMetaContent(html, 'twitter:description');
  const jsonLd = extractJsonLdBlocks(html).join('\n\n');
  const readableText = stripHtml(html).slice(0, 18000);

  return [
    title ? `Page title: ${title}` : '',
    description ? `Page description: ${description}` : '',
    jsonLd ? `Structured data JSON-LD:\n${jsonLd}` : '',
    readableText ? `Readable page text:\n${readableText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 30000);
}

async function fetchRecipeUrlTextOnDevice(sourceUrl?: string) {
  const trimmedUrl = sourceUrl?.trim();

  if (!trimmedUrl) {
    throw new Error(URL_AI_NOT_READY_MESSAGE);
  }

  const response = await fetch(trimmedUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8,fr;q=0.7',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch this recipe link on device. Site returned HTTP ${response.status}.`);
  }

  const html = (await response.text()).slice(0, 120000);
  const pageText = buildRecipePageText(html);
  const structuredRecipes = parseStructuredRecipeCandidatesFromHtml(html);

  if (!pageText.trim()) {
    throw new Error('Could not read recipe content from this link.');
  }

  return { rawText: pageText, structuredRecipes };
}

async function fetchInstagramOembedMetadata(
  sourceUrl: string,
  social: SocialUrlDetection,
): Promise<SocialUrlMetadata | null> {
  const canonicalUrl = getInstagramCanonicalUrl(sourceUrl);
  const oembedUrl = 'https://www.instagram.com/api/v1/oembed/?url=' + encodeURIComponent(canonicalUrl);

  try {
    const response = await fetch(oembedUrl, {
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8,fr;q=0.7',
        Referer: 'https://www.instagram.com/',
        'X-IG-App-ID': '936619743392459',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      author_name?: string;
      html?: string;
      thumbnail_url?: string;
      title?: string;
    };

    const caption = stripInstagramWrapper(data.title ?? '');
    const recipeSignalCount = getRecipeSignalCount(caption);

    logImportDiagnostic('instagram_caption_candidate_source', {
      source: caption ? 'oembed_title' : 'oembed_empty',
      sourceUrl,
    });
    logImportDiagnostic('instagram_caption_candidate_length', {
      length: caption.length,
      sourceUrl,
    });
    logImportDiagnostic('instagram_caption_recipe_signals_found', {
      found: hasEnoughRecipeText(caption),
      recipeSignalCount,
      sourceUrl,
    });

    if (!caption) {
      return null;
    }

    return {
      ...social,
      description: undefined,
      rawText: caption,
      title: normalizeMetadataText(data.author_name || social.sourcePlatform),
      url: sourceUrl,
    };
  } catch {
    return null;
  }
}

async function fetchTikTokOembedMetadata(
  sourceUrl: string,
  social: SocialUrlDetection,
): Promise<SocialUrlMetadata | null> {
  const oembedUrl = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(sourceUrl);

  try {
    const response = await fetch(oembedUrl, {
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8,fr;q=0.7',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      author_name?: string;
      html?: string;
      title?: string;
    };

    const caption = normalizeMetadataText(data.title ?? '');

    if (!caption || isGenericSocialMetadata(caption)) {
      return null;
    }

    return {
      ...social,
      description: undefined,
      rawText: caption,
      title: normalizeMetadataText(data.author_name || social.sourcePlatform),
      url: sourceUrl,
    };
  } catch {
    return null;
  }
}

async function fetchSocialUrlMetadataOnDevice(sourceUrl: string, social: SocialUrlDetection) {
  if (social.platform === 'instagram') {
    const oembedMetadata = await fetchInstagramOembedMetadata(sourceUrl, social);
    const oembedText = oembedMetadata ? buildSocialMetadataText(oembedMetadata) : '';

    if (oembedMetadata && hasEnoughRecipeText(oembedText)) {
      return oembedMetadata;
    }
  }

  if (social.platform === 'tiktok') {
    const oembedMetadata = await fetchTikTokOembedMetadata(sourceUrl, social);

    if (oembedMetadata) {
      return oembedMetadata;
    }
  }

  const fetchUrl = social.platform === 'instagram' ? getInstagramCanonicalUrl(sourceUrl) : sourceUrl;
  const response = await fetch(fetchUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8,fr;q=0.7',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error('Social URL returned HTTP ' + response.status + '.');
  }

  const html = await response.text();
  return extractSocialMetadataFromHtml(html, sourceUrl, social);
}

function createSocialMetadataReview(
  input: RecipeImportInput,
  social: SocialUrlDetection,
  metadata?: Partial<SocialUrlMetadata>,
): RecipeImportReview {
  const metadataText = buildSocialMetadataText({
    description: metadata?.description,
    rawText: metadata?.rawText ?? '',
    title: metadata?.title,
  });
  const fallbackTitle = social.platform === 'instagram' ? 'Instagram Reel import' : `${social.sourcePlatform} import`;
  const review = createReviewDraft({
    ...input,
    rawText: metadataText || fallbackTitle,
    sourcePlatform: social.sourcePlatform,
    sourceType: 'caption',
  });

  return {
    ...review,
    description: 'Imported from social link metadata. Review before saving.',
    ingredients: [],
    importMode: 'social_fallback',
    notes: metadataText,
    reviewMessage: SOCIAL_CAPTION_UNAVAILABLE_MESSAGE,
    reviewState: 'social_fallback',
    sourcePlatform: social.sourcePlatform,
    sourceType: 'caption',
    sourceUrl: input.sourceUrl?.trim() || undefined,
    steps: [],
    tags: [social.platform],
    title: normalizeMetadataText(metadata?.title).slice(0, 80) || fallbackTitle,
  };
}

async function cleanSocialRecipeUrlWithAi(input: RecipeImportInput, social: SocialUrlDetection) {
  const sourceUrl = input.sourceUrl?.trim();

  if (!sourceUrl) {
    return [createSocialMetadataReview(input, social)];
  }

  if (social.platform === 'instagram') {
    logImportDiagnostic('instagram_social_url', { sourcePlatform: social.sourcePlatform, sourceUrl });
  }

  let metadata: SocialUrlMetadata;

  try {
    metadata = await fetchSocialUrlMetadataOnDevice(sourceUrl, social);
  } catch (error) {
    logImportDiagnostic('blocked_or_unfetchable_social_url', {
      message: error instanceof Error ? error.message : String(error),
      sourcePlatform: social.sourcePlatform,
      sourceUrl,
    });
    logImportDiagnostic('caption_unavailable_from_public_metadata', {
      metadataLength: 0,
      sourcePlatform: social.sourcePlatform,
      sourceUrl,
    });
    return [createSocialMetadataReview(input, social)];
  }

  const metadataText = buildSocialMetadataText(metadata);

  if (!hasEnoughRecipeText(metadataText)) {
    logImportDiagnostic('social_metadata_only', {
      metadataLength: metadataText.length,
      recipeSignalCount: getRecipeSignalCount(metadataText),
      sourcePlatform: social.sourcePlatform,
      sourceUrl,
    });
    logImportDiagnostic('caption_unavailable_from_public_metadata', {
      metadataLength: metadataText.length,
      recipeSignalCount: getRecipeSignalCount(metadataText),
      sourcePlatform: social.sourcePlatform,
      sourceUrl,
    });
    return [createSocialMetadataReview(input, social, metadata)];
  }

  if (!isSupabaseConfigured()) {
    logImportDiagnostic('social_metadata_only', {
      metadataLength: metadataText.length,
      reason: 'supabase_not_configured',
      sourcePlatform: social.sourcePlatform,
      sourceUrl,
    });
    return [createSocialMetadataReview(input, social, metadata)];
  }

  try {
    logImportDiagnostic('ai_cleanup_fallback', {
      metadataLength: metadataText.length,
      sourcePlatform: social.sourcePlatform,
      sourceUrl,
    });
    return await cleanRecipeWithAi({
      ...input,
      rawText: metadataText.slice(0, 8000),
      sourcePlatform: social.sourcePlatform,
      sourceType: 'caption',
    });
  } catch (error) {
    logImportDiagnostic('incomplete_recipe', {
      message: error instanceof Error ? error.message : String(error),
      sourcePlatform: social.sourcePlatform,
      sourceUrl,
    });
    return [createSocialMetadataReview(input, social, metadata)];
  }
}

export async function cleanManualSocialCaptionWithAi(input: RecipeImportInput): Promise<RecipeImportReview[]> {
  const rawText = input.rawText.trim();
  const sourceUrl = input.sourceUrl?.trim();

  logImportDiagnostic('manual_caption_cleanup', {
    captionLength: rawText.length,
    sourcePlatform: input.sourcePlatform,
    sourceUrl,
  });

  try {
    return await cleanRecipeWithAi({
      ...input,
      rawText,
      sourceType: 'caption',
      sourceUrl,
    });
  } catch (error) {
    logImportDiagnostic('incomplete_recipe', {
      message: error instanceof Error ? error.message : String(error),
      sourcePlatform: input.sourcePlatform,
      sourceUrl,
    });
    throw new Error(MANUAL_CAPTION_CLEANUP_FAILED_MESSAGE);
  }
}

function parseReviews(input: RecipeImportInput, data: unknown, message: string) {
  const outputs = parseCleanRecipeCandidates(data);

  if (outputs.length === 0) {
    throw new Error(message);
  }

  return outputs.map((output) => outputToReview(input, output));
}

export async function cleanRecipeWithAi(input: RecipeImportInput): Promise<RecipeImportReview[]> {
  if (!isSupabaseConfigured()) {
    throw new Error(AI_CLEANER_NOT_READY_MESSAGE);
  }

  let data: unknown;
  let error: unknown;

  try {
    const result = await getSupabase().functions.invoke('clean-recipe', {
      body: {
        mode: 'text',
        raw_text: input.rawText,
        source_platform: input.sourcePlatform,
        source_type: input.sourceType,
        source_url: input.sourceUrl?.trim() || undefined,
        target_language: input.targetLanguage ?? 'original',
      },
    });
    data = result.data;
    error = result.error;
  } catch (invokeError) {
    throw new Error(await getFunctionErrorMessage(invokeError, AI_CLEANER_NOT_READY_MESSAGE));
  }

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, AI_CLEANER_NOT_READY_MESSAGE));
  }

  return parseReviews(input, data, AI_CLEANER_NOT_READY_MESSAGE);
}


export async function cleanRecipeUrlWithAi(input: RecipeImportInput): Promise<RecipeImportReview[]> {
  const social = detectSocialUrl(input.sourceUrl);

  if (social) {
    return cleanSocialRecipeUrlWithAi(input, social);
  }

  if (!isSupabaseConfigured()) {
    throw new Error(URL_AI_NOT_READY_MESSAGE);
  }

  let serverMessage = URL_AI_NOT_READY_MESSAGE;

  try {
    const { data, error } = await getSupabase().functions.invoke('clean-recipe', {
      body: {
        mode: 'url',
        source_platform: input.sourcePlatform,
        source_type: input.sourceType,
        source_url: input.sourceUrl?.trim() || undefined,
        target_language: input.targetLanguage ?? 'original',
      },
    });

    if (!error) {
      const diagnosticPath = isRecord(data) ? data.diagnostic_path : undefined;

      if (diagnosticPath === 'json_ld_recipe' || diagnosticPath === 'ai_cleanup_fallback') {
        logImportDiagnostic(diagnosticPath, { sourcePlatform: input.sourcePlatform, sourceUrl: input.sourceUrl });
      }

      return parseReviews(input, data, URL_AI_NOT_READY_MESSAGE);
    }

    serverMessage = await getFunctionErrorMessage(error, URL_AI_NOT_READY_MESSAGE);
  } catch (error) {
    serverMessage = await getFunctionErrorMessage(error, URL_AI_NOT_READY_MESSAGE);
  }

  try {
    const fetched = await fetchRecipeUrlTextOnDevice(input.sourceUrl);

    if (fetched.structuredRecipes.length > 0) {
      logImportDiagnostic('json_ld_recipe', {
        recipeCount: fetched.structuredRecipes.length,
        sourcePlatform: input.sourcePlatform,
        sourceUrl: input.sourceUrl,
      });
      return parseReviews(input, { recipes: fetched.structuredRecipes }, URL_AI_NOT_READY_MESSAGE);
    }

    logImportDiagnostic('ai_cleanup_fallback', {
      sourcePlatform: input.sourcePlatform,
      sourceUrl: input.sourceUrl,
      textLength: fetched.rawText.length,
    });
    return cleanRecipeWithAi({
      ...input,
      rawText: fetched.rawText.slice(0, 8000),
      sourceType: 'website',
    });
  } catch (deviceError) {
    if (deviceError instanceof Error && deviceError.message.trim()) {
      throw deviceError;
    }

    throw new Error(serverMessage);
  }
}
export async function cleanRecipeScreenshotsWithAi(
  input: RecipeImportInput,
  images: CleanRecipeImagePayload[],
): Promise<RecipeImportReview[]> {
  if (!isSupabaseConfigured()) {
    throw new Error(SCREENSHOT_AI_NOT_READY_MESSAGE);
  }

  let data: unknown;
  let error: unknown;

  try {
    const result = await getSupabase().functions.invoke('clean-recipe', {
      body: {
        images,
        mode: 'images',
        source_platform: input.sourcePlatform,
        source_type: input.sourceType,
        source_url: input.sourceUrl?.trim() || undefined,
        target_language: input.targetLanguage ?? 'original',
      },
    });
    data = result.data;
    error = result.error;
  } catch (invokeError) {
    throw new Error(await getFunctionErrorMessage(invokeError, SCREENSHOT_AI_NOT_READY_MESSAGE));
  }

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, SCREENSHOT_AI_NOT_READY_MESSAGE));
  }

  return parseReviews(input, data, SCREENSHOT_AI_NOT_READY_MESSAGE);
}

export function createManualReviewAfterAiFailure(input: RecipeImportInput) {
  return createReviewDraft(input);
}
