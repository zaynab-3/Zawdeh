import { Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { SelectedScreenshotList } from '@/features/imports/SelectedScreenshotList';
import type { SelectedScreenshot } from '@/features/imports/importTypes';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

type ScreenshotImportSectionProps = {
  message?: string | null;
  onMoveDown: (id: string) => void;
  onMoveUp: (id: string) => void;
  onPick: () => void;
  onRemove: (id: string) => void;
  screenshots: SelectedScreenshot[];
};

export function ScreenshotImportSection({
  message,
  onMoveDown,
  onMoveUp,
  onPick,
  onRemove,
  screenshots,
}: ScreenshotImportSectionProps) {
  const colors = useThemeColors();

  return (
    <AppCard>
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Screenshot import
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm, lineHeight: 20 }}>
          Screenshots are only used for this import and are not saved permanently.
        </Text>
        <AppButton onPress={onPick} variant="secondary">
          Select screenshots
        </AppButton>
        <SelectedScreenshotList
          onMoveDown={onMoveDown}
          onMoveUp={onMoveUp}
          onRemove={onRemove}
          screenshots={screenshots}
        />
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm, lineHeight: 20 }}>
          OCR is coming next. For now, paste the text manually.
        </Text>
        {message ? (
          <Text selectable style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}>
            {message}
          </Text>
        ) : null}
      </View>
    </AppCard>
  );
}
