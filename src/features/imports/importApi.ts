import { createReviewDraft } from '@/features/imports/importParser';
import { setPendingImportReview } from '@/features/imports/importStore';
import type { RecipeImportInput, RecipeImportReview } from '@/features/imports/importTypes';

export async function prepareImportReview(input: RecipeImportInput): Promise<RecipeImportReview> {
  const review = createReviewDraft(input);
  setPendingImportReview(review);
  return review;
}
