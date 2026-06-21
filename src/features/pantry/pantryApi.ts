import type { FavoriteIngredient, PantryItem } from '@/features/pantry/pantryTypes';

export async function listPantryItems(): Promise<PantryItem[]> {
  return [
    { id: 'olive-oil', isAvailable: true, isFavorite: true, name: 'Olive oil', quantity: '1 bottle' },
    { id: 'lentils', isAvailable: true, isFavorite: false, name: 'Brown lentils', quantity: '2 cups' },
    { id: 'black-pepper', isAvailable: false, isFavorite: true, name: 'Black pepper' },
  ];
}

export async function listFavoriteIngredients(): Promise<FavoriteIngredient[]> {
  return [
    { id: 'olive-oil', name: 'Olive oil' },
    { id: 'garlic', name: 'Garlic' },
    { id: 'lemon', name: 'Lemon' },
  ];
}
