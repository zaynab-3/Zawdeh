import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { Text, TextInput, View } from 'react-native';

import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';

type AppInputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  error?: string;
  label: string;
};

export function AppInput({ containerStyle, error, label, multiline, style, ...props }: AppInputProps) {
  const colors = useThemeColors();

  return (
    <View style={[{ gap: spacing.sm }, containerStyle]}>
      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700' }}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor={colors.mutedText}
        style={[
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            color: colors.text,
            fontSize: fontSize.md,
            minHeight: multiline ? 112 : 48,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: fontSize.sm }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
