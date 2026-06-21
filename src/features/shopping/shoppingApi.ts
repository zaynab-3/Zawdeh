import type { ShoppingItem } from '@/features/shopping/shoppingTypes';
import { loadShoppingItems } from '@/features/shopping/shoppingStore';

export async function listShoppingItems(): Promise<ShoppingItem[]> {
  return loadShoppingItems();
}
