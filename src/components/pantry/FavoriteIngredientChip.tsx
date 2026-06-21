import { Pressable, Text } from 'react-native';

import type { FavoriteIngredient } from '@/features/pantry/pantryTypes';
import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';

type FavoriteIngredientChipProps = {
  ingredient: FavoriteIngredient;
  onPress?: () => void;
};

export function FavoriteIngredientChip({ ingredient, onPress }: FavoriteIngredientChipProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surfaceAlt,
        borderRadius: borderRadius.pill,
        opacity: pressed ? 0.8 : 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
      })}>
      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700' }}>{ingredient.name}</Text>
    </Pressable>
  );
}
