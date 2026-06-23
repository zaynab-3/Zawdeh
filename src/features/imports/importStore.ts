import type { RecipeImportReview } from '@/features/imports/importTypes';

let pendingReview: RecipeImportReview | null = null;
let pendingReviewMessage: string | null = null;
let pendingResultCandidates: RecipeImportReview[] = [];

export function setPendingImportReview(review: RecipeImportReview, message?: string) {
  pendingReview = review;
  pendingReviewMessage = message ?? null;
}

export function setPendingImportResultCandidates(candidates: RecipeImportReview[]) {
  pendingResultCandidates = candidates;
  pendingReview = null;
  pendingReviewMessage = null;
}

export function getPendingImportReview() {
  return pendingReview;
}

export function getPendingImportReviewMessage() {
  return pendingReviewMessage;
}

export function getPendingImportResultCandidates() {
  return pendingResultCandidates;
}

export function removePendingImportResultCandidate(indexToRemove: number) {
  pendingResultCandidates = pendingResultCandidates.filter((_, index) => index !== indexToRemove);
  return pendingResultCandidates;
}

export function clearPendingImportReview() {
  pendingReview = null;
  pendingReviewMessage = null;
}

export function clearPendingImportResultCandidates() {
  pendingResultCandidates = [];
}
