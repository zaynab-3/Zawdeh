import * as React from 'react';
import type { PressableProps } from 'react-native';
import { Pressable, Text } from 'react-native';

import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';

type AppButtonProps = Omit<PressableProps, 'children'> & React.PropsWithChildren<{
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}>;

export const AppButton = React.forwardRef<React.ElementRef<typeof Pressable>, AppButtonProps>(function AppButton(
  { children, disabled, onPress, style, variant = 'primary', ...props },
  ref,
) {
  const colors = useThemeColors();
  const backgroundColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.surfaceAlt
        : variant === 'danger'
          ? colors.danger
          : 'transparent';
  const color = variant === 'primary' || variant === 'danger' ? colors.primaryText : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      ref={ref}
      style={(state) => [
        {
          alignItems: 'center',
          backgroundColor,
          borderColor: variant === 'ghost' ? colors.border : backgroundColor,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          opacity: disabled ? 0.5 : state.pressed ? 0.82 : 1,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        typeof style === 'function' ? style(state) : style,
      ]}>
      <Text style={{ color, fontSize: fontSize.md, fontWeight: '700' }}>{children}</Text>
    </Pressable>
  );
});
