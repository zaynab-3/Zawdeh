export type CookabilityState = 'ready_as_is' | 'ready_with_substitutions' | 'needs_shopping';

export type RecipeIngredient = {
  id: string;
  isOptional?: boolean;
  name: string;
  note?: string;
  quantity?: string;
  unit?: string;
};

export type RecipeStep = {
  id: string;
  instruction: string;
  position: number;
  timerMinutes?: number;
};

export type RecipeSummary = {
  cookability: CookabilityState;
  cuisine: string;
  description: string;
  id: string;
  isFavorite: boolean;
  mealType: string;
  tags: string[];
  title: string;
};

export type RecipeDetail = RecipeSummary & {
  ingredients: RecipeIngredient[];
  notes: string[];
  steps: RecipeStep[];
};

export type RecipeDraft = {
  description: string;
  ingredients: RecipeIngredient[];
  notes: string;
  steps: RecipeStep[];
  tags: string[];
  title: string;
};
