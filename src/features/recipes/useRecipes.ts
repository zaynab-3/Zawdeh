import * as React from 'react';

import {
  deleteRecipe,
  loadRecipes,
  saveRecipeDraft,
  subscribeRecipes,
  toggleRecipeFavorite,
} from '@/features/recipes/recipeStore';
import type { RecipeDetail, RecipeDraft } from '@/features/recipes/recipeTypes';

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

    loadRecipes()
      .then((nextRecipes) => {
        if (isMounted) {
          setRecipes(nextRecipes);
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Saved recipes could not be loaded on this device.');
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
      return await saveRecipeDraft(draft);
    } catch {
      setError('Recipe could not be saved on this device.');
      throw new Error('Recipe save failed');
    }
  }, []);

  const toggleFavorite = React.useCallback(async (id: string) => {
    try {
      setError(null);
      return await toggleRecipeFavorite(id);
    } catch {
      setError('Favorite status could not be updated.');
      return null;
    }
  }, []);

  const removeRecipe = React.useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteRecipe(id);
    } catch {
      setError('Recipe could not be removed.');
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
