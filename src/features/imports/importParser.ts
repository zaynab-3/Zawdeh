import type { RecipeImportInput, RecipeImportReview } from '@/features/imports/importTypes';
import { trimToMax } from '@/lib/validators';

export function createReviewDraft(input: RecipeImportInput): RecipeImportReview {
  const title = trimToMax(input.rawText.split('\n')[0] || 'Imported recipe', 80);

  return {
    confidence: input.rawText.trim() ? 'medium' : 'low',
    description: 'Review before saving.',
    ingredients: [{ id: 'ingredient-1', name: 'Ingredient from import', quantity: '1' }],
    notes: input.sourceUrl ? `Source: ${input.sourceUrl}` : '',
    steps: [{ id: 'step-1', instruction: 'Cleaned instruction placeholder.', position: 1 }],
    tags: [input.sourcePlatform.toLowerCase()],
    title,
  };
}
