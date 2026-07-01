import type { RecipeIngredient } from '@/features/recipes/recipeTypes';
import type { ShoppingDraft, ShoppingItem } from '@/features/shopping/shoppingTypes';
import {
  addRecipeIngredientsToShopping as addRecipeIngredientsToShoppingStore,
  addShoppingItem as addShoppingItemToStore,
  clearCompletedShoppingItems as clearCompletedShoppingItemsFromStore,
  loadShoppingItems as loadShoppingItemsFromStore,
  removeShoppingItem as removeShoppingItemFromStore,
  replaceShoppingCache,
  toggleShoppingItem as toggleShoppingItemInStore,
  updateShoppingItem as updateShoppingItemInStore,
} from '@/features/shopping/shoppingStore';
import { getSupabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabaseSession';
import { isNetworkUnavailableError, throwIfDatabaseNotReady } from '@/lib/supabaseStatus';
import { normalizeIngredientName } from '@/lib/validators';
import type { Database } from '@/types/database';

type ShoppingItemRow = Database['public']['Tables']['shopping_items']['Row'];
type ShoppingItemInsert = Database['public']['Tables']['shopping_items']['Insert'];
type ShoppingItemUpdate = Database['public']['Tables']['shopping_items']['Update'];
type ShoppingListRow = Database['public']['Tables']['shopping_lists']['Row'];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value?: string) {
  return Boolean(value && uuidPattern.test(value));
}

function nullIfBlank(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapShoppingItem(row: ShoppingItemRow): ShoppingItem {
  return {
    category: row.category ?? undefined,
    createdAt: row.created_at,
    id: row.id,
    isChecked: row.is_checked,
    listId: row.list_id ?? undefined,
    name: row.name,
    quantity: row.quantity ?? undefined,
    recipeId: row.source_recipe_id ?? undefined,
    unit: row.unit ?? undefined,
    updatedAt: row.updated_at,
  };
}

function createShoppingInsert(draft: ShoppingDraft, userId: string, listId: string): ShoppingItemInsert {
  return {
    category: nullIfBlank(draft.category),
    is_checked: false,
    list_id: listId,
    name: draft.name.trim(),
    quantity: nullIfBlank(draft.quantity),
    source_recipe_id: isUuid(draft.recipeId) ? draft.recipeId : null,
    source_type: draft.recipeId ? 'recipe' : 'manual',
    unit: nullIfBlank(draft.unit),
    user_id: userId,
  };
}

function createShoppingUpdate(draft: ShoppingDraft): ShoppingItemUpdate {
  return {
    category: nullIfBlank(draft.category),
    list_id: isUuid(draft.listId) ? draft.listId : undefined,
    name: draft.name.trim(),
    quantity: nullIfBlank(draft.quantity),
    source_recipe_id: isUuid(draft.recipeId) ? draft.recipeId : null,
    source_type: draft.recipeId ? 'recipe' : 'manual',
    unit: nullIfBlank(draft.unit),
  };
}

async function getOrCreateDefaultShoppingList(userId: string): Promise<ShoppingListRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: createdList, error: createError } = await supabase
    .from('shopping_lists')
    .insert({ name: 'My shopping list', user_id: userId, visibility: 'private' })
    .select('*')
    .single();

  if (createError) {
    throwIfDatabaseNotReady(createError);

    if (createError.code === '23505') {
      const { data: existingList, error: retryError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (retryError) {
        throw retryError;
      }

      return existingList;
    }

    throw createError;
  }

  return createdList;
}

async function fetchRemoteShoppingItems(userId: string) {
  const { data, error } = await getSupabase()
    .from('shopping_items')
    .select('*')
    .eq('user_id', userId)
    .order('is_checked', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  return (data ?? []).map(mapShoppingItem);
}

async function refreshRemoteShoppingItems(userId: string) {
  const items = await fetchRemoteShoppingItems(userId);
  return replaceShoppingCache(items);
}

export async function loadShoppingItems(): Promise<ShoppingItem[]> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return loadShoppingItemsFromStore();
  }

  try {
    return await refreshRemoteShoppingItems(user.id);
  } catch (error) {
    throwIfDatabaseNotReady(error);
    if (!isNetworkUnavailableError(error)) {
      console.warn('Unable to load shopping list from Supabase', error);
    }
    return loadShoppingItemsFromStore();
  }
}

export async function listShoppingItems(): Promise<ShoppingItem[]> {
  return loadShoppingItems();
}

export async function addShoppingItem(draft: ShoppingDraft) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return addShoppingItemToStore(draft);
  }

  const normalizedName = normalizeIngredientName(draft.name);

  if (!normalizedName) {
    throw new Error('Shopping item name is required');
  }

  const requestedListId = draft.listId && isUuid(draft.listId) ? draft.listId : null;
  const listId = requestedListId ?? (await getOrCreateDefaultShoppingList(user.id)).id;
  const items = await refreshRemoteShoppingItems(user.id);
  const existingItem = items.find(
    (item) => normalizeIngredientName(item.name) === normalizedName && (item.listId ?? listId) === listId,
  );
  const supabase = getSupabase();
  const { data, error } = existingItem
    ? await supabase
        .from('shopping_items')
        .update({ ...createShoppingUpdate(draft), is_checked: false })
        .eq('id', existingItem.id)
        .eq('user_id', user.id)
        .select('*')
        .single()
    : await supabase.from('shopping_items').insert(createShoppingInsert(draft, user.id, listId)).select('*').single();

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  if (!data) {
    throw new Error('Shopping item could not be saved');
  }

  await refreshRemoteShoppingItems(user.id);
  return mapShoppingItem(data);
}

export async function updateShoppingItem(id: string, draft: ShoppingDraft) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return updateShoppingItemInStore(id, draft);
  }

  const { data, error } = await getSupabase()
    .from('shopping_items')
    .update(createShoppingUpdate(draft))
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  await refreshRemoteShoppingItems(user.id);
  return data ? mapShoppingItem(data) : null;
}

export async function addRecipeIngredientsToShopping(recipeId: string, ingredients: RecipeIngredient[]) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return addRecipeIngredientsToShoppingStore(recipeId, ingredients);
  }

  const listId = (await getOrCreateDefaultShoppingList(user.id)).id;
  const items = await refreshRemoteShoppingItems(user.id);
  const existingNames = new Set(
    items.filter((item) => (item.listId ?? listId) === listId).map((item) => normalizeIngredientName(item.name)),
  );
  const newRows: ShoppingItemInsert[] = ingredients
    .filter((ingredient) => normalizeIngredientName(ingredient.name))
    .filter((ingredient) => !existingNames.has(normalizeIngredientName(ingredient.name)))
    .map((ingredient) => ({
      is_checked: false,
      list_id: listId,
      name: ingredient.name.trim(),
      quantity: nullIfBlank(ingredient.quantity),
      source_recipe_id: isUuid(recipeId) ? recipeId : null,
      source_type: 'recipe',
      unit: nullIfBlank(ingredient.unit),
      user_id: user.id,
    }));

  if (newRows.length === 0) {
    return 0;
  }

  const { error } = await getSupabase().from('shopping_items').insert(newRows);

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  await refreshRemoteShoppingItems(user.id);
  return newRows.length;
}

export async function toggleShoppingItem(id: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    await toggleShoppingItemInStore(id);
    return;
  }

  const items = await refreshRemoteShoppingItems(user.id);
  const item = items.find((shoppingItem) => shoppingItem.id === id);

  if (!item) {
    return;
  }

  const { error } = await getSupabase()
    .from('shopping_items')
    .update({ is_checked: !item.isChecked })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  await refreshRemoteShoppingItems(user.id);
}

export async function removeShoppingItem(id: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    await removeShoppingItemFromStore(id);
    return;
  }

  const { error } = await getSupabase().from('shopping_items').delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  await refreshRemoteShoppingItems(user.id);
}

export async function clearCompletedShoppingItems() {
  const user = await getAuthenticatedUser();

  if (!user) {
    await clearCompletedShoppingItemsFromStore();
    return;
  }

  const { error } = await getSupabase()
    .from('shopping_items')
    .delete()
    .eq('user_id', user.id)
    .eq('is_checked', true);

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  await refreshRemoteShoppingItems(user.id);
}
