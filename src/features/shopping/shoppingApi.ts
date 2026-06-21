import type { ShoppingItem } from '@/features/shopping/shoppingTypes';

export async function listShoppingItems(): Promise<ShoppingItem[]> {
  return [
    { id: 'onions', isChecked: false, name: 'Onions', quantity: '3 large' },
    { id: 'cheese', isChecked: true, name: 'Cheese', quantity: 'optional' },
  ];
}
