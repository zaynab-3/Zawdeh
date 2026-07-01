import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecipeIngredient } from '@/features/recipes/recipeTypes';
import type { ShoppingDraft, ShoppingItem } from '@/features/shopping/shoppingTypes';
import { normalizeIngredientName } from '@/lib/validators';

const SHOPPING_STORAGE_KEY = 'zawdeh.shopping.v1';

type ShoppingState = {
  items: ShoppingItem[];
};

type ShoppingListener = (items: ShoppingItem[]) => void;

let shoppingCache: ShoppingItem[] | null = null;
const listeners = new Set<ShoppingListener>();

const initialItems: ShoppingItem[] = [
  {
    category: 'Produce',
    createdAt: '2026-06-21T00:00:00.000Z',
    id: 'onions',
    isChecked: false,
    name: 'Onions',
    quantity: '3',
    unit: 'large',
    updatedAt: '2026-06-21T00:00:00.000Z',
  },
  {
    category: 'Dairy',
    createdAt: '2026-06-21T00:00:00.000Z',
    id: 'cheese',
    isChecked: true,
    name: 'Cheese',
    quantity: 'optional',
    updatedAt: '2026-06-21T00:00:00.000Z',
  },
];

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function notifyShopping(nextItems: ShoppingItem[]) {
  listeners.forEach((listener) => listener(nextItems));
}

function sortShoppingItems(items: ShoppingItem[]) {
  return [...items].sort((a, b) => {
    if (a.isChecked !== b.isChecked) {
      return a.isChecked ? 1 : -1;
    }

    return a.name.localeCompare(b.name);
  });
}

async function persistShoppingItems(nextItems: ShoppingItem[]) {
  const items = sortShoppingItems(nextItems);
  shoppingCache = items;

  try {
    await AsyncStorage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify({ items }));
  } catch (error) {
    console.warn('Unable to save shopping list locally', error);
  }

  notifyShopping(items);
  return items;
}

export function subscribeShopping(listener: ShoppingListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export async function loadShoppingItems() {
  if (shoppingCache) {
    return shoppingCache;
  }

  try {
    const rawValue = await AsyncStorage.getItem(SHOPPING_STORAGE_KEY);
    const parsed = rawValue ? (JSON.parse(rawValue) as ShoppingState) : null;

    if (parsed?.items && Array.isArray(parsed.items)) {
      shoppingCache = sortShoppingItems(parsed.items);
      return shoppingCache;
    }
  } catch (error) {
    console.warn('Unable to load shopping list locally', error);
  }

  shoppingCache = sortShoppingItems(initialItems);
  return shoppingCache;
}

export async function addShoppingItem(draft: ShoppingDraft) {
  const items = await loadShoppingItems();
  const normalizedName = normalizeIngredientName(draft.name);

  if (!normalizedName) {
    throw new Error('Shopping item name is required');
  }

  const now = new Date().toISOString();
  const existingItem = items.find((item) => normalizeIngredientName(item.name) === normalizedName);
  const nextItem: ShoppingItem = {
    category: draft.category?.trim() || existingItem?.category,
    createdAt: existingItem?.createdAt ?? now,
    id: existingItem?.id ?? normalizedName,
    isChecked: false,
    listId: draft.listId ?? existingItem?.listId,
    name: draft.name.trim(),
    quantity: draft.quantity?.trim() || existingItem?.quantity,
    recipeId: draft.recipeId ?? existingItem?.recipeId,
    unit: draft.unit?.trim() || existingItem?.unit,
    updatedAt: now,
  };
  const nextItems = existingItem
    ? items.map((item) => (item.id === existingItem.id ? nextItem : item))
    : [nextItem, ...items];

  await persistShoppingItems(nextItems);
  return nextItem;
}

export async function addRecipeIngredientsToShopping(recipeId: string, ingredients: RecipeIngredient[]) {
  const items = await loadShoppingItems();
  const now = new Date().toISOString();
  const existingNames = new Set(items.map((item) => normalizeIngredientName(item.name)));
  const newItems = ingredients
    .filter((ingredient) => normalizeIngredientName(ingredient.name))
    .filter((ingredient) => !existingNames.has(normalizeIngredientName(ingredient.name)))
    .map<ShoppingItem>((ingredient) => ({
      createdAt: now,
      id: normalizeIngredientName(ingredient.name) || generateId('shopping'),
      isChecked: false,
      listId: undefined,
      name: ingredient.name.trim(),
      quantity: ingredient.quantity?.trim(),
      recipeId,
      unit: ingredient.unit?.trim(),
      updatedAt: now,
    }));

  if (newItems.length === 0) {
    return 0;
  }

  await persistShoppingItems([...newItems, ...items]);
  return newItems.length;
}

export async function toggleShoppingItem(id: string) {
  const items = await loadShoppingItems();
  const nextItems = items.map((item) =>
    item.id === id ? { ...item, isChecked: !item.isChecked, updatedAt: new Date().toISOString() } : item,
  );
  await persistShoppingItems(nextItems);
}

export async function updateShoppingItem(id: string, draft: ShoppingDraft) {
  const items = await loadShoppingItems();
  const existingItem = items.find((item) => item.id === id);

  if (!existingItem) {
    throw new Error('Shopping item was not found');
  }

  const nextItem: ShoppingItem = {
    ...existingItem,
    category: draft.category?.trim() || existingItem.category,
    listId: draft.listId ?? existingItem.listId,
    name: draft.name.trim() || existingItem.name,
    quantity: draft.quantity?.trim() || existingItem.quantity,
    recipeId: draft.recipeId ?? existingItem.recipeId,
    unit: draft.unit?.trim() || existingItem.unit,
    updatedAt: new Date().toISOString(),
  };

  await persistShoppingItems(items.map((item) => (item.id === id ? nextItem : item)));
  return nextItem;
}

export async function removeShoppingItem(id: string) {
  const items = await loadShoppingItems();
  await persistShoppingItems(items.filter((item) => item.id !== id));
}

export async function clearCompletedShoppingItems() {
  const items = await loadShoppingItems();
  await persistShoppingItems(items.filter((item) => !item.isChecked));
}

export function replaceShoppingCache(nextItems: ShoppingItem[]) {
  const items = sortShoppingItems(nextItems);
  shoppingCache = items;
  notifyShopping(items);
  return items;
}
