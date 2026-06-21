import type { mealSlots } from '@/lib/constants';

export type PlannerRange = 'Today' | 'Tomorrow' | 'This Week';

export type MealPlanSlot = {
  id: string;
  label: (typeof mealSlots)[number];
  recipeTitle?: string;
};
