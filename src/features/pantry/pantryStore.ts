import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FavoriteIngredient, PantryDraft, PantryItem } from '@/features/pantry/pantryTypes';
import { normalizeIngredientName } from '@/lib/validators';

const PANTRY_STORAGE_KEY = 'zawdeh.pantry.v1';

type PantryState = {
  favorites: FavoriteIngredient[];
  items: PantryItem[];
};

type PantryListener = (state: PantryState) => void;

let pantryCache: PantryState | null = null;
const listeners = new Set<PantryListener>();

const initialState: PantryState = {
  favorites: [
    { id: 'olive-oil', category: 'Staples', createdAt: '2026-06-21T00:00:00.000Z', name: 'Olive oil' },
    { id: 'garlic', category: 'Produce', createdAt: '2026-06-21T00:00:00.000Z', name: 'Garlic' },
    { id: 'lemon', category: 'Produce', createdAt: '2026-06-21T00:00:00.000Z', name: 'Lemon' },
  ],
  items: [
    {
      category: 'Staples',
      createdAt: '2026-06-21T00:00:00.000Z',
      id: 'olive-oil',
      isAvailable: true,
      isFavorite: true,
      name: 'Olive oil',
      quantity: '1',
      unit: 'bottle',
      updatedAt: '2026-06-21T00:00:00.000Z',
    },
    {
      category: 'Grains',
      createdAt: '2026-06-21T00:00:00.000Z',
      id: 'lentils',
      isAvailable: true,
      isFavorite: false,
      name: 'Brown lentils',
      quantity: '2',
      unit: 'cups',
      updatedAt: '2026-06-21T00:00:00.000Z',
    },
    {
      category: 'Spices',
      createdAt: '2026-06-21T00:00:00.000Z',
      id: 'black-pepper',
      isAvailable: false,
      isFavorite: true,
      name: 'Black pepper',
      updatedAt: '2026-06-21T00:00:00.000Z',
    },
  ],
};

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function notifyPantry(nextState: PantryState) {
  listeners.forEach((listener) => listener(nextState));
}

function sortPantryItems(items: PantryItem[]) {
  return [...items].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

function normalizeFavorite(favorite: FavoriteIngredient): FavoriteIngredient {
  return {
    category: favorite.category?.trim() || undefined,
    createdAt: favorite.createdAt ?? new Date().toISOString(),
    id: favorite.id || normalizeIngredientName(favorite.name) || generateId('favorite'),
    name: favorite.name.trim(),
  };
}

function uniqueFavorites(favorites: FavoriteIngredient[]) {
  const byName = new Map<string, FavoriteIngredient>();

  favorites.forEach((favorite) => {
    const normalizedName = normalizeIngredientName(favorite.name);

    if (normalizedName) {
      byName.set(normalizedName, normalizeFavorite(favorite));
    }
  });

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function persistPantry(nextState: PantryState) {
  const state = {
    favorites: uniqueFavorites(nextState.favorites),
    items: sortPantryItems(nextState.items),
  };
  pantryCache = state;

  try {
    await AsyncStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to save pantry locally', error);
  }

  notifyPantry(state);
  return state;
}

export function subscribePantry(listener: PantryListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export async function loadPantry() {
  if (pantryCache) {
    return pantryCache;
  }

  try {
    const rawValue = await AsyncStorage.getItem(PANTRY_STORAGE_KEY);
    const parsed = rawValue ? (JSON.parse(rawValue) as PantryState) : null;

    if (parsed?.items && parsed?.favorites && Array.isArray(parsed.items) && Array.isArray(parsed.favorites)) {
      pantryCache = {
        favorites: uniqueFavorites(parsed.favorites),
        items: sortPantryItems(parsed.items),
      };
      return pantryCache;
    }
  } catch (error) {
    console.warn('Unable to load pantry locally', error);
  }

  pantryCache = initialState;
  return pantryCache;
}

export async function addPantryItem(draft: PantryDraft) {
  const state = await loadPantry();
  const normalizedName = normalizeIngredientName(draft.name);

  if (!normalizedName) {
    throw new Error('Pantry item name is required');
  }

  const now = new Date().toISOString();
  const existingItem = state.items.find((item) => normalizeIngredientName(item.name) === normalizedName);
  const nextItem: PantryItem = {
    category: draft.category?.trim() || existingItem?.category,
    createdAt: existingItem?.createdAt ?? now,
    id: existingItem?.id ?? normalizedName,
    isAvailable: true,
    isFavorite: draft.isFavorite ?? existingItem?.isFavorite ?? false,
    name: draft.name.trim(),
    quantity: draft.quantity?.trim() || existingItem?.quantity,
    unit: draft.unit?.trim() || existingItem?.unit,
    updatedAt: now,
  };
  const favorites = nextItem.isFavorite
    ? [...state.favorites, { category: nextItem.category, id: nextItem.id, name: nextItem.name }]
    : state.favorites;
  const items = existingItem
    ? state.items.map((item) => (item.id === existingItem.id ? nextItem : item))
    : [nextItem, ...state.items];

  await persistPantry({ favorites, items });
  return nextItem;
}

export async function addFavoriteIngredient(ingredient: FavoriteIngredient) {
  const state = await loadPantry();
  const nextFavorite = normalizeFavorite(ingredient);
  await persistPantry({ ...state, favorites: [...state.favorites, nextFavorite] });
  return nextFavorite;
}

export async function quickAddFavoriteIngredientToPantry(ingredient: FavoriteIngredient) {
  return addPantryItem({
    category: ingredient.category,
    isFavorite: true,
    name: ingredient.name,
  });
}

export async function togglePantryItemAvailable(id: string) {
  const state = await loadPantry();
  const nextItems = state.items.map((item) =>
    item.id === id ? { ...item, isAvailable: !item.isAvailable, updatedAt: new Date().toISOString() } : item,
  );
  await persistPantry({ ...state, items: nextItems });
}

export async function togglePantryItemFavorite(id: string) {
  const state = await loadPantry();
  let nextFavorites = state.favorites;
  const nextItems = state.items.map((item) => {
    if (item.id !== id) {
      return item;
    }

    const nextItem = { ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() };
    nextFavorites = nextItem.isFavorite
      ? [...state.favorites, { category: item.category, id: item.id, name: item.name }]
      : state.favorites.filter((favorite) => normalizeIngredientName(favorite.name) !== normalizeIngredientName(item.name));
    return nextItem;
  });

  await persistPantry({ favorites: nextFavorites, items: nextItems });
}

export async function removePantryItem(id: string) {
  const state = await loadPantry();
  await persistPantry({ ...state, items: state.items.filter((item) => item.id !== id) });
}
