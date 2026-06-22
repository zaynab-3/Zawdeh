import type { RecipeImportReview } from '@/features/imports/importTypes';

let pendingReview: RecipeImportReview | null = null;
let pendingReviewMessage: string | null = null;

export function setPendingImportReview(review: RecipeImportReview, message?: string) {
  pendingReview = review;
  pendingReviewMessage = message ?? null;
}

export function getPendingImportReview() {
  return pendingReview;
}

export function getPendingImportReviewMessage() {
  return pendingReviewMessage;
}

export function clearPendingImportReview() {
  pendingReview = null;
  pendingReviewMessage = null;
}
