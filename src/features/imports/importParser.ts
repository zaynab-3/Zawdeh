import type { RecipeImportInput, RecipeImportReview } from '@/features/imports/importTypes';
import { trimToMax } from '@/lib/validators';

export function createReviewDraft(input: RecipeImportInput): RecipeImportReview {
  const lines = input.rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const title = trimToMax(lines[0] || 'Imported recipe', 80);

  return {
    confidence: 'low',
    description: 'Imported from pasted text. Review before saving.',
    importMode: 'manual',
    ingredients: [],
    notes: lines.slice(1).join('\n'),
    sourcePlatform: input.sourcePlatform,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    steps: [],
    tags: [input.sourcePlatform.toLowerCase()],
    title,
  };
}
