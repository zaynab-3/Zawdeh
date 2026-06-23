import { createReviewDraft } from '@/features/imports/importParser';
import type { RecipeImportInput, RecipeImportReview } from '@/features/imports/importTypes';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

export const AI_CLEANER_NOT_READY_MESSAGE = 'AI cleaner is not ready yet. You can still review manually.';
export const SCREENSHOT_AI_NOT_READY_MESSAGE = 'Could not read screenshots yet. You can paste the text manually.';

type CleanRecipeConfidence = 'low' | 'medium' | 'high';

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
  return value.replace(/^\s*(?:[-*•]+|\d+[.)-])\s*/u, '').trim();
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
    originalLanguage: output.original_language,
    prepTimeMinutes: output.prep_time_minutes,
    servings: output.servings,
    sourcePlatform: input.sourcePlatform,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    steps: steps.map((step, index) => ({ ...step, position: index + 1 })),
    tags: output.tags.length > 0 ? output.tags : [input.sourcePlatform.toLowerCase()],
    title: output.title,
  };
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

  const { data, error } = await getSupabase().functions.invoke('clean-recipe', {
    body: {
      mode: 'text',
      raw_text: input.rawText,
      source_platform: input.sourcePlatform,
      source_type: input.sourceType,
      source_url: input.sourceUrl?.trim() || undefined,
      target_language: input.targetLanguage ?? 'en',
    },
  });

  if (error) {
    throw new Error(AI_CLEANER_NOT_READY_MESSAGE);
  }

  return parseReviews(input, data, AI_CLEANER_NOT_READY_MESSAGE);
}

export async function cleanRecipeScreenshotsWithAi(
  input: RecipeImportInput,
  images: CleanRecipeImagePayload[],
): Promise<RecipeImportReview[]> {
  if (!isSupabaseConfigured()) {
    throw new Error(SCREENSHOT_AI_NOT_READY_MESSAGE);
  }

  const { data, error } = await getSupabase().functions.invoke('clean-recipe', {
    body: {
      images,
      mode: 'images',
      source_platform: input.sourcePlatform,
      source_type: 'screenshots',
      source_url: input.sourceUrl?.trim() || undefined,
      target_language: input.targetLanguage ?? 'en',
    },
  });

  if (error) {
    throw new Error(SCREENSHOT_AI_NOT_READY_MESSAGE);
  }

  return parseReviews(input, data, SCREENSHOT_AI_NOT_READY_MESSAGE);
}

export function createManualReviewAfterAiFailure(input: RecipeImportInput) {
  return createReviewDraft(input);
}
