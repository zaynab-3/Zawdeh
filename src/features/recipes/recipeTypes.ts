import type { Visibility } from '@/types/database';

export type CookabilityState = 'ready_as_is' | 'ready_with_substitutions' | 'needs_shopping';

export type RecipeIngredient = {
  id: string;
  isOptional?: boolean;
  name: string;
  note?: string;
  quantity?: string;
  section?: string;
  unit?: string;
};

export type RecipeStep = {
  id: string;
  instruction: string;
  position: number;
  section?: string;
  timerMinutes?: number;
};

export type RecipeSummary = {
  cookability: CookabilityState;
  cookTimeMinutes?: number;
  cuisine: string;
  createdAt?: string;
  description: string;
  id: string;
  isFavorite: boolean;
  mealType: string;
  prepTimeMinutes?: number;
  originalLanguage?: string;
  savedLanguage?: string;
  servings?: string;
  sourcePlatform?: string;
  sourceType?: string;
  sourceUrl?: string;
  tags: string[];
  title: string;
  updatedAt?: string;
  visibility: Visibility;
};

export type RecipeDetail = RecipeSummary & {
  ingredients: RecipeIngredient[];
  notes: string[];
  steps: RecipeStep[];
};

export type RecipeDraft = {
  cookTimeMinutes?: number;
  cookability?: CookabilityState;
  cuisine?: string;
  description: string;
  id?: string;
  ingredients: RecipeIngredient[];
  isFavorite?: boolean;
  mealType?: string;
  notes: string;
  originalLanguage?: string;
  prepTimeMinutes?: number;
  savedLanguage?: string;
  servings?: string;
  sourcePlatform?: string;
  sourceType?: string;
  sourceUrl?: string;
  steps: RecipeStep[];
  tags: string[];
  title: string;
  visibility?: Visibility;
};
