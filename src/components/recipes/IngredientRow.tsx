import { Text, View } from 'react-native';

import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';
import type { RecipeIngredient } from '@/features/recipes/recipeTypes';

type IngredientRowProps = {
  ingredient: RecipeIngredient;
};

export function IngredientRow({ ingredient }: IngredientRowProps) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        gap: spacing.xs,
        padding: spacing.md,
      }}>
      <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '700' }}>
        {ingredient.name}
      </Text>
      <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
        {[ingredient.quantity, ingredient.unit, ingredient.note].filter(Boolean).join(' ')}
      </Text>
    </View>
  );
}
