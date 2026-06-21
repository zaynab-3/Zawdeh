import { Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

type EmptyStateProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
};

export function EmptyState({ actionLabel, message, onAction, title }: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <AppCard>
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
          {title}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md, lineHeight: 22 }}>
          {message}
        </Text>
      </View>
      {actionLabel && onAction ? <AppButton onPress={onAction}>{actionLabel}</AppButton> : null}
    </AppCard>
  );
}
