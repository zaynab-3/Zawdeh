import * as React from 'react';

import type { RecipeIngredient } from '@/features/recipes/recipeTypes';
import {
  addRecipeIngredientsToShopping,
  addShoppingItem,
  clearCompletedShoppingItems,
  loadShoppingItems,
  removeShoppingItem,
  subscribeShopping,
  toggleShoppingItem,
} from '@/features/shopping/shoppingStore';
import type { ShoppingDraft, ShoppingItem } from '@/features/shopping/shoppingTypes';

function matchesShoppingItem(item: ShoppingItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [item.name, item.category, item.quantity, item.unit]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

export function useShoppingList() {
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [items, setItems] = React.useState<ShoppingItem[]>([]);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    let isMounted = true;

    loadShoppingItems()
      .then((nextItems) => {
        if (isMounted) {
          setItems(nextItems);
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Shopping list could not be loaded on this device.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const unsubscribe = subscribeShopping((nextItems) => {
      if (isMounted) {
        setItems(nextItems);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const filteredItems = React.useMemo(() => items.filter((item) => matchesShoppingItem(item, query)), [items, query]);
  const openItems = React.useMemo(() => items.filter((item) => !item.isChecked), [items]);
  const completedItems = React.useMemo(() => items.filter((item) => item.isChecked), [items]);

  const addItem = React.useCallback(async (draft: ShoppingDraft) => {
    try {
      setError(null);
      return await addShoppingItem(draft);
    } catch {
      setError('Shopping item could not be added.');
      throw new Error('Shopping add failed');
    }
  }, []);

  const addRecipeIngredients = React.useCallback(async (recipeId: string, ingredients: RecipeIngredient[]) => {
    try {
      setError(null);
      return await addRecipeIngredientsToShopping(recipeId, ingredients);
    } catch {
      setError('Recipe ingredients could not be added to shopping.');
      return 0;
    }
  }, []);

  const toggleItem = React.useCallback(async (id: string) => {
    try {
      setError(null);
      await toggleShoppingItem(id);
    } catch {
      setError('Shopping item could not be updated.');
    }
  }, []);

  const removeItem = React.useCallback(async (id: string) => {
    try {
      setError(null);
      await removeShoppingItem(id);
    } catch {
      setError('Shopping item could not be removed.');
    }
  }, []);

  const clearCompleted = React.useCallback(async () => {
    try {
      setError(null);
      await clearCompletedShoppingItems();
    } catch {
      setError('Completed items could not be cleared.');
    }
  }, []);

  return {
    addItem,
    addRecipeIngredients,
    clearCompleted,
    completedItems,
    error,
    filteredItems,
    isLoading,
    items,
    openItems,
    query,
    removeItem,
    setQuery,
    toggleItem,
  };
}
