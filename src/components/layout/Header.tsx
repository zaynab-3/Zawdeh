import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { fontSize, spacing, useThemeColors } from '@/lib/theme';

type HeaderProps = {
  action?: ReactNode;
  subtitle?: string;
  title: string;
};

export function Header({ action, subtitle, title }: HeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
        <Text selectable style={{ color: colors.text, flex: 1, fontSize: fontSize.xl, fontWeight: '800' }}>
          {title}
        </Text>
        {action}
      </View>
      {subtitle ? (
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md, lineHeight: 22 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
