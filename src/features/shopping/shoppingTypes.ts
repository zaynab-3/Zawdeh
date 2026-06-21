export type ShoppingItem = {
  category?: string;
  createdAt?: string;
  id: string;
  isChecked: boolean;
  name: string;
  quantity?: string;
  recipeId?: string;
  unit?: string;
  updatedAt?: string;
};

export type ShoppingDraft = {
  category?: string;
  name: string;
  quantity?: string;
  recipeId?: string;
  unit?: string;
};
