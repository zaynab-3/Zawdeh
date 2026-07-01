import * as React from 'react';
import { Text, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { setRecipeVisibility } from '@/features/social/socialApi';
import { VisibilitySegmentedControl } from '@/features/social/components/VisibilitySegmentedControl';
import type { Visibility } from '@/types/database';
import { spacing, useThemeColors } from '@/lib/theme';

type RecipeVisibilitySelectorProps = {
  onChanged?: (visibility: Visibility) => void;
  recipeId: string;
  visibility: Visibility;
};

export function RecipeVisibilitySelector({ onChanged, recipeId, visibility }: RecipeVisibilitySelectorProps) {
  const colors = useThemeColors();
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleChange(nextVisibility: Visibility) {
    if (nextVisibility === visibility || isSaving) {
      return;
    }

    try {
      setError(null);
      setIsSaving(true);
      await setRecipeVisibility(recipeId, nextVisibility);
      onChanged?.(nextVisibility);
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Recipe visibility could not be updated.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppCard>
      <View style={{ gap: spacing.sm }}>
        <VisibilitySegmentedControl disabled={isSaving} onChange={handleChange} value={visibility} />
        {error ? (
          <Text selectable style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}
      </View>
    </AppCard>
  );
}
