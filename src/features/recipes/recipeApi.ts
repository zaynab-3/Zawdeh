import {
  getRecipeDetailFromStore,
  listRecipeSummariesFromStore,
  saveRecipeDraft,
  toggleRecipeFavorite,
} from '@/features/recipes/recipeStore';
import type { RecipeDetail, RecipeDraft, RecipeSummary } from '@/features/recipes/recipeTypes';

export async function listRecipeSummaries(query: string): Promise<RecipeSummary[]> {
  return listRecipeSummariesFromStore(query);
}

export async function getRecipeDetail(id: string): Promise<RecipeDetail | null> {
  return getRecipeDetailFromStore(id);
}

export async function saveRecipe(recipe: RecipeDraft): Promise<RecipeDetail> {
  return saveRecipeDraft(recipe);
}

export async function toggleFavoriteRecipe(id: string): Promise<RecipeDetail | null> {
  return toggleRecipeFavorite(id);
}
