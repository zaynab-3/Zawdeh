import { Pressable, Text, View } from 'react-native';

import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';
import type { RecipeIngredient } from '@/features/recipes/recipeTypes';

type IngredientRowProps = {
  ingredient: RecipeIngredient;
  isChecked?: boolean;
  onToggle?: () => void;
};

export function IngredientRow({ ingredient, isChecked, onToggle }: IngredientRowProps) {
  const colors = useThemeColors();
  const amount = [ingredient.quantity, ingredient.unit].filter(Boolean).join(' ');
  const detail = [amount, ingredient.note].filter(Boolean).join(', ') || 'As needed';

  return (
    <Pressable
      accessibilityRole={onToggle ? 'checkbox' : undefined}
      accessibilityState={onToggle ? { checked: Boolean(isChecked) } : undefined}
      disabled={!onToggle}
      onPress={onToggle}
      style={{
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.xs,
        justifyContent: 'space-between',
        opacity: isChecked ? 0.65 : 1,
        padding: spacing.md,
      }}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text
          selectable
          style={{
            color: colors.text,
            fontSize: fontSize.md,
            fontWeight: '700',
            textDecorationLine: isChecked ? 'line-through' : 'none',
          }}>
          {ingredient.name}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
          {detail}
        </Text>
      </View>
      {onToggle ? (
        <Text style={{ color: isChecked ? colors.primary : colors.mutedText, fontSize: fontSize.sm, fontWeight: '700' }}>
          {isChecked ? 'Have' : 'Need'}
        </Text>
      ) : null}
    </Pressable>
  );
}
