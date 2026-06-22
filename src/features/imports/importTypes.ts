import type { sourcePlatforms } from '@/lib/constants';
import type { RecipeDraft } from '@/features/recipes/recipeTypes';

export type SourcePlatform = (typeof sourcePlatforms)[number];

export type RecipeImportInput = {
  rawText: string;
  sourcePlatform: SourcePlatform;
  sourceType: 'caption' | 'manual_notes';
  sourceUrl?: string;
};

export type RecipeImportReview = RecipeDraft & {
  confidence: 'low' | 'medium' | 'high';
};
