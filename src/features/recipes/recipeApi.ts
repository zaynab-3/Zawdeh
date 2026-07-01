import {
  buildRecipeFromDraft,
  deleteRecipe as deleteRecipeFromStore,
  getRecipeDetailFromStore,
  listRecipeSummariesFromStore,
  loadRecipes,
  removeRecipeFromCache,
  replaceRecipeCache,
  saveRecipeDraft,
  toggleRecipeFavorite,
  upsertRecipeCache,
} from '@/features/recipes/recipeStore';
import type { CookabilityState, RecipeDetail, RecipeDraft, RecipeSummary } from '@/features/recipes/recipeTypes';
import { getSupabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabaseSession';
import { isNetworkUnavailableError, throwIfDatabaseNotReady } from '@/lib/supabaseStatus';
import type { Database, Visibility } from '@/types/database';

type RecipeRow = Database['public']['Tables']['recipes']['Row'];
type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];
type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];
type IngredientRow = Database['public']['Tables']['recipe_ingredients']['Row'];
type IngredientInsert = Database['public']['Tables']['recipe_ingredients']['Insert'];
type StepRow = Database['public']['Tables']['recipe_steps']['Row'];
type StepInsert = Database['public']['Tables']['recipe_steps']['Insert'];
type NoteRow = Database['public']['Tables']['recipe_notes']['Row'];
type NoteInsert = Database['public']['Tables']['recipe_notes']['Insert'];
type TagRow = Database['public']['Tables']['recipe_tags']['Row'];
type TagInsert = Database['public']['Tables']['recipe_tags']['Insert'];
export type RecipeListScope = 'all' | 'mine' | 'shared' | 'public';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value?: string) {
  return Boolean(value && uuidPattern.test(value));
}

function nullIfBlank(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function groupByRecipeId<Row extends { recipe_id: string }>(rows: Row[]) {
  const byRecipeId = new Map<string, Row[]>();

  rows.forEach((row) => {
    byRecipeId.set(row.recipe_id, [...(byRecipeId.get(row.recipe_id) ?? []), row]);
  });

  return byRecipeId;
}

function summarize(recipe: RecipeDetail): RecipeSummary {
  const { ingredients, notes, steps, ...summary } = recipe;
  return summary;
}

function createRecipeInsert(recipe: RecipeDetail, userId: string): RecipeInsert {
  return {
    cook_time_minutes: recipe.cookTimeMinutes ?? null,
    cuisine: nullIfBlank(recipe.cuisine),
    description: nullIfBlank(recipe.description),
    is_favorite: recipe.isFavorite,
    meal_type: nullIfBlank(recipe.mealType),
    original_language: nullIfBlank(recipe.originalLanguage),
    prep_time_minutes: recipe.prepTimeMinutes ?? null,
    saved_language: recipe.savedLanguage ?? 'en',
    servings: nullIfBlank(recipe.servings),
    source_platform: nullIfBlank(recipe.sourcePlatform),
    source_type: nullIfBlank(recipe.sourceType) ?? (recipe.sourcePlatform === 'Manual' ? 'manual' : 'caption'),
    source_url: nullIfBlank(recipe.sourceUrl),
    title: recipe.title.trim(),
    user_id: userId,
    visibility: recipe.visibility ?? 'private',
  };
}

function createRecipeUpdate(recipe: RecipeDetail): RecipeUpdate {
  return {
    cook_time_minutes: recipe.cookTimeMinutes ?? null,
    cuisine: nullIfBlank(recipe.cuisine),
    description: nullIfBlank(recipe.description),
    is_favorite: recipe.isFavorite,
    is_deleted: false,
    meal_type: nullIfBlank(recipe.mealType),
    original_language: nullIfBlank(recipe.originalLanguage),
    prep_time_minutes: recipe.prepTimeMinutes ?? null,
    saved_language: recipe.savedLanguage ?? 'en',
    servings: nullIfBlank(recipe.servings),
    source_platform: nullIfBlank(recipe.sourcePlatform),
    source_type: nullIfBlank(recipe.sourceType) ?? (recipe.sourcePlatform === 'Manual' ? 'manual' : 'caption'),
    source_url: nullIfBlank(recipe.sourceUrl),
    title: recipe.title.trim(),
    visibility: recipe.visibility ?? 'private',
  };
}

function mapRecipeDetail(
  recipe: RecipeRow,
  ingredients: IngredientRow[],
  steps: StepRow[],
  notes: NoteRow[],
  tags: TagRow[],
): RecipeDetail {
  return {
    cookability: 'needs_shopping' satisfies CookabilityState,
    cookTimeMinutes: recipe.cook_time_minutes ?? undefined,
    cuisine: recipe.cuisine ?? 'Home cooking',
    createdAt: recipe.created_at,
    description: recipe.description ?? '',
    id: recipe.id,
    ingredients: ingredients.map((ingredient) => ({
      id: ingredient.id,
      isOptional: ingredient.is_optional,
      name: ingredient.name,
      note: ingredient.note ?? undefined,
      quantity: ingredient.quantity ?? undefined,
      section: ingredient.section ?? undefined,
      unit: ingredient.unit ?? undefined,
    })),
    isFavorite: recipe.is_favorite,
    mealType: recipe.meal_type ?? 'Anytime',
    notes: notes.map((note) => note.note),
    originalLanguage: recipe.original_language ?? undefined,
    prepTimeMinutes: recipe.prep_time_minutes ?? undefined,
    savedLanguage: recipe.saved_language,
    servings: recipe.servings ?? undefined,
    sourcePlatform: recipe.source_platform ?? undefined,
    sourceType: recipe.source_type,
    sourceUrl: recipe.source_url ?? undefined,
    steps: steps.map((step) => ({
      id: step.id,
      instruction: step.instruction,
      position: step.position,
      section: step.section ?? undefined,
      timerMinutes: step.timer_minutes ?? undefined,
    })),
    tags: tags.map((tag) => tag.tag),
    title: recipe.title,
    updatedAt: recipe.updated_at,
    userId: recipe.user_id,
    visibility: recipe.visibility,
  };
}

async function fetchRemoteRecipes(userId: string, recipeId?: string, scope: RecipeListScope = 'all') {
  const supabase = getSupabase();
  let recipeQuery = supabase
    .from('recipes')
    .select('*')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  if (scope === 'mine') {
    recipeQuery = recipeQuery.eq('user_id', userId);
  } else if (scope === 'shared') {
    recipeQuery = recipeQuery.eq('visibility', 'shared' satisfies Visibility).neq('user_id', userId);
  } else if (scope === 'public') {
    recipeQuery = recipeQuery.eq('visibility', 'public' satisfies Visibility);
  }

  if (recipeId) {
    recipeQuery = recipeQuery.eq('id', recipeId);
  }

  const { data: recipes, error: recipeError } = await recipeQuery;

  if (recipeError) {
    throwIfDatabaseNotReady(recipeError);
    throw recipeError;
  }

  if (!recipes?.length) {
    return [];
  }

  const recipeIds = recipes.map((recipe) => recipe.id);
  const [
    { data: ingredients, error: ingredientsError },
    { data: steps, error: stepsError },
    { data: notes, error: notesError },
    { data: tags, error: tagsError },
  ] = await Promise.all([
    supabase.from('recipe_ingredients').select('*').in('recipe_id', recipeIds).order('position'),
    supabase.from('recipe_steps').select('*').in('recipe_id', recipeIds).order('position'),
    supabase.from('recipe_notes').select('*').in('recipe_id', recipeIds).order('created_at'),
    supabase.from('recipe_tags').select('*').in('recipe_id', recipeIds).order('tag'),
  ]);

  const childError = ingredientsError ?? stepsError ?? notesError ?? tagsError;

  if (childError) {
    throwIfDatabaseNotReady(childError);
    throw childError;
  }

  const ingredientsByRecipe = groupByRecipeId(ingredients ?? []);
  const stepsByRecipe = groupByRecipeId(steps ?? []);
  const notesByRecipe = groupByRecipeId(notes ?? []);
  const tagsByRecipe = groupByRecipeId(tags ?? []);

  return recipes.map((recipe) =>
    mapRecipeDetail(
      recipe,
      ingredientsByRecipe.get(recipe.id) ?? [],
      stepsByRecipe.get(recipe.id) ?? [],
      notesByRecipe.get(recipe.id) ?? [],
      tagsByRecipe.get(recipe.id) ?? [],
    ),
  );
}

async function fetchRemoteRecipe(userId: string, id: string) {
  const recipes = await fetchRemoteRecipes(userId, id);
  return recipes[0] ?? null;
}

async function replaceRecipeChildren(userId: string, recipe: RecipeDetail) {
  const supabase = getSupabase();
  const recipeId = recipe.id;
  const deleteResults = await Promise.all([
    supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId).eq('user_id', userId),
    supabase.from('recipe_steps').delete().eq('recipe_id', recipeId).eq('user_id', userId),
    supabase.from('recipe_notes').delete().eq('recipe_id', recipeId).eq('user_id', userId),
    supabase.from('recipe_tags').delete().eq('recipe_id', recipeId).eq('user_id', userId),
  ]);
  const deleteError = deleteResults.map((result) => result.error).find(Boolean);

  if (deleteError) {
    throwIfDatabaseNotReady(deleteError);
    throw deleteError;
  }

  const ingredientRows: IngredientInsert[] = recipe.ingredients.map((ingredient, index) => ({
    is_optional: ingredient.isOptional ?? false,
    name: ingredient.name,
    note: ingredient.note ?? null,
    position: index + 1,
    quantity: ingredient.quantity ?? null,
    recipe_id: recipeId,
    section: ingredient.section ?? null,
    unit: ingredient.unit ?? null,
    user_id: userId,
  }));
  const stepRows: StepInsert[] = recipe.steps.map((step, index) => ({
    instruction: step.instruction,
    position: index + 1,
    recipe_id: recipeId,
    section: step.section ?? null,
    timer_minutes: step.timerMinutes ?? null,
    user_id: userId,
  }));
  const noteRows: NoteInsert[] = recipe.notes.map((note) => ({
    note,
    recipe_id: recipeId,
    user_id: userId,
  }));
  const tagRows: TagInsert[] = uniqueValues(recipe.tags).map((tag) => ({
    recipe_id: recipeId,
    tag,
    user_id: userId,
  }));
  const insertResults = await Promise.all([
    ingredientRows.length ? supabase.from('recipe_ingredients').insert(ingredientRows) : Promise.resolve({ error: null }),
    stepRows.length ? supabase.from('recipe_steps').insert(stepRows) : Promise.resolve({ error: null }),
    noteRows.length ? supabase.from('recipe_notes').insert(noteRows) : Promise.resolve({ error: null }),
    tagRows.length ? supabase.from('recipe_tags').insert(tagRows) : Promise.resolve({ error: null }),
  ]);
  const insertError = insertResults.map((result) => result.error).find(Boolean);

  if (insertError) {
    throwIfDatabaseNotReady(insertError);
    throw insertError;
  }
}

async function saveRemoteRecipe(userId: string, draft: RecipeDraft) {
  const draftId = draft.id;
  const currentRecipe = isUuid(draftId) && draftId ? await fetchRemoteRecipe(userId, draftId) : null;
  const normalizedRecipe = buildRecipeFromDraft(draft, currentRecipe ?? undefined);
  const supabase = getSupabase();
  const { data: savedRow, error } = currentRecipe
    ? await supabase
        .from('recipes')
        .update(createRecipeUpdate(normalizedRecipe))
        .eq('id', currentRecipe.id)
        .eq('user_id', userId)
        .select('*')
        .single()
    : await supabase.from('recipes').insert(createRecipeInsert(normalizedRecipe, userId)).select('*').single();

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  if (!savedRow) {
    throw new Error('Recipe save failed');
  }

  const recipeWithRemoteId: RecipeDetail = { ...normalizedRecipe, id: savedRow.id };
  await replaceRecipeChildren(userId, recipeWithRemoteId);

  const savedRecipe = await fetchRemoteRecipe(userId, savedRow.id);

  if (!savedRecipe) {
    throw new Error('Recipe saved but could not be read');
  }

  await upsertRecipeCache(savedRecipe);
  return savedRecipe;
}

export async function listRecipeDetails(scope: RecipeListScope = 'all'): Promise<RecipeDetail[]> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return loadRecipes();
  }

  try {
    const recipes = await fetchRemoteRecipes(user.id, undefined, scope);
    return replaceRecipeCache(recipes);
  } catch (error) {
    throwIfDatabaseNotReady(error);
    if (!isNetworkUnavailableError(error)) {
      console.warn('Unable to load recipes from Supabase', error);
    }
    return loadRecipes();
  }
}

export async function listRecipeSummaries(query: string, scope: RecipeListScope = 'all'): Promise<RecipeSummary[]> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return listRecipeSummariesFromStore(query);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const recipes = await listRecipeDetails(scope);
  const summaries = recipes.map(summarize);

  if (!normalizedQuery) {
    return summaries;
  }

  return summaries.filter((recipe) =>
    [recipe.title, recipe.description, recipe.cuisine, recipe.mealType, recipe.sourcePlatform, ...recipe.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export async function getRecipeDetail(id: string): Promise<RecipeDetail | null> {
  const user = await getAuthenticatedUser();

  if (!user || !isUuid(id)) {
    return getRecipeDetailFromStore(id);
  }

  try {
    const recipe = await fetchRemoteRecipe(user.id, id);

    if (recipe) {
      await upsertRecipeCache(recipe);
    }

    return recipe;
  } catch (error) {
    throwIfDatabaseNotReady(error);
    if (!isNetworkUnavailableError(error)) {
      console.warn('Unable to load recipe from Supabase', error);
    }
    return getRecipeDetailFromStore(id);
  }
}

export async function saveRecipe(recipe: RecipeDraft): Promise<RecipeDetail> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return saveRecipeDraft(recipe);
  }

  return saveRemoteRecipe(user.id, recipe);
}

export async function toggleFavoriteRecipe(id: string): Promise<RecipeDetail | null> {
  const user = await getAuthenticatedUser();

  if (!user || !isUuid(id)) {
    return toggleRecipeFavorite(id);
  }

  const currentRecipe = await fetchRemoteRecipe(user.id, id);

  if (!currentRecipe) {
    return null;
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('recipes')
    .update({ is_favorite: !currentRecipe.isFavorite })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  const updatedRecipe = await fetchRemoteRecipe(user.id, id);

  if (updatedRecipe) {
    await upsertRecipeCache(updatedRecipe);
  }

  return updatedRecipe;
}

export async function deleteRecipe(id: string) {
  const user = await getAuthenticatedUser();

  if (!user || !isUuid(id)) {
    await deleteRecipeFromStore(id);
    return;
  }

  const { data, error } = await getSupabase()
    .from('recipes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  if (!data) {
    throw new Error('Recipe could not be deleted.');
  }

  await removeRecipeFromCache(id);
}
