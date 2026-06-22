import * as React from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { prepareImportReview } from '@/features/imports/importApi';
import type { SourcePlatform } from '@/features/imports/importTypes';
import { sourcePlatforms } from '@/lib/constants';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';
import { isHttpUrl } from '@/lib/validators';

export default function ImportScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [rawText, setRawText] = React.useState('');
  const [sourcePlatform, setSourcePlatform] = React.useState<SourcePlatform>('Instagram');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const sourceUrlError = isHttpUrl(sourceUrl) ? undefined : 'Use a valid http or https link.';

  async function handlePrepareImport() {
    if (!rawText.trim()) {
      setError('Paste caption or recipe text before reviewing.');
      return;
    }

    if (sourceUrlError) {
      setError(sourceUrlError);
      return;
    }

    setError(null);
    await prepareImportReview({
      rawText,
      sourcePlatform,
      sourceType: 'caption',
      sourceUrl,
    });
    router.push('/import/review');
  }

  return (
    <Screen subtitle="Paste caption text, then review and save manually." title="Import recipe">
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
    </Screen>
  );
}
