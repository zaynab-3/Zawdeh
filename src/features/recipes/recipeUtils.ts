import type { CookabilityState } from '@/features/recipes/recipeTypes';

const labels: Record<CookabilityState, string> = {
  needs_shopping: 'Needs shopping',
  ready_as_is: 'Ready as-is',
  ready_with_substitutions: 'Ready with substitutions',
};

export function getCookabilityLabel(state: CookabilityState) {
  return labels[state];
}

export function parseRecipeLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export function formatRecipeTime(minutes?: number) {
  if (!minutes) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}
