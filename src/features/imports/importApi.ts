import { cleanRecipeWithAi } from '@/features/imports/cleanRecipe';
import { createReviewDraft } from '@/features/imports/importParser';
import { setPendingImportReview } from '@/features/imports/importStore';
import type { RecipeImportInput, RecipeImportReview } from '@/features/imports/importTypes';

export async function prepareImportReview(input: RecipeImportInput, message?: string): Promise<RecipeImportReview> {
  const review = createReviewDraft(input);
  setPendingImportReview(review, message);
  return review;
}

export async function prepareAiImportReview(input: RecipeImportInput): Promise<RecipeImportReview> {
  const review = await cleanRecipeWithAi(input);
  setPendingImportReview(review);
  return review;
}
