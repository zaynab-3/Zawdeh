import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { borderRadius, shadow, spacing, useThemeColors } from '@/lib/theme';

export function AppCard({ children }: PropsWithChildren) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderCurve: 'continuous',
        borderRadius: borderRadius.md,
        borderWidth: 1,
        boxShadow: shadow.soft,
        gap: spacing.md,
        padding: spacing.lg,
      }}>
      {children}
    </View>
  );
}
