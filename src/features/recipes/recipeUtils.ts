import type { CookabilityState } from '@/features/recipes/recipeTypes';

const labels: Record<CookabilityState, string> = {
  needs_shopping: 'Needs shopping',
  ready_as_is: 'Ready as-is',
  ready_with_substitutions: 'Ready with substitutions',
};

export function getCookabilityLabel(state: CookabilityState) {
  return labels[state];
}
