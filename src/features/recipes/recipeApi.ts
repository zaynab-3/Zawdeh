import type { RecipeDetail, RecipeSummary } from '@/features/recipes/recipeTypes';

const recipeDetails: RecipeDetail[] = [
  {
    cookability: 'ready_with_substitutions',
    cuisine: 'Lebanese',
    description: 'A pantry-friendly lentil and rice comfort dish with crispy onions.',
    id: 'mjadra',
    ingredients: [
      { id: 'lentils', name: 'Brown lentils', quantity: '1', unit: 'cup' },
      { id: 'rice', name: 'Rice', quantity: '1', unit: 'cup' },
      { id: 'onions', name: 'Onions', quantity: '3', unit: 'large' },
      { id: 'olive-oil', name: 'Olive oil', quantity: '3', unit: 'tbsp' },
    ],
    isFavorite: true,
    mealType: 'Dinner',
    notes: ['Works with bulgur instead of rice.'],
    steps: [
      { id: 'step-1', instruction: 'Cook lentils until just tender.', position: 1, timerMinutes: 18 },
      { id: 'step-2', instruction: 'Add rice and simmer until soft.', position: 2, timerMinutes: 20 },
      { id: 'step-3', instruction: 'Top with crispy onions and olive oil.', position: 3 },
    ],
    tags: ['pantry', 'vegan'],
    title: 'Mjadra',
  },
  {
    cookability: 'needs_shopping',
    cuisine: 'Mediterranean',
    description: 'A clean saved recipe placeholder for imported social captions.',
    id: 'imported-salad',
    ingredients: [
      { id: 'tomatoes', name: 'Tomatoes', quantity: '2', unit: 'cups' },
      { id: 'cucumber', name: 'Cucumber', quantity: '1', unit: 'large' },
    ],
    isFavorite: false,
    mealType: 'Lunch',
    notes: ['Review imported details before saving.'],
    steps: [{ id: 'step-1', instruction: 'Chop and toss everything together.', position: 1 }],
    tags: ['imported', 'fresh'],
    title: 'Imported Salad Draft',
  },
];

export async function listRecipeSummaries(query: string): Promise<RecipeSummary[]> {
  const normalized = query.trim().toLowerCase();
  const summaries = recipeDetails.map(({ ingredients, notes, steps, ...summary }) => summary);

  if (!normalized) {
    return summaries;
  }

  return summaries.filter((recipe) => `${recipe.title} ${recipe.tags.join(' ')}`.toLowerCase().includes(normalized));
}

export async function getRecipeDetail(id: string): Promise<RecipeDetail | null> {
  return recipeDetails.find((recipe) => recipe.id === id) ?? null;
}
