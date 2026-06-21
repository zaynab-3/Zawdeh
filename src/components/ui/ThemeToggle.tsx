import { Text, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { fontSize, spacing, useThemeColors, useThemeMode } from '@/lib/theme';

export function ThemeToggle() {
  const colors = useThemeColors();
  const mode = useThemeMode();

  return (
    <AppCard>
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Theme
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md }}>
          Following system setting: {mode}
        </Text>
      </View>
    </AppCard>
  );
}
