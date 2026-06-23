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

export function groupRecipeItemsBySection<T extends { section?: string }>(items: T[]) {
  const hasSections = items.some((item) => item.section?.trim());

  if (!hasSections) {
    return [{ items, title: undefined }];
  }

  return items.reduce<{ items: T[]; title: string }[]>((groups, item) => {
    const title = item.section?.trim() || 'Main';
    const currentGroup = groups[groups.length - 1];

    if (currentGroup?.title === title) {
      currentGroup.items.push(item);
    } else {
      groups.push({ items: [item], title });
    }

    return groups;
  }, []);
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
