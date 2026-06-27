import * as React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import {
  AI_CLEANER_NOT_READY_MESSAGE,
  SCREENSHOT_AI_NOT_READY_MESSAGE,
  type CleanRecipeImagePayload,
} from '@/features/imports/cleanRecipe';
import {
  prepareAiImportReview,
  prepareAiScreenshotImportReview,
  prepareAiUrlImportReview,
  prepareImportReview,
} from '@/features/imports/importApi';
import { detectImportSource } from '@/features/imports/sourcePlatformDetection';
import { ScreenshotImportSection } from '@/features/imports/ScreenshotImportSection';
import type { SelectedScreenshot, SourcePlatform } from '@/features/imports/importTypes';
import { sourcePlatforms } from '@/lib/constants';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';
import { isHttpUrl } from '@/lib/validators';

const MAX_SCREENSHOTS = 5;
const MAX_IMAGE_BASE64_CHARS = 8_000_000;
const MAX_TOTAL_IMAGE_BASE64_CHARS = 16_000_000;
const SCREENSHOT_PREPARE_FAILED_MESSAGE = 'Could not prepare screenshots. Please try selecting them again.';
const SCREENSHOT_TOO_LARGE_MESSAGE = 'Screenshots are too large. Select fewer or smaller screenshots.';

function getScreenshotMimeType(uri: string, mimeType?: string | null) {
  const normalizedMimeType = mimeType?.trim().toLowerCase();

  if (normalizedMimeType?.startsWith('image/')) {
    return normalizedMimeType;
  }

  const normalizedUri = uri.split('?')[0]?.toLowerCase() ?? '';

  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUri.endsWith('.webp')) {
    return 'image/webp';
  }

  if (normalizedUri.endsWith('.heic')) {
    return 'image/heic';
  }

  if (normalizedUri.endsWith('.heif')) {
    return 'image/heif';
  }

  return 'image/jpeg';
}

function getTotalImageBase64Length(screenshots: SelectedScreenshot[]) {
  return screenshots.reduce((total, screenshot) => total + (screenshot.base64?.length ?? 0), 0);
}

function screenshotsAreTooLarge(screenshots: SelectedScreenshot[]) {
  return (
    screenshots.some((screenshot) => (screenshot.base64?.length ?? 0) > MAX_IMAGE_BASE64_CHARS) ||
    getTotalImageBase64Length(screenshots) > MAX_TOTAL_IMAGE_BASE64_CHARS
  );
}

function getScreenshotImagePayloads(screenshots: SelectedScreenshot[]): CleanRecipeImagePayload[] | null {
  if (screenshots.length === 0 || screenshots.length > MAX_SCREENSHOTS || screenshotsAreTooLarge(screenshots)) {
    return null;
  }

  const images = screenshots.map((screenshot) => {
    const base64 = screenshot.base64?.trim();

    if (!base64) {
      return null;
    }

    return {
      base64,
      mime_type: screenshot.mimeType ?? getScreenshotMimeType(screenshot.uri),
    };
  });

  if (images.some((image) => image === null)) {
    return null;
  }

  return images as CleanRecipeImagePayload[];
}

export default function ImportScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const isMountedRef = React.useRef(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCleaning, setIsCleaning] = React.useState(false);
  const [isCleaningScreenshots, setIsCleaningScreenshots] = React.useState(false);
  const [isImportingUrl, setIsImportingUrl] = React.useState(false);
  const [rawText, setRawText] = React.useState('');
  const [screenshotMessage, setScreenshotMessage] = React.useState<string | null>(null);
  const [screenshots, setScreenshots] = React.useState<SelectedScreenshot[]>([]);
  const [sourcePlatform, setSourcePlatform] = React.useState<SourcePlatform>('Instagram');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const sourceUrlError = sourceUrl.trim() && !isHttpUrl(sourceUrl) ? 'Use a valid http or https link.' : undefined;

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function getImportInput(importKind: 'caption' | 'screenshot' | 'url', sourceUrlOverride = sourceUrl) {
    const source = detectImportSource({
      importKind,
      rawText,
      selectedPlatform: importKind === 'screenshot' && sourcePlatform === 'Caption' ? undefined : sourcePlatform,
      sourceUrl: sourceUrlOverride,
    });

    return {
      rawText,
      sourcePlatform: source.platform,
      sourceType: source.sourceType,
      sourceUrl: sourceUrlOverride,
      targetLanguage: 'original',
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
    await prepareImportReview(getImportInput('caption'));
    if (isMountedRef.current) {
      router.push('/import/review');
    }
  }

  async function handleCleanWithAi() {
    if (!validateTextImport()) {
      return;
    }

    try {
      setError(null);
      setIsCleaning(true);
      const reviews = await prepareAiImportReview(getImportInput('caption'));

      if (isMountedRef.current) {
        router.push(reviews.length > 1 ? '/import/results' : '/import/review');
      }
    } catch {
      await prepareImportReview(getImportInput('caption'), AI_CLEANER_NOT_READY_MESSAGE);

      if (isMountedRef.current) {
        router.push('/import/review');
      }
    } finally {
      if (isMountedRef.current) {
        setIsCleaning(false);
      }
    }
  }

  async function handleImportUrlWithAi() {
    const trimmedUrl = sourceUrl.trim();

    if (!trimmedUrl || sourceUrlError) {
      setError(sourceUrlError ?? 'Use a valid http or https link.');
      return;
    }

    try {
      setError(null);
      setIsImportingUrl(true);
      const reviews = await prepareAiUrlImportReview(getImportInput('url', trimmedUrl));

      if (isMountedRef.current) {
        router.push(reviews.length > 1 ? '/import/results' : '/import/review');
      }
    } catch (importError) {
      if (isMountedRef.current) {
        setError(
          importError instanceof Error
            ? importError.message
            : 'Could not import this recipe link. Paste the recipe text or use screenshots instead.',
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsImportingUrl(false);
      }
    }
  }

  async function handlePickScreenshots() {
    const remainingSlots = MAX_SCREENSHOTS - screenshots.length;

    if (remainingSlots <= 0) {
      setScreenshotMessage('You can select up to 5 screenshots.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!isMountedRef.current) {
      return;
    }

    if (!permission.granted) {
      setScreenshotMessage('Photo library permission is needed to select screenshots.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      base64: true,
      mediaTypes: ['images'],
      orderedSelection: true,
      quality: 0.85,
      selectionLimit: remainingSlots,
    });

    if (!isMountedRef.current || result.canceled) {
      return;
    }

    const selectedScreenshots = result.assets.slice(0, remainingSlots).map<SelectedScreenshot>((asset, index) => ({
      base64: asset.base64 ?? undefined,
      fileName: asset.fileName ?? undefined,
      height: asset.height,
      id: `${asset.assetId ?? asset.uri}-${Date.now().toString(36)}-${index}`,
      mimeType: getScreenshotMimeType(asset.uri, asset.mimeType),
      name: asset.fileName ?? `Screenshot ${screenshots.length + index + 1}`,
      uri: asset.uri,
      width: asset.width,
    }));

    if (selectedScreenshots.some((screenshot) => !screenshot.base64)) {
      setScreenshotMessage(SCREENSHOT_PREPARE_FAILED_MESSAGE);
      return;
    }

    const nextScreenshots = [...screenshots, ...selectedScreenshots].slice(0, MAX_SCREENSHOTS);

    if (screenshotsAreTooLarge(nextScreenshots)) {
      setScreenshotMessage(SCREENSHOT_TOO_LARGE_MESSAGE);
      return;
    }

    setScreenshots(nextScreenshots);
    setScreenshotMessage(null);
  }

  async function handleCleanScreenshotsWithAi() {
    if (sourceUrlError) {
      setError(sourceUrlError);
      return;
    }

    const images = getScreenshotImagePayloads(screenshots);

    if (!images) {
      setScreenshotMessage(
        screenshotsAreTooLarge(screenshots) ? SCREENSHOT_TOO_LARGE_MESSAGE : SCREENSHOT_PREPARE_FAILED_MESSAGE,
      );
      return;
    }

    try {
      setError(null);
      setScreenshotMessage(null);
      setIsCleaningScreenshots(true);
      const reviews = await prepareAiScreenshotImportReview(getImportInput('screenshot'), images);

      if (isMountedRef.current) {
        setScreenshots([]);
        router.push(reviews.length > 1 ? '/import/results' : '/import/review');
      }
    } catch {
      if (isMountedRef.current) {
        setScreenshotMessage(SCREENSHOT_AI_NOT_READY_MESSAGE);
      }
    } finally {
      if (isMountedRef.current) {
        setIsCleaningScreenshots(false);
      }
    }
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
        cleanDisabled={Boolean(sourceUrlError)}
        isCleaning={isCleaningScreenshots}
        message={screenshotMessage}
        onClean={handleCleanScreenshotsWithAi}
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
      <AppButton
        disabled={!sourceUrl.trim() || Boolean(sourceUrlError) || isImportingUrl}
        onPress={handleImportUrlWithAi}
        variant="secondary">
        {isImportingUrl ? 'Importing recipe link...' : 'Import from URL'}
      </AppButton>

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
