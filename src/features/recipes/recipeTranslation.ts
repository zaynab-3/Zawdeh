import AsyncStorage from '@react-native-async-storage/async-storage';

import { detectImportedLanguage, normalizeDetectedLanguage, type DetectedLanguage } from '@/features/imports/languageDetection';
import type { RecipeDetail, RecipeIngredient, RecipeStep, RecipeSummary } from '@/features/recipes/recipeTypes';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabaseSession';
import { throwIfDatabaseNotReady } from '@/lib/supabaseStatus';
import type { Json } from '@/types/database';

const LOCAL_TRANSLATION_CACHE_KEY = 'zawdeh.recipeTranslations.v1';

export type StructuredRecipeTranslation = {
  cuisine: string;
  description: string;
  ingredients: RecipeIngredient[];
  mealType: string;
  notes: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: string;
  steps: RecipeStep[];
  tags: string[];
  title: string;
};

export type RecipeTranslationRequest = {
  recipeId: string;
  sourceLanguage: DetectedLanguage;
  targetLanguage: DetectedLanguage;
};

export type RecipeTranslationProvider = {
  name: string;
  translateRecipe: (
    content: StructuredRecipeTranslation,
    request: RecipeTranslationRequest,
  ) => Promise<StructuredRecipeTranslation>;
};

type LocalTranslationCache = Record<string, StructuredRecipeTranslation>;

const edgeFunctionTranslationProvider: RecipeTranslationProvider = {
  name: 'clean-recipe-translate',
  async translateRecipe(content, request) {
    if (!isSupabaseConfigured()) {
      throw new Error('Recipe translation is not configured.');
    }

    const { data, error } = await getSupabase().functions.invoke('clean-recipe', {
      body: {
        mode: 'translate',
        recipe: content,
        source_language: request.sourceLanguage,
        target_language: request.targetLanguage,
      },
    });

    if (error) {
      throw error;
    }

    const translatedContent = parseStructuredRecipeTranslation(
      typeof data === 'object' && data && 'content' in data ? data.content : data,
      content,
    );

    if (!translatedContent) {
      throw new Error('Recipe translation returned invalid content.');
    }

    return translatedContent;
  },
};

let translationProvider: RecipeTranslationProvider = edgeFunctionTranslationProvider;
const inFlightTranslations = new Map<string, Promise<StructuredRecipeTranslation>>();

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/iu.test(value);
}

function getCacheKey(recipeId: string, targetLanguage: DetectedLanguage) {
  return `${recipeId}:${targetLanguage}`;
}

function getStructuredRecipeContent(recipe: RecipeDetail): StructuredRecipeTranslation {
  return {
    cookTimeMinutes: recipe.cookTimeMinutes,
    cuisine: recipe.cuisine,
    description: recipe.description,
    ingredients: recipe.ingredients,
    mealType: recipe.mealType,
    notes: recipe.notes,
    prepTimeMinutes: recipe.prepTimeMinutes,
    servings: recipe.servings,
    steps: recipe.steps,
    tags: recipe.tags,
    title: recipe.title,
  };
}

function optionalString(value: unknown, fallback?: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function optionalNumber(value: unknown, fallback?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const values = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  return values.length > 0 ? values : fallback;
}

function parseIngredient(value: unknown, index: number, fallback?: RecipeIngredient): RecipeIngredient | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback ?? null;
  }

  const ingredient = value as Partial<RecipeIngredient>;
  const name = optionalString(ingredient.name, fallback?.name);

  if (!name) {
    return fallback ?? null;
  }

  return {
    id: optionalString(ingredient.id, fallback?.id) ?? `ingredient-${index + 1}`,
    isOptional: typeof ingredient.isOptional === 'boolean' ? ingredient.isOptional : fallback?.isOptional,
    name,
    note: optionalString(ingredient.note, fallback?.note),
    quantity: optionalString(ingredient.quantity, fallback?.quantity),
    section: optionalString(ingredient.section, fallback?.section),
    unit: optionalString(ingredient.unit, fallback?.unit),
  };
}

function parseStep(value: unknown, index: number, fallback?: RecipeStep): RecipeStep | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback ?? null;
  }

  const step = value as Partial<RecipeStep>;
  const instruction = optionalString(step.instruction, fallback?.instruction);

  if (!instruction) {
    return fallback ?? null;
  }

  return {
    id: optionalString(step.id, fallback?.id) ?? `step-${index + 1}`,
    instruction,
    position: optionalNumber(step.position, fallback?.position ?? index + 1) ?? index + 1,
    section: optionalString(step.section, fallback?.section),
    timerMinutes: optionalNumber(step.timerMinutes, fallback?.timerMinutes),
  };
}

function parseStructuredRecipeTranslation(
  value: unknown,
  fallback?: StructuredRecipeTranslation,
): StructuredRecipeTranslation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const content = value as Partial<StructuredRecipeTranslation>;
  const ingredients = Array.isArray(content.ingredients)
    ? content.ingredients
        .map((ingredient, index) => parseIngredient(ingredient, index, fallback?.ingredients[index]))
        .filter((ingredient): ingredient is RecipeIngredient => Boolean(ingredient))
    : null;
  const steps = Array.isArray(content.steps)
    ? content.steps
        .map((step, index) => parseStep(step, index, fallback?.steps[index]))
        .filter((step): step is RecipeStep => Boolean(step))
    : null;

  if (!ingredients || !steps || !optionalString(content.title, fallback?.title)) {
    return null;
  }

  return {
    cookTimeMinutes: optionalNumber(content.cookTimeMinutes, fallback?.cookTimeMinutes),
    cuisine: optionalString(content.cuisine, fallback?.cuisine) ?? '',
    description: optionalString(content.description, fallback?.description) ?? '',
    ingredients,
    mealType: optionalString(content.mealType, fallback?.mealType) ?? '',
    notes: stringList(content.notes, fallback?.notes ?? []),
    prepTimeMinutes: optionalNumber(content.prepTimeMinutes, fallback?.prepTimeMinutes),
    servings: optionalString(content.servings, fallback?.servings),
    steps,
    tags: stringList(content.tags, fallback?.tags ?? []),
    title: optionalString(content.title, fallback?.title) ?? '',
  };
}

async function readLocalCache() {
  try {
    const rawValue = await AsyncStorage.getItem(LOCAL_TRANSLATION_CACHE_KEY);
    const parsed = rawValue ? (JSON.parse(rawValue) as LocalTranslationCache) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function getLocalCachedTranslation(recipeId: string, targetLanguage: DetectedLanguage) {
  const cache = await readLocalCache();
  const cached = cache[getCacheKey(recipeId, targetLanguage)];
  return parseStructuredRecipeTranslation(cached);
}

async function setLocalCachedTranslation(
  recipeId: string,
  targetLanguage: DetectedLanguage,
  content: StructuredRecipeTranslation,
) {
  const cache = await readLocalCache();
  cache[getCacheKey(recipeId, targetLanguage)] = content;
  await AsyncStorage.setItem(LOCAL_TRANSLATION_CACHE_KEY, JSON.stringify(cache));
}

async function getRemoteCachedTranslation(recipeId: string, targetLanguage: DetectedLanguage) {
  const user = await getAuthenticatedUser();

  if (!user || !isUuid(recipeId)) {
    return null;
  }

  const { data, error } = await getSupabase()
    .from('recipe_translations')
    .select('content')
    .eq('user_id', user.id)
    .eq('recipe_id', recipeId)
    .eq('target_language', targetLanguage)
    .maybeSingle();

  if (error) {
    throwIfDatabaseNotReady(error);
    return null;
  }

  return parseStructuredRecipeTranslation(data?.content);
}

async function setRemoteCachedTranslation(
  recipeId: string,
  targetLanguage: DetectedLanguage,
  content: StructuredRecipeTranslation,
) {
  const user = await getAuthenticatedUser();

  if (!user || !isUuid(recipeId)) {
    return false;
  }

  const { error } = await getSupabase().from('recipe_translations').upsert(
    {
      content: content as unknown as Json,
      provider: translationProvider.name,
      recipe_id: recipeId,
      target_language: targetLanguage,
      user_id: user.id,
    },
    { onConflict: 'user_id,recipe_id,target_language' },
  );

  if (error) {
    throwIfDatabaseNotReady(error);
    return false;
  }

  return true;
}

export function setRecipeTranslationProvider(provider: RecipeTranslationProvider) {
  translationProvider = provider;
}

function getDetectedRecipeLanguage(recipe: RecipeDetail) {
  const metadataLanguage = normalizeDetectedLanguage(recipe.originalLanguage ?? recipe.savedLanguage);

  if (metadataLanguage !== 'unknown') {
    return metadataLanguage;
  }

  return detectImportedLanguage(
    [
      recipe.title,
      recipe.description,
      recipe.cuisine,
      recipe.mealType,
      ...recipe.ingredients.map((ingredient) => [ingredient.name, ingredient.note, ingredient.section].filter(Boolean).join(' ')),
      ...recipe.steps.map((step) => [step.instruction, step.section].filter(Boolean).join(' ')),
      recipe.notes.join(' '),
    ].join('\n'),
  );
}

export function recipeNeedsDisplayTranslation(recipe: RecipeDetail, targetLanguageValue: string) {
  const targetLanguage = normalizeDetectedLanguage(targetLanguageValue);
  const sourceLanguage = getDetectedRecipeLanguage(recipe);

  return targetLanguage !== 'unknown' && sourceLanguage !== 'unknown' && sourceLanguage !== targetLanguage;
}

function applyTranslationToRecipe<T extends RecipeSummary | RecipeDetail>(
  recipe: T,
  content: StructuredRecipeTranslation,
): T {
  const summary = {
    ...recipe,
    cookTimeMinutes: content.cookTimeMinutes,
    cuisine: content.cuisine,
    description: content.description,
    mealType: content.mealType,
    prepTimeMinutes: content.prepTimeMinutes,
    servings: content.servings,
    tags: content.tags,
    title: content.title,
  };

  if ('ingredients' in recipe && 'steps' in recipe && 'notes' in recipe) {
    return {
      ...summary,
      ingredients: content.ingredients,
      notes: content.notes,
      steps: content.steps,
    } as T;
  }

  return summary as T;
}

export async function getTranslatedRecipeContent(
  recipe: RecipeDetail,
  targetLanguageValue: string,
): Promise<StructuredRecipeTranslation> {
  const targetLanguage = normalizeDetectedLanguage(targetLanguageValue);
  const sourceLanguage = getDetectedRecipeLanguage(recipe);
  const originalContent = getStructuredRecipeContent(recipe);

  if (targetLanguage === 'unknown' || sourceLanguage === 'unknown' || sourceLanguage === targetLanguage) {
    return originalContent;
  }

  const cachedRemote = await getRemoteCachedTranslation(recipe.id, targetLanguage);

  if (cachedRemote) {
    return cachedRemote;
  }

  const cachedLocal = await getLocalCachedTranslation(recipe.id, targetLanguage);

  if (cachedLocal) {
    return cachedLocal;
  }

  const cacheKey = getCacheKey(recipe.id, targetLanguage);
  const inFlightTranslation =
    inFlightTranslations.get(cacheKey) ??
    translationProvider.translateRecipe(originalContent, {
      recipeId: recipe.id,
      sourceLanguage,
      targetLanguage,
    });

  inFlightTranslations.set(cacheKey, inFlightTranslation);

  try {
    const translatedContent = await inFlightTranslation;
    const savedRemotely = await setRemoteCachedTranslation(recipe.id, targetLanguage, translatedContent);

    if (!savedRemotely) {
      await setLocalCachedTranslation(recipe.id, targetLanguage, translatedContent);
    }

    return translatedContent;
  } finally {
    inFlightTranslations.delete(cacheKey);
  }
}

export async function getRecipeForDisplay(recipe: RecipeDetail, targetLanguageValue: string): Promise<RecipeDetail> {
  if (!recipeNeedsDisplayTranslation(recipe, targetLanguageValue)) {
    return recipe;
  }

  return applyTranslationToRecipe(recipe, await getTranslatedRecipeContent(recipe, targetLanguageValue));
}
