import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecipeDetail, RecipeDraft, RecipeIngredient, RecipeStep, RecipeSummary } from '@/features/recipes/recipeTypes';

const RECIPES_STORAGE_KEY = 'zawdeh.recipes.v1';

type RecipeListener = (recipes: RecipeDetail[]) => void;
type StoredRecipeState = {
  recipes?: RecipeDetail[];
};

let recipeCache: RecipeDetail[] | null = null;
const listeners = new Set<RecipeListener>();

const seedRecipes: RecipeDetail[] = [
  {
    cookability: 'ready_with_substitutions',
    cookTimeMinutes: 38,
    cuisine: 'Lebanese',
    createdAt: '2026-06-21T00:00:00.000Z',
    description: 'A pantry-friendly lentil and rice comfort dish with crispy onions.',
    id: 'mjadra',
    ingredients: [
      { id: 'lentils', name: 'Brown lentils', quantity: '1', unit: 'cup' },
      { id: 'rice', name: 'Rice', quantity: '1', unit: 'cup' },
      { id: 'onions', name: 'Onions', quantity: '3', unit: 'large' },
      { id: 'olive-oil', name: 'Olive oil', quantity: '3', unit: 'tbsp' },
    ],
    isFavorite: true,
    mealType: 'Dinner',
    notes: ['Works with bulgur instead of rice.'],
    prepTimeMinutes: 10,
    servings: '4',
    sourcePlatform: 'Manual',
    steps: [
      { id: 'step-1', instruction: 'Cook lentils until just tender.', position: 1, timerMinutes: 18 },
      { id: 'step-2', instruction: 'Add rice and simmer until soft.', position: 2, timerMinutes: 20 },
      { id: 'step-3', instruction: 'Top with crispy onions and olive oil.', position: 3 },
    ],
    tags: ['pantry', 'vegan'],
    title: 'Mjadra',
    updatedAt: '2026-06-21T00:00:00.000Z',
  },
  {
    cookability: 'needs_shopping',
    cuisine: 'Mediterranean',
    createdAt: '2026-06-21T00:00:00.000Z',
    description: 'A clean saved recipe placeholder for imported social captions.',
    id: 'imported-salad',
    ingredients: [
      { id: 'tomatoes', name: 'Tomatoes', quantity: '2', unit: 'cups' },
      { id: 'cucumber', name: 'Cucumber', quantity: '1', unit: 'large' },
      { id: 'lemon', name: 'Lemon', quantity: '1' },
    ],
    isFavorite: false,
    mealType: 'Lunch',
    notes: ['Review imported details before saving.'],
    prepTimeMinutes: 12,
    servings: '2',
    sourcePlatform: 'Import draft',
    steps: [{ id: 'step-1', instruction: 'Chop and toss everything together.', position: 1 }],
    tags: ['imported', 'fresh'],
    title: 'Imported Salad Draft',
    updatedAt: '2026-06-21T00:00:00.000Z',
  },
];

function notifyRecipes(nextRecipes: RecipeDetail[]) {
  listeners.forEach((listener) => listener(nextRecipes));
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);

  return slug || 'recipe';
}

function summarize(recipe: RecipeDetail): RecipeSummary {
  const { ingredients, notes, steps, ...summary } = recipe;
  return summary;
}

function sortRecipes(recipes: RecipeDetail[]) {
  return [...recipes].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '');
    const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '');
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

function normalizeIngredient(ingredient: RecipeIngredient, index: number): RecipeIngredient {
  return {
    ...ingredient,
    id: ingredient.id || generateId(`ingredient-${index + 1}`),
    name: ingredient.name.trim(),
    note: ingredient.note?.trim() || undefined,
    quantity: ingredient.quantity?.trim() || undefined,
    unit: ingredient.unit?.trim() || undefined,
  };
}

function normalizeStep(step: RecipeStep, index: number): RecipeStep {
  return {
    ...step,
    id: step.id || generateId(`step-${index + 1}`),
    instruction: step.instruction.trim(),
    position: index + 1,
  };
}

function recipeFromDraft(draft: RecipeDraft, current?: RecipeDetail): RecipeDetail {
  const now = new Date().toISOString();
  const ingredients = draft.ingredients
    .map(normalizeIngredient)
    .filter((ingredient) => ingredient.name.length > 0);
  const steps = draft.steps.map(normalizeStep).filter((step) => step.instruction.length > 0);
  const notes = draft.notes
    .split('\n')
    .map((note) => note.trim())
    .filter(Boolean);
  const tags = draft.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);

  return {
    cookability: draft.cookability ?? current?.cookability ?? 'needs_shopping',
    cookTimeMinutes: draft.cookTimeMinutes ?? current?.cookTimeMinutes,
    cuisine: draft.cuisine?.trim() || current?.cuisine || 'Home cooking',
    createdAt: current?.createdAt ?? now,
    description: draft.description.trim() || 'Saved recipe',
    id: draft.id ?? current?.id ?? `${slugify(draft.title)}-${Date.now().toString(36)}`,
    ingredients,
    isFavorite: draft.isFavorite ?? current?.isFavorite ?? false,
    mealType: draft.mealType?.trim() || current?.mealType || 'Anytime',
    notes,
    prepTimeMinutes: draft.prepTimeMinutes ?? current?.prepTimeMinutes,
    servings: draft.servings?.trim() || current?.servings,
    sourcePlatform: draft.sourcePlatform?.trim() || current?.sourcePlatform || 'Manual',
    sourceUrl: draft.sourceUrl?.trim() || current?.sourceUrl,
    steps,
    tags,
    title: draft.title.trim(),
    updatedAt: now,
  };
}

async function persistRecipes(nextRecipes: RecipeDetail[]) {
  const sortedRecipes = sortRecipes(nextRecipes);
  recipeCache = sortedRecipes;

  try {
    await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify({ recipes: sortedRecipes }));
  } catch (error) {
    console.warn('Unable to save recipes locally', error);
  }

  notifyRecipes(sortedRecipes);
  return sortedRecipes;
}

export function subscribeRecipes(listener: RecipeListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export async function loadRecipes() {
  if (recipeCache) {
    return recipeCache;
  }

  try {
    const rawValue = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
    const parsed = rawValue ? (JSON.parse(rawValue) as StoredRecipeState) : null;

    if (parsed?.recipes && Array.isArray(parsed.recipes)) {
      recipeCache = sortRecipes(parsed.recipes);
      return recipeCache;
    }
  } catch (error) {
    console.warn('Unable to load saved recipes locally', error);
  }

  recipeCache = sortRecipes(seedRecipes);
  return recipeCache;
}

export async function listRecipeSummariesFromStore(query = '') {
  const recipes = await loadRecipes();
  const normalizedQuery = query.trim().toLowerCase();
  const summaries = recipes.map(summarize);

  if (!normalizedQuery) {
    return summaries;
  }

  return summaries.filter((recipe) =>
    [
      recipe.title,
      recipe.description,
      recipe.cuisine,
      recipe.mealType,
      recipe.sourcePlatform,
      ...recipe.tags,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export async function getRecipeDetailFromStore(id: string) {
  const recipes = await loadRecipes();
  return recipes.find((recipe) => recipe.id === id) ?? null;
}

export async function saveRecipeDraft(draft: RecipeDraft) {
  const recipes = await loadRecipes();
  const existingRecipe = draft.id ? recipes.find((recipe) => recipe.id === draft.id) : undefined;
  const savedRecipe = recipeFromDraft(draft, existingRecipe);
  const nextRecipes = existingRecipe
    ? recipes.map((recipe) => (recipe.id === savedRecipe.id ? savedRecipe : recipe))
    : [savedRecipe, ...recipes];

  await persistRecipes(nextRecipes);
  return savedRecipe;
}

export async function toggleRecipeFavorite(id: string) {
  const recipes = await loadRecipes();
  let updatedRecipe: RecipeDetail | null = null;
  const nextRecipes = recipes.map((recipe) => {
    if (recipe.id !== id) {
      return recipe;
    }

    updatedRecipe = {
      ...recipe,
      isFavorite: !recipe.isFavorite,
      updatedAt: new Date().toISOString(),
    };
    return updatedRecipe;
  });

  await persistRecipes(nextRecipes);
  return updatedRecipe;
}

export async function deleteRecipe(id: string) {
  const recipes = await loadRecipes();
  await persistRecipes(recipes.filter((recipe) => recipe.id !== id));
}
