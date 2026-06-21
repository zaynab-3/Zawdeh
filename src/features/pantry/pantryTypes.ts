export type PantryItem = {
  id: string;
  isAvailable: boolean;
  isFavorite: boolean;
  name: string;
  quantity?: string;
};

export type FavoriteIngredient = {
  category?: string;
  id: string;
  name: string;
};
