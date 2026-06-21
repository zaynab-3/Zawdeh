import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { Header } from '@/components/layout/Header';
import { spacing, useThemeColors } from '@/lib/theme';

type ScreenProps = PropsWithChildren<{
  action?: ReactNode;
  subtitle?: string;
  title?: string;
}>;

export function Screen({ action, children, subtitle, title }: ScreenProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentContainerStyle={{
        gap: spacing.lg,
        paddingBottom: spacing.xxl,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
      }}>
      {title ? <Header action={action} subtitle={subtitle} title={title} /> : null}
      {children}
    </ScrollView>
  );
}
