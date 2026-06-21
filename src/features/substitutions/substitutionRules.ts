import type { SubstitutionSuggestion } from '@/features/substitutions/substitutionTypes';

const rules: Record<string, SubstitutionSuggestion> = {
  butter: {
    canSkip: false,
    impact: 'Oil can work in many cooked recipes, but baked texture may change.',
    substitutes: ['olive oil', 'neutral oil'],
  },
  'black pepper': {
    canSkip: true,
    impact: 'You can skip this. The recipe will be a little less warm.',
    substitutes: [],
  },
  cheese: {
    canSkip: true,
    impact: 'If this is a cheeseburger, it becomes a burger without cheese.',
    substitutes: [],
  },
};

export function suggestLocalSubstitution(ingredient: string): SubstitutionSuggestion {
  return (
    rules[ingredient.trim().toLowerCase()] ?? {
      canSkip: false,
      impact: 'Add it to the shopping list or continue with a changed result.',
      substitutes: [],
      warning: 'No reliable local substitution yet.',
    }
  );
}
