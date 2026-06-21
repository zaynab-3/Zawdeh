export type PantryItem = {
  category?: string;
  createdAt?: string;
  id: string;
  isAvailable: boolean;
  isFavorite: boolean;
  name: string;
  quantity?: string;
  unit?: string;
  updatedAt?: string;
};

export type FavoriteIngredient = {
  category?: string;
  createdAt?: string;
  id: string;
  name: string;
};

export type PantryDraft = {
  category?: string;
  isFavorite?: boolean;
  name: string;
  quantity?: string;
  unit?: string;
};
