import { createReviewDraft } from '@/features/imports/importParser';
import type { RecipeImportInput, RecipeImportReview } from '@/features/imports/importTypes';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

export const AI_CLEANER_NOT_READY_MESSAGE = 'AI cleaner is not ready yet. You can still review manually.';

type CleanRecipeIngredient = {
  name: string;
  note?: string;
  quantity?: string;
  unit?: string;
};

type CleanRecipeStep = {
  instruction: string;
  timer_minutes?: number;
};

type CleanRecipeOutput = {
  confidence: 'low' | 'medium' | 'high';
  cook_time_minutes?: number;
  description: string;
  ingredients: CleanRecipeIngredient[];
  notes?: string[] | string;
  original_language?: string;
  prep_time_minutes?: number;
  servings?: string;
  steps: CleanRecipeStep[] | string[];
  tags: string[];
  title: string;
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

function parseConfidence(value: unknown): CleanRecipeOutput['confidence'] {
  return value === 'medium' || value === 'high' ? value : 'low';
}

function parseIngredients(value: unknown): CleanRecipeIngredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((ingredient) => ({
      name: optionalString(ingredient.name) ?? '',
      note: optionalString(ingredient.note),
      quantity: optionalString(ingredient.quantity),
      unit: optionalString(ingredient.unit),
    }))
    .filter((ingredient) => ingredient.name.length > 0)
    .slice(0, 80);
}

function parseSteps(value: unknown): CleanRecipeStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((step) => {
      if (typeof step === 'string') {
        return { instruction: step.trim() };
      }

      if (isRecord(step)) {
        return {
          instruction: optionalString(step.instruction) ?? '',
          timer_minutes: optionalPositiveInteger(step.timer_minutes),
        };
      }

      return { instruction: '' };
    })
    .filter((step) => step.instruction.length > 0)
    .slice(0, 80);
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

function parseCleanRecipeOutput(value: unknown): CleanRecipeOutput | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = optionalString(value.title);
  const description = optionalString(value.description) ?? 'Imported from cleaned text.';
  const ingredients = parseIngredients(value.ingredients);
  const steps = parseSteps(value.steps);

  if (!title || (ingredients.length === 0 && steps.length === 0)) {
    return null;
  }

  return {
    confidence: parseConfidence(value.confidence),
    cook_time_minutes: optionalPositiveInteger(value.cook_time_minutes),
    description,
    ingredients,
    notes: parseStringList(value.notes),
    original_language: optionalString(value.original_language),
    prep_time_minutes: optionalPositiveInteger(value.prep_time_minutes),
    servings: optionalString(value.servings),
    steps,
    tags: parseStringList(value.tags),
    title,
  };
}

function outputToReview(input: RecipeImportInput, output: CleanRecipeOutput): RecipeImportReview {
  return {
    confidence: output.confidence,
    cookTimeMinutes: output.cook_time_minutes,
    description: output.description,
    importMode: 'ai',
    ingredients: output.ingredients.map((ingredient, index) => ({
      id: `ingredient-${index + 1}`,
      name: ingredient.name,
      note: ingredient.note,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    })),
    notes: parseStringList(output.notes).join('\n'),
    originalLanguage: output.original_language,
    prepTimeMinutes: output.prep_time_minutes,
    servings: output.servings,
    sourcePlatform: input.sourcePlatform,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    steps: output.steps.map((step, index) => ({
      id: `step-${index + 1}`,
      instruction: typeof step === 'string' ? step : step.instruction,
      position: index + 1,
      timerMinutes: typeof step === 'string' ? undefined : step.timer_minutes,
    })),
    tags: output.tags.length > 0 ? output.tags : [input.sourcePlatform.toLowerCase()],
    title: output.title,
  };
}

export async function cleanRecipeWithAi(input: RecipeImportInput): Promise<RecipeImportReview> {
  if (!isSupabaseConfigured()) {
    throw new Error(AI_CLEANER_NOT_READY_MESSAGE);
  }

  const { data, error } = await getSupabase().functions.invoke('clean-recipe', {
    body: {
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

  const output = parseCleanRecipeOutput(data);

  if (!output) {
    throw new Error(AI_CLEANER_NOT_READY_MESSAGE);
  }

  return outputToReview(input, output);
}

export function createManualReviewAfterAiFailure(input: RecipeImportInput) {
  return createReviewDraft(input);
}
