import type { CookModeSession } from '@/features/cook-mode/cookModeTypes';

export function createCookModeSession(recipeId: string): CookModeSession {
  return {
    currentStep: 1,
    id: `local-${recipeId}`,
    missingIngredients: [],
    note: '',
  };
}
