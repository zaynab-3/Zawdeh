import * as React from 'react';

import {
  addFavoriteIngredient,
  addPantryItem,
  loadPantry,
  quickAddFavoriteIngredientToPantry,
  removePantryItem,
  subscribePantry,
  togglePantryItemAvailable,
  togglePantryItemFavorite,
} from '@/features/pantry/pantryStore';
import type { FavoriteIngredient, PantryDraft, PantryItem } from '@/features/pantry/pantryTypes';

function matchesPantryItem(item: PantryItem, query: string) {
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

export function usePantry() {
  const [error, setError] = React.useState<string | null>(null);
  const [favorites, setFavorites] = React.useState<FavoriteIngredient[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [items, setItems] = React.useState<PantryItem[]>([]);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    let isMounted = true;

    loadPantry()
      .then((state) => {
        if (isMounted) {
          setFavorites(state.favorites);
          setItems(state.items);
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Pantry could not be loaded on this device.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const unsubscribe = subscribePantry((state) => {
      if (isMounted) {
        setFavorites(state.favorites);
        setItems(state.items);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const filteredItems = React.useMemo(() => items.filter((item) => matchesPantryItem(item, query)), [items, query]);
  const missingItems = React.useMemo(() => items.filter((item) => !item.isAvailable), [items]);
  const availableItems = React.useMemo(() => items.filter((item) => item.isAvailable), [items]);

  const addItem = React.useCallback(async (draft: PantryDraft) => {
    try {
      setError(null);
      return await addPantryItem(draft);
    } catch {
      setError('Ingredient could not be added.');
      throw new Error('Pantry add failed');
    }
  }, []);

  const addFavorite = React.useCallback(async (ingredient: FavoriteIngredient) => {
    try {
      setError(null);
      return await addFavoriteIngredient(ingredient);
    } catch {
      setError('Favorite ingredient could not be saved.');
      throw new Error('Favorite ingredient save failed');
    }
  }, []);

  const quickAddFavorite = React.useCallback(async (ingredient: FavoriteIngredient) => {
    try {
      setError(null);
      return await quickAddFavoriteIngredientToPantry(ingredient);
    } catch {
      setError('Favorite ingredient could not be added to pantry.');
      throw new Error('Favorite pantry add failed');
    }
  }, []);

  const toggleAvailable = React.useCallback(async (id: string) => {
    try {
      setError(null);
      await togglePantryItemAvailable(id);
    } catch {
      setError('Pantry item could not be updated.');
    }
  }, []);

  const toggleFavorite = React.useCallback(async (id: string) => {
    try {
      setError(null);
      await togglePantryItemFavorite(id);
    } catch {
      setError('Favorite status could not be updated.');
    }
  }, []);

  const removeItem = React.useCallback(async (id: string) => {
    try {
      setError(null);
      await removePantryItem(id);
    } catch {
      setError('Pantry item could not be removed.');
    }
  }, []);

  return {
    addFavorite,
    addItem,
    availableItems,
    error,
    favorites,
    filteredItems,
    isLoading,
    items,
    missingItems,
    query,
    quickAddFavorite,
    removeItem,
    setQuery,
    toggleAvailable,
    toggleFavorite,
  };
}
