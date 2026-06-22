import type { RecipeImportReview } from '@/features/imports/importTypes';

let pendingReview: RecipeImportReview | null = null;

export function setPendingImportReview(review: RecipeImportReview) {
  pendingReview = review;
}

export function getPendingImportReview() {
  return pendingReview;
}

export function clearPendingImportReview() {
  pendingReview = null;
}
