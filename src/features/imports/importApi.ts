import {
  cleanRecipeScreenshotsWithAi,
  cleanRecipeWithAi,
  type CleanRecipeImagePayload,
} from '@/features/imports/cleanRecipe';
import { createReviewDraft } from '@/features/imports/importParser';
import {
  clearPendingImportResultCandidates,
  setPendingImportResultCandidates,
  setPendingImportReview,
} from '@/features/imports/importStore';
import type { RecipeImportInput, RecipeImportReview } from '@/features/imports/importTypes';

export async function prepareImportReview(input: RecipeImportInput, message?: string): Promise<RecipeImportReview> {
  const review = createReviewDraft(input);
  clearPendingImportResultCandidates();
  setPendingImportReview(review, message);
  return review;
}

function stageAiImportReviews(reviews: RecipeImportReview[]) {
  if (reviews.length > 1) {
    setPendingImportResultCandidates(reviews);
  } else if (reviews[0]) {
    clearPendingImportResultCandidates();
    setPendingImportReview(reviews[0]);
  }

  return reviews;
}

export async function prepareAiImportReview(input: RecipeImportInput): Promise<RecipeImportReview[]> {
  return stageAiImportReviews(await cleanRecipeWithAi(input));
}

export async function prepareAiScreenshotImportReview(
  input: RecipeImportInput,
  images: CleanRecipeImagePayload[],
): Promise<RecipeImportReview[]> {
  return stageAiImportReviews(await cleanRecipeScreenshotsWithAi(input, images));
}
