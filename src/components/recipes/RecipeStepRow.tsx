import { Text, View } from 'react-native';

import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';
import type { RecipeStep } from '@/features/recipes/recipeTypes';

type RecipeStepRowProps = {
  step: RecipeStep;
};

export function RecipeStepRow({ step }: RecipeStepRowProps) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        gap: spacing.sm,
        padding: spacing.md,
      }}>
      <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: '800' }}>Step {step.position}</Text>
      <Text selectable style={{ color: colors.text, fontSize: fontSize.md, lineHeight: 22 }}>
        {step.instruction}
      </Text>
      {step.timerMinutes ? (
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
          {step.timerMinutes} min
        </Text>
      ) : null}
    </View>
  );
}
