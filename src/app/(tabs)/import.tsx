import * as React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import WebView, {
  type WebViewMessageEvent,
  type WebViewNavigation,
} from 'react-native-webview';
import type {
  ShouldStartLoadRequest,
  WebViewNavigationEvent,
  WebViewOpenWindowEvent,
  WebViewProgressEvent,
} from 'react-native-webview/lib/WebViewTypes';

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
const FACEBOOK_RESOLVER_TIMEOUT_MS = 20_000;
const FACEBOOK_SHARE_FALLBACK_MESSAGE =
  'Facebook did not expose enough recipe details from this share link. Open it in Facebook, copy the reel URL, paste the caption, or use screenshot import.';
const FACEBOOK_RESOLVER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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

function isFacebookShareVideoUrl(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl.trim());
    const host = url.hostname.toLowerCase();
    return (
      (host === 'facebook.com' || host.endsWith('.facebook.com')) &&
      /^\/share\/[rv]\//iu.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function getFacebookShareResolverUrl(sourceUrl: string) {
  const url = new URL(sourceUrl.trim());
  url.protocol = 'https:';
  url.hostname = 'm.facebook.com';
  return url.toString();
}

function getNumericFacebookVideoId(value?: string | null) {
  const trimmedValue = value?.trim();
  return trimmedValue && /^\d{5,}$/u.test(trimmedValue) ? trimmedValue : null;
}

function getFacebookVideoIdFromUrl(sourceUrl?: string | null) {
  if (!sourceUrl) {
    return null;
  }

  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();

    if (host !== 'facebook.com' && !host.endsWith('.facebook.com')) {
      return null;
    }

    const videoQueryParam = getNumericFacebookVideoId(url.searchParams.get('v'));

    if (videoQueryParam) {
      return videoQueryParam;
    }

    const segments = url.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
    const reelIndex = segments.indexOf('reel');
    const reelId = getNumericFacebookVideoId(reelIndex >= 0 ? segments[reelIndex + 1] : null);

    if (reelId) {
      return reelId;
    }

    const videosIndex = segments.indexOf('videos');

    if (videosIndex >= 0) {
      for (let index = segments.length - 1; index > videosIndex; index -= 1) {
        const videoId = getNumericFacebookVideoId(segments[index]);

        if (videoId) {
          return videoId;
        }
      }
    }

    return getNumericFacebookVideoId(segments.at(-1));
  } catch {
    return null;
  }
}

function getFacebookWatchUrl(videoId: string) {
  return `https://www.facebook.com/watch/?v=${videoId}`;
}

function canLoadFacebookResolverUrl(sourceUrl?: string | null) {
  if (!sourceUrl || sourceUrl === 'about:blank') {
    return true;
  }

  try {
    const url = new URL(sourceUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    const host = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    if (pathname.startsWith('/unified/login_via/app/')) {
      return false;
    }

    return host === 'facebook.com' || host === 'm.facebook.com' || host === 'www.facebook.com';
  } catch {
    return false;
  }
}

function logFacebookShareResolver(event: string, url?: string | null) {
  if (__DEV__) {
    console.info('[facebook-share-resolver]', { event, url });
  }
}

export default function ImportScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const isMountedRef = React.useRef(true);
  const facebookShareResolverCancelledRef = React.useRef(false);
  const facebookShareResolverImportStartedRef = React.useRef(false);
  const facebookShareResolverResolvedRef = React.useRef(false);
  const facebookShareResolverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const facebookShareResolverWebViewRef = React.useRef<WebView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [facebookShareResolverUrl, setFacebookShareResolverUrl] = React.useState<string | null>(null);
  const [isCleaning, setIsCleaning] = React.useState(false);
  const [isCleaningScreenshots, setIsCleaningScreenshots] = React.useState(false);
  const [isImportingUrl, setIsImportingUrl] = React.useState(false);
  const [rawText, setRawText] = React.useState('');
  const [screenshotMessage, setScreenshotMessage] = React.useState<string | null>(null);
  const [screenshots, setScreenshots] = React.useState<SelectedScreenshot[]>([]);
  const [sourcePlatform, setSourcePlatform] = React.useState<SourcePlatform>('Instagram');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const sourceUrlError = sourceUrl.trim() && !isHttpUrl(sourceUrl) ? 'Use a valid http or https link.' : undefined;
  const isUrlImportBusy = isImportingUrl || Boolean(facebookShareResolverUrl);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearFacebookShareResolverTimeout();
      facebookShareResolverWebViewRef.current?.stopLoading();
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

  async function importUrlWithAi(importUrl: string) {
    try {
      setError(null);
      setIsImportingUrl(true);
      const reviews = await prepareAiUrlImportReview(getImportInput('url', importUrl));

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

  async function handleImportUrlWithAi() {
    if (isUrlImportBusy) {
      return;
    }

    const trimmedUrl = sourceUrl.trim();

    if (!trimmedUrl || sourceUrlError) {
      setError(sourceUrlError ?? 'Use a valid http or https link.');
      return;
    }

    if (isFacebookShareVideoUrl(trimmedUrl)) {
      startFacebookShareResolver(trimmedUrl);
      return;
    }

    await importUrlWithAi(trimmedUrl);
  }

  function clearFacebookShareResolverTimeout() {
    if (facebookShareResolverTimeoutRef.current) {
      clearTimeout(facebookShareResolverTimeoutRef.current);
      facebookShareResolverTimeoutRef.current = null;
    }
  }

  function closeFacebookShareResolver() {
    clearFacebookShareResolverTimeout();
    facebookShareResolverWebViewRef.current?.stopLoading();
    facebookShareResolverWebViewRef.current = null;

    if (isMountedRef.current) {
      setFacebookShareResolverUrl(null);
    }
  }

  function failFacebookShareResolver(url?: string | null) {
    if (facebookShareResolverCancelledRef.current || facebookShareResolverResolvedRef.current) {
      return;
    }

    facebookShareResolverResolvedRef.current = true;
    closeFacebookShareResolver();

    if (isMountedRef.current) {
      setError(FACEBOOK_SHARE_FALLBACK_MESSAGE);
      setIsImportingUrl(false);
    }
  }

  function resolveFacebookShareId(videoId: string, url?: string | null) {
    if (
      facebookShareResolverCancelledRef.current ||
      facebookShareResolverImportStartedRef.current ||
      facebookShareResolverResolvedRef.current
    ) {
      return;
    }

    facebookShareResolverResolvedRef.current = true;
    facebookShareResolverImportStartedRef.current = true;
    facebookShareResolverWebViewRef.current?.stopLoading();
    const importUrl = getFacebookWatchUrl(videoId);
    closeFacebookShareResolver();
    logFacebookShareResolver('resolved ID', url);

    setTimeout(() => {
      if (isMountedRef.current && !facebookShareResolverCancelledRef.current) {
        void importUrlWithAi(importUrl);
      }
    }, 100);
  }

  function inspectFacebookShareResolverUrl(event: string, url?: string | null) {
    if (facebookShareResolverCancelledRef.current || facebookShareResolverResolvedRef.current) {
      return false;
    }

    const videoId = getFacebookVideoIdFromUrl(url);

    if (videoId) {
      resolveFacebookShareId(videoId, url);
      return true;
    }

    return false;
  }

  function startFacebookShareResolver(sourceUrlToResolve: string) {
    let resolverUrl: string;

    try {
      resolverUrl = getFacebookShareResolverUrl(sourceUrlToResolve);
    } catch {
      setError(FACEBOOK_SHARE_FALLBACK_MESSAGE);
      return;
    }

    clearFacebookShareResolverTimeout();
    facebookShareResolverCancelledRef.current = false;
    facebookShareResolverImportStartedRef.current = false;
    facebookShareResolverResolvedRef.current = false;
    setError(null);
    setIsImportingUrl(true);
    setFacebookShareResolverUrl(resolverUrl);
    facebookShareResolverTimeoutRef.current = setTimeout(() => {
      failFacebookShareResolver(resolverUrl);
    }, FACEBOOK_RESOLVER_TIMEOUT_MS);
  }

  function handleCancelFacebookShareResolver() {
    facebookShareResolverCancelledRef.current = true;
    facebookShareResolverImportStartedRef.current = false;
    facebookShareResolverResolvedRef.current = true;
    closeFacebookShareResolver();
    setIsImportingUrl(false);
  }

  function handleFacebookShareShouldStartLoad(request: ShouldStartLoadRequest) {
    if (inspectFacebookShareResolverUrl('shouldStart', request.url)) {
      return false;
    }

    const canLoad = canLoadFacebookResolverUrl(request.url);

    if (!canLoad) {
      logFacebookShareResolver('blocked external handoff', request.url);
    }

    return canLoad;
  }

  function handleFacebookShareNavigationStateChange(navigation: WebViewNavigation) {
    inspectFacebookShareResolverUrl('navigationStateChange', navigation.url);
  }

  function handleFacebookShareLoadStart(event: WebViewNavigationEvent) {
    inspectFacebookShareResolverUrl('loadStart', event.nativeEvent.url);
  }

  function handleFacebookShareLoadProgress(event: WebViewProgressEvent) {
    inspectFacebookShareResolverUrl('loadProgress', event.nativeEvent.url);
  }

  function handleFacebookShareOpenWindow(event: WebViewOpenWindowEvent) {
    const targetUrl = event.nativeEvent.targetUrl;

    if (!inspectFacebookShareResolverUrl('openWindow', targetUrl)) {
      if (targetUrl && !canLoadFacebookResolverUrl(targetUrl)) {
        logFacebookShareResolver('blocked external handoff', targetUrl);
      }
    }
  }

  function handleFacebookShareResolverMessage(event: WebViewMessageEvent) {
    inspectFacebookShareResolverUrl('message', event.nativeEvent.data);
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
      <Modal
        animationType="fade"
        onRequestClose={handleCancelFacebookShareResolver}
        transparent
        visible={Boolean(facebookShareResolverUrl)}>
        <View
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.42)',
            flex: 1,
            justifyContent: 'center',
            padding: spacing.md,
          }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 18,
              borderWidth: 1,
              flex: 1,
              gap: spacing.md,
              overflow: 'hidden',
              padding: spacing.lg,
            }}>
            <View style={{ gap: spacing.sm }}>
              <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
                Confirm Facebook recipe
              </Text>
              <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm, lineHeight: 20 }}>
                We&apos;re opening Facebook inside Zawdeh to resolve this share link. The import will continue
                automatically.
              </Text>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  borderRadius: 12,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: spacing.sm,
                  padding: spacing.md,
                }}>
                <ActivityIndicator color={colors.primary} />
                <Text selectable style={{ color: colors.text, flex: 1, fontSize: fontSize.sm, fontWeight: '700' }}>
                  Fetching the Facebook link...
                </Text>
              </View>
            </View>

            {facebookShareResolverUrl ? (
              <View
                style={{
                  borderColor: colors.border,
                  borderRadius: 12,
                  borderWidth: 1,
                  flex: 1,
                  overflow: 'hidden',
                }}>
                <WebView
                  ref={facebookShareResolverWebViewRef}
                  incognito
                  javaScriptCanOpenWindowsAutomatically={false}
                  javaScriptEnabled
                  onLoadProgress={handleFacebookShareLoadProgress}
                  onLoadStart={handleFacebookShareLoadStart}
                  onMessage={handleFacebookShareResolverMessage}
                  onNavigationStateChange={handleFacebookShareNavigationStateChange}
                  onOpenWindow={handleFacebookShareOpenWindow}
                  onShouldStartLoadWithRequest={handleFacebookShareShouldStartLoad}
                  originWhitelist={['*']}
                  setSupportMultipleWindows={false}
                  sharedCookiesEnabled={false}
                  source={{ uri: facebookShareResolverUrl }}
                  style={{ backgroundColor: colors.surface, flex: 1 }}
                  thirdPartyCookiesEnabled={false}
                  userAgent={FACEBOOK_RESOLVER_USER_AGENT}
                />
              </View>
            ) : null}

            <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.xs, lineHeight: 18 }}>
              If Facebook blocks resolving, open the post in Facebook, copy the reel URL, then paste it here.
            </Text>
            <AppButton onPress={handleCancelFacebookShareResolver} variant="secondary">
              Cancel
            </AppButton>
          </View>
        </View>
      </Modal>

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
        disabled={!sourceUrl.trim() || Boolean(sourceUrlError) || isUrlImportBusy}
        onPress={handleImportUrlWithAi}
        variant="secondary">
        {isUrlImportBusy ? 'Importing recipe link...' : 'Import from URL'}
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
