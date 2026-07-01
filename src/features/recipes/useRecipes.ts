import * as React from 'react';

import { useAuth } from '@/features/auth/useAuth';
import { useI18n } from '@/features/preferences/i18n';
import {
  deleteRecipe,
  listRecipeDetails,
  saveRecipe as saveRecipeToApi,
  toggleFavoriteRecipe,
  type RecipeListScope,
} from '@/features/recipes/recipeApi';
import { subscribeRecipes } from '@/features/recipes/recipeStore';
import { getRecipeForDisplay, recipeNeedsDisplayTranslation } from '@/features/recipes/recipeTranslation';
import type { RecipeDetail, RecipeDraft } from '@/features/recipes/recipeTypes';
import { getSafeDataErrorMessage } from '@/lib/supabaseStatus';

function matchesRecipe(recipe: RecipeDetail, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    recipe.title,
    recipe.description,
    recipe.cuisine,
    recipe.mealType,
    recipe.sourcePlatform,
    ...recipe.tags,
    ...recipe.ingredients.map((ingredient) => ingredient.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

type UseRecipesOptions = {
  scope?: RecipeListScope;
  translate?: boolean;
};

function getRecipeListSignature(recipes: RecipeDetail[]) {
  return recipes.map((recipe) => `${recipe.id}:${recipe.updatedAt ?? recipe.createdAt ?? ''}`).join('|');
}

export function useRecipes(options: UseRecipesOptions = {}) {
  const { user } = useAuth();
  const { language } = useI18n();
  const scope = options.scope ?? 'all';
  const userId = user?.id ?? null;
  const shouldTranslate = options.translate ?? true;
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [displayRecipes, setDisplayRecipes] = React.useState<RecipeDetail[]>([]);
  const [recipes, setRecipes] = React.useState<RecipeDetail[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function loadScopedRecipes() {
      await Promise.resolve();

      if (!isMounted) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setRecipes([]);
      setDisplayRecipes([]);

      try {
        const nextRecipes = await listRecipeDetails(scope);

        if (isMounted) {
          setRecipes(nextRecipes);
          setDisplayRecipes(nextRecipes);
          setError(null);
        }
      } catch (loadError: unknown) {
        if (isMounted) {
          setError(getSafeDataErrorMessage(loadError, 'Saved recipes could not be loaded.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadScopedRecipes();

    if (!userId) {
      unsubscribe = subscribeRecipes((nextRecipes) => {
        if (isMounted) {
          setRecipes(nextRecipes);
          setDisplayRecipes(nextRecipes);
        }
      });
    }

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [scope, userId]);

  const recipeListSignature = React.useMemo(() => getRecipeListSignature(recipes), [recipes]);

  React.useEffect(() => {
    let isMounted = true;

    async function translateRecipesForDisplay() {
      await Promise.resolve();

      if (!isMounted) {
        return;
      }

      setDisplayRecipes(recipes);

      if (!shouldTranslate || !recipes.some((recipe) => recipeNeedsDisplayTranslation(recipe, language))) {
        setIsTranslating(false);
        return;
      }

      setIsTranslating(true);

      let nextRecipes = recipes;

      for (const recipe of recipes) {
        try {
          const translatedRecipe = await getRecipeForDisplay(recipe, language);

          if (!isMounted) {
            return;
          }

          if (translatedRecipe !== recipe) {
            nextRecipes = nextRecipes.map((item) => (item.id === recipe.id ? translatedRecipe : item));
            setDisplayRecipes(nextRecipes);
          }
        } catch {
          // Translation is optional. If the Edge Function fails, keep showing the original recipe.
        }
      }

      if (isMounted) {
        setIsTranslating(false);
      }
    }

    void translateRecipesForDisplay();

    return () => {
      isMounted = false;
    };
  }, [language, recipeListSignature, recipes, shouldTranslate]);

  const filteredRecipes = React.useMemo(
    () => displayRecipes.filter((recipe) => matchesRecipe(recipe, query)),
    [displayRecipes, query],
  );
  const favoriteRecipes = React.useMemo(() => displayRecipes.filter((recipe) => recipe.isFavorite), [displayRecipes]);
  const recentRecipes = React.useMemo(() => displayRecipes.slice(0, 5), [displayRecipes]);

  const saveRecipe = React.useCallback(async (draft: RecipeDraft) => {
    try {
      setError(null);
      return await saveRecipeToApi(draft);
    } catch (saveError) {
      const message = getSafeDataErrorMessage(saveError, 'Recipe could not be saved.');
      setError(message);
      throw new Error(message);
    }
  }, []);

  const toggleFavorite = React.useCallback(async (id: string) => {
    try {
      setError(null);
      return await toggleFavoriteRecipe(id);
    } catch (favoriteError) {
      setError(getSafeDataErrorMessage(favoriteError, 'Favorite status could not be updated.'));
      return null;
    }
  }, []);

  const removeRecipe = React.useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteRecipe(id);
    } catch (removeError) {
      const message = getSafeDataErrorMessage(removeError, 'Recipe could not be deleted.');
      setError(message);
      throw new Error(message);
    }
  }, []);

  return {
    error,
    favoriteRecipes,
    filteredRecipes,
    isLoading,
    isTranslating,
    query,
    recentRecipes,
    recipes: displayRecipes,
    removeRecipe,
    saveRecipe,
    setQuery,
    toggleFavorite,
  };
}

export function useRecipe(id?: string, options?: UseRecipesOptions) {
  const recipeState = useRecipes(options);
  const recipe = React.useMemo(
    () => recipeState.recipes.find((item) => item.id === id) ?? null,
    [id, recipeState.recipes],
  );

  return {
    ...recipeState,
    recipe,
  };
}
