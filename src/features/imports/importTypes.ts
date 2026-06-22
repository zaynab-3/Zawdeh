import type { sourcePlatforms } from '@/lib/constants';
import type { RecipeDraft } from '@/features/recipes/recipeTypes';

export type SourcePlatform = (typeof sourcePlatforms)[number];
export type ImportSourceType = 'caption' | 'manual_notes';

export type RecipeImportInput = {
  rawText: string;
  sourcePlatform: SourcePlatform;
  sourceType: ImportSourceType;
  sourceUrl?: string;
  targetLanguage?: string;
};

export type RecipeImportReview = RecipeDraft & {
  confidence: 'low' | 'medium' | 'high';
  originalLanguage?: string;
};

export type SelectedScreenshot = {
  id: string;
  name?: string;
  uri: string;
};
