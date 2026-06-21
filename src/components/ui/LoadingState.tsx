import { ActivityIndicator, Text, View } from 'react-native';

import { fontSize, spacing, useThemeColors } from '@/lib/theme';

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
  const colors = useThemeColors();

  return (
    <View style={{ alignItems: 'center', gap: spacing.md, padding: spacing.xl }}>
      <ActivityIndicator color={colors.primary} />
      <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md }}>
        {label}
      </Text>
    </View>
  );
}
