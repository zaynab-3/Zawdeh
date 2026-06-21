import type { FavoriteIngredient, PantryItem } from '@/features/pantry/pantryTypes';
import { loadPantry } from '@/features/pantry/pantryStore';

export async function listPantryItems(): Promise<PantryItem[]> {
  const pantry = await loadPantry();
  return pantry.items;
}

export async function listFavoriteIngredients(): Promise<FavoriteIngredient[]> {
  const pantry = await loadPantry();
  return pantry.favorites;
}
