export type ShoppingItem = {
  category?: string;
  createdAt?: string;
  id: string;
  isChecked: boolean;
  listId?: string;
  name: string;
  quantity?: string;
  recipeId?: string;
  unit?: string;
  updatedAt?: string;
};

export type ShoppingDraft = {
  category?: string;
  listId?: string;
  name: string;
  quantity?: string;
  recipeId?: string;
  unit?: string;
};
