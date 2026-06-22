import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import type { SelectedScreenshot } from '@/features/imports/importTypes';
import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';

type SelectedScreenshotListProps = {
  onMoveDown: (id: string) => void;
  onMoveUp: (id: string) => void;
  onRemove: (id: string) => void;
  screenshots: SelectedScreenshot[];
};

export function SelectedScreenshotList({ onMoveDown, onMoveUp, onRemove, screenshots }: SelectedScreenshotListProps) {
  const colors = useThemeColors();

  if (screenshots.length === 0) {
    return (
      <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
        No screenshots selected.
      </Text>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {screenshots.map((screenshot, index) => (
        <View
          key={screenshot.id}
          style={{
            alignItems: 'center',
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            flexDirection: 'row',
            gap: spacing.sm,
            padding: spacing.sm,
          }}>
          <Image
            source={{ uri: screenshot.uri }}
            style={{ borderRadius: borderRadius.sm, height: 56, width: 56 }}
          />
          <Text
            numberOfLines={1}
            style={{ color: colors.text, flex: 1, fontSize: fontSize.sm, fontWeight: '700' }}>
            {screenshot.name ?? `Screenshot ${index + 1}`}
          </Text>
          <AppButton disabled={index === 0} onPress={() => onMoveUp(screenshot.id)} variant="ghost">
            Up
          </AppButton>
          <AppButton disabled={index === screenshots.length - 1} onPress={() => onMoveDown(screenshot.id)} variant="ghost">
            Down
          </AppButton>
          <AppButton onPress={() => onRemove(screenshot.id)} variant="danger">
            Remove
          </AppButton>
        </View>
      ))}
    </View>
  );
}
