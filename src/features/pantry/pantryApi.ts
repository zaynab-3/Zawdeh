import type { FavoriteIngredient, PantryDraft, PantryItem } from '@/features/pantry/pantryTypes';
import {
  addFavoriteIngredient as addFavoriteIngredientToStore,
  addPantryItem as addPantryItemToStore,
  loadPantry,
  quickAddFavoriteIngredientToPantry as quickAddFavoriteIngredientToStore,
  removePantryItem as removePantryItemFromStore,
  replacePantryCache,
  togglePantryItemAvailable as togglePantryItemAvailableInStore,
  togglePantryItemFavorite as togglePantryItemFavoriteInStore,
  updatePantryItem as updatePantryItemInStore,
} from '@/features/pantry/pantryStore';
import { getSupabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabaseSession';
import { throwIfDatabaseNotReady } from '@/lib/supabaseStatus';
import { normalizeIngredientName } from '@/lib/validators';
import type { Database } from '@/types/database';

type PantryItemRow = Database['public']['Tables']['pantry_items']['Row'];
type PantryItemInsert = Database['public']['Tables']['pantry_items']['Insert'];
type PantryItemUpdate = Database['public']['Tables']['pantry_items']['Update'];
type FavoriteIngredientRow = Database['public']['Tables']['favorite_ingredients']['Row'];
type FavoriteIngredientInsert = Database['public']['Tables']['favorite_ingredients']['Insert'];

type PantryState = {
  favorites: FavoriteIngredient[];
  items: PantryItem[];
};

function nullIfBlank(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapPantryItem(row: PantryItemRow): PantryItem {
  return {
    category: row.category ?? undefined,
    createdAt: row.created_at,
    id: row.id,
    isAvailable: row.is_available,
    isFavorite: row.is_favorite,
    name: row.name,
    quantity: row.quantity ?? undefined,
    unit: row.unit ?? undefined,
    updatedAt: row.updated_at,
  };
}

function mapFavoriteIngredient(row: FavoriteIngredientRow): FavoriteIngredient {
  return {
    category: row.category ?? undefined,
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
  };
}

function createPantryInsert(draft: PantryDraft, userId: string): PantryItemInsert {
  return {
    category: nullIfBlank(draft.category),
    is_available: true,
    is_favorite: draft.isFavorite ?? false,
    name: draft.name.trim(),
    quantity: nullIfBlank(draft.quantity),
    unit: nullIfBlank(draft.unit),
    user_id: userId,
  };
}

function createPantryUpdate(draft: PantryDraft): PantryItemUpdate {
  return {
    category: nullIfBlank(draft.category),
    is_favorite: draft.isFavorite,
    name: draft.name.trim(),
    quantity: nullIfBlank(draft.quantity),
    unit: nullIfBlank(draft.unit),
  };
}

function createFavoriteInsert(ingredient: FavoriteIngredient, userId: string): FavoriteIngredientInsert {
  return {
    category: nullIfBlank(ingredient.category),
    name: ingredient.name.trim(),
    user_id: userId,
  };
}

async function fetchRemotePantry(userId: string): Promise<PantryState> {
  const supabase = getSupabase();
  const [
    { data: pantryItems, error: pantryError },
    { data: favorites, error: favoritesError },
  ] = await Promise.all([
    supabase.from('pantry_items').select('*').eq('user_id', userId).order('name'),
    supabase.from('favorite_ingredients').select('*').eq('user_id', userId).order('name'),
  ]);
  const error = pantryError ?? favoritesError;

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  return {
    favorites: (favorites ?? []).map(mapFavoriteIngredient),
    items: (pantryItems ?? []).map(mapPantryItem),
  };
}

async function refreshRemotePantry(userId: string) {
  const state = await fetchRemotePantry(userId);
  return replacePantryCache(state);
}

export async function loadPantryState(): Promise<PantryState> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return loadPantry();
  }

  try {
    return await refreshRemotePantry(user.id);
  } catch (error) {
    throwIfDatabaseNotReady(error);
    console.warn('Unable to load pantry from Supabase', error);
    return loadPantry();
  }
}

export async function listPantryItems(): Promise<PantryItem[]> {
  const pantry = await loadPantryState();
  return pantry.items;
}

export async function listFavoriteIngredients(): Promise<FavoriteIngredient[]> {
  const pantry = await loadPantryState();
  return pantry.favorites;
}

export async function addPantryItem(draft: PantryDraft) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return addPantryItemToStore(draft);
  }

  const normalizedName = normalizeIngredientName(draft.name);

  if (!normalizedName) {
    throw new Error('Pantry item name is required');
  }

  const state = await refreshRemotePantry(user.id);
  const existingItem = state.items.find((item) => normalizeIngredientName(item.name) === normalizedName);
  const supabase = getSupabase();
  const { data, error } = existingItem
    ? await supabase
        .from('pantry_items')
        .update({ ...createPantryUpdate(draft), is_available: true })
        .eq('id', existingItem.id)
        .eq('user_id', user.id)
        .select('*')
        .single()
    : await supabase.from('pantry_items').insert(createPantryInsert(draft, user.id)).select('*').single();

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  if (!data) {
    throw new Error('Pantry item could not be saved');
  }

  await refreshRemotePantry(user.id);
  return mapPantryItem(data);
}

export async function updatePantryItem(id: string, draft: PantryDraft) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return updatePantryItemInStore(id, draft);
  }

  const { data, error } = await getSupabase()
    .from('pantry_items')
    .update(createPantryUpdate(draft))
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  await refreshRemotePantry(user.id);
  return data ? mapPantryItem(data) : null;
}

export async function addFavoriteIngredient(ingredient: FavoriteIngredient) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return addFavoriteIngredientToStore(ingredient);
  }

  const { data, error } = await getSupabase()
    .from('favorite_ingredients')
    .upsert(createFavoriteInsert(ingredient, user.id), { onConflict: 'user_id,name' })
    .select('*')
    .single();

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  await refreshRemotePantry(user.id);
  return data ? mapFavoriteIngredient(data) : ingredient;
}

export async function quickAddFavoriteIngredientToPantry(ingredient: FavoriteIngredient) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return quickAddFavoriteIngredientToStore(ingredient);
  }

  return addPantryItem({
    category: ingredient.category,
    isFavorite: true,
    name: ingredient.name,
  });
}

export async function togglePantryItemAvailable(id: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    await togglePantryItemAvailableInStore(id);
    return;
  }

  const state = await refreshRemotePantry(user.id);
  const item = state.items.find((pantryItem) => pantryItem.id === id);

  if (!item) {
    return;
  }

  const { error } = await getSupabase()
    .from('pantry_items')
    .update({ is_available: !item.isAvailable })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  await refreshRemotePantry(user.id);
}

export async function togglePantryItemFavorite(id: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    await togglePantryItemFavoriteInStore(id);
    return;
  }

  const state = await refreshRemotePantry(user.id);
  const item = state.items.find((pantryItem) => pantryItem.id === id);

  if (!item) {
    return;
  }

  const isFavorite = !item.isFavorite;
  const supabase = getSupabase();
  const { error } = await supabase
    .from('pantry_items')
    .update({ is_favorite: isFavorite })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  const { error: favoriteError } = isFavorite
    ? await supabase.from('favorite_ingredients').upsert(createFavoriteInsert(item, user.id), { onConflict: 'user_id,name' })
    : await supabase.from('favorite_ingredients').delete().eq('user_id', user.id).eq('name', item.name);

  if (favoriteError) {
    throwIfDatabaseNotReady(favoriteError);
    throw favoriteError;
  }

  await refreshRemotePantry(user.id);
}

export async function removePantryItem(id: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    await removePantryItemFromStore(id);
    return;
  }

  const { error } = await getSupabase().from('pantry_items').delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    throwIfDatabaseNotReady(error);
    throw error;
  }

  await refreshRemotePantry(user.id);
}
