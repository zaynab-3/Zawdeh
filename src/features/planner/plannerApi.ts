import { mealSlots } from '@/lib/constants';
import type { MealPlanSlot, PlannerRange } from '@/features/planner/plannerTypes';

export async function listMealPlanSlots(_range: PlannerRange): Promise<MealPlanSlot[]> {
  return mealSlots.map((slot) => ({
    id: slot.toLowerCase(),
    label: slot,
    recipeTitle: slot === 'Dinner' ? 'Mjadra' : undefined,
  }));
}
