import { createReviewDraft } from '@/features/imports/importParser';
import type { RecipeImportInput, RecipeImportReview } from '@/features/imports/importTypes';

export async function prepareImportReview(input: RecipeImportInput): Promise<RecipeImportReview> {
  // TODO: Replace this rule-based placeholder with the clean-recipe Edge Function.
  return createReviewDraft(input);
}
