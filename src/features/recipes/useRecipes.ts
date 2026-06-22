import * as React from 'react';

import { deleteRecipe, listRecipeDetails, saveRecipe as saveRecipeToApi, toggleFavoriteRecipe } from '@/features/recipes/recipeApi';
import { subscribeRecipes } from '@/features/recipes/recipeStore';
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

export function useRecipes() {
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const [recipes, setRecipes] = React.useState<RecipeDetail[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    listRecipeDetails()
      .then((nextRecipes) => {
        if (isMounted) {
          setRecipes(nextRecipes);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(getSafeDataErrorMessage(loadError, 'Saved recipes could not be loaded.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const unsubscribe = subscribeRecipes((nextRecipes) => {
      if (isMounted) {
        setRecipes(nextRecipes);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const filteredRecipes = React.useMemo(
    () => recipes.filter((recipe) => matchesRecipe(recipe, query)),
    [query, recipes],
  );
  const favoriteRecipes = React.useMemo(() => recipes.filter((recipe) => recipe.isFavorite), [recipes]);
  const recentRecipes = React.useMemo(() => recipes.slice(0, 5), [recipes]);

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
      setError(getSafeDataErrorMessage(removeError, 'Recipe could not be removed.'));
    }
  }, []);

  return {
    error,
    favoriteRecipes,
    filteredRecipes,
    isLoading,
    query,
    recentRecipes,
    recipes,
    removeRecipe,
    saveRecipe,
    setQuery,
    toggleFavorite,
  };
}

export function useRecipe(id?: string) {
  const recipeState = useRecipes();
  const recipe = React.useMemo(
    () => recipeState.recipes.find((item) => item.id === id) ?? null,
    [id, recipeState.recipes],
  );

  return {
    ...recipeState,
    recipe,
  };
}
