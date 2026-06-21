export const appName = 'Zawdeh';

export const mealSlots = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'] as const;

export const sourcePlatforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Website', 'Other'] as const;

export const substitutionRules = {
  butter: {
    canSkip: false,
    impact: 'Texture may be softer and flavor will be lighter.',
    substitutes: ['olive oil', 'neutral oil'],
  },
  'black pepper': {
    canSkip: true,
    impact: 'The recipe will still work with a little less warmth.',
    substitutes: [],
  },
  cheese: {
    canSkip: true,
    impact: 'If cheese is central, the dish becomes a simpler version without it.',
    substitutes: [],
  },
} as const;
