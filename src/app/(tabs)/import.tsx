import * as React from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AI_CLEANER_NOT_READY_MESSAGE } from '@/features/imports/cleanRecipe';
import { prepareAiImportReview, prepareImportReview } from '@/features/imports/importApi';
import { ScreenshotImportSection } from '@/features/imports/ScreenshotImportSection';
import type { SelectedScreenshot, SourcePlatform } from '@/features/imports/importTypes';
import { sourcePlatforms } from '@/lib/constants';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';
import { isHttpUrl } from '@/lib/validators';

const SCREENSHOT_PICKER_NOT_READY_MESSAGE =
  'Screenshot picker needs expo-image-picker before selecting images. OCR is coming next. For now, paste the text manually.';

export default function ImportScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isCleaning, setIsCleaning] = React.useState(false);
  const [rawText, setRawText] = React.useState('');
  const [screenshotMessage, setScreenshotMessage] = React.useState<string | null>(null);
  const [screenshots, setScreenshots] = React.useState<SelectedScreenshot[]>([]);
  const [sourcePlatform, setSourcePlatform] = React.useState<SourcePlatform>('Instagram');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const sourceUrlError = isHttpUrl(sourceUrl) ? undefined : 'Use a valid http or https link.';

  function getImportInput() {
    return {
      rawText,
      sourcePlatform,
      sourceType: 'caption' as const,
      sourceUrl,
      targetLanguage: 'en',
    };
  }

  function validateTextImport() {
    if (!rawText.trim()) {
      setError('Paste caption or recipe text before reviewing.');
      return false;
    }

    if (sourceUrlError) {
      setError(sourceUrlError);
      return false;
    }

    return true;
  }

  async function handlePrepareImport() {
    if (!validateTextImport()) {
      return;
    }

    setError(null);
    await prepareImportReview(getImportInput());
    router.push('/import/review');
  }

  async function handleCleanWithAi() {
    if (!validateTextImport()) {
      return;
    }

    try {
      setError(null);
      setIsCleaning(true);
      await prepareAiImportReview(getImportInput());
    } catch {
      await prepareImportReview(getImportInput(), AI_CLEANER_NOT_READY_MESSAGE);
    } finally {
      setIsCleaning(false);
    }

    router.push('/import/review');
  }

  function handlePickScreenshots() {
    setScreenshotMessage(SCREENSHOT_PICKER_NOT_READY_MESSAGE);
  }

  function removeScreenshot(id: string) {
    setScreenshots((current) => current.filter((screenshot) => screenshot.id !== id));
  }

  function moveScreenshot(id: string, direction: -1 | 1) {
    setScreenshots((current) => {
      const index = current.findIndex((screenshot) => screenshot.id === id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  return (
    <Screen subtitle="Paste caption text, then review and save manually." title="Import recipe">
      <ScreenshotImportSection
        message={screenshotMessage}
        onMoveDown={(id) => moveScreenshot(id, 1)}
        onMoveUp={(id) => moveScreenshot(id, -1)}
        onPick={handlePickScreenshots}
        onRemove={removeScreenshot}
        screenshots={screenshots}
      />

      <AppInput
        label="Paste caption or text"
        multiline
        onChangeText={setRawText}
        placeholder="Paste recipe caption, notes, or copied post text"
        value={rawText}
      />
      <AppInput
        error={sourceUrlError}
        label="Source link"
        onChangeText={setSourceUrl}
        placeholder="https://..."
        value={sourceUrl}
      />

      <AppCard>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Source platform
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {sourcePlatforms.map((platform) => (
            <AppButton
              key={platform}
              onPress={() => setSourcePlatform(platform)}
              variant={platform === sourcePlatform ? 'primary' : 'secondary'}>
              {platform}
            </AppButton>
          ))}
        </View>
      </AppCard>

      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: fontSize.md }}>
          {error}
        </Text>
      ) : null}

      <AppButton disabled={Boolean(sourceUrlError)} onPress={handlePrepareImport}>
        Continue / Review
      </AppButton>
      <AppButton disabled={Boolean(sourceUrlError) || isCleaning} onPress={handleCleanWithAi} variant="secondary">
        {isCleaning ? 'Cleaning...' : 'Clean with AI'}
      </AppButton>
    </Screen>
  );
}
