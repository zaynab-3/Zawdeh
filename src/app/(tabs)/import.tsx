import * as React from 'react';
import { Link } from 'expo-router';
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
  const [rawText, setRawText] = React.useState('');
  const [sourcePlatform, setSourcePlatform] = React.useState<SourcePlatform>('Instagram');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const sourceUrlError = isHttpUrl(sourceUrl) ? undefined : 'Use a valid http or https link.';

  async function handlePrepareImport() {
    await prepareImportReview({
      rawText,
      sourcePlatform,
      sourceType: rawText.trim() ? 'caption' : 'screenshot_placeholder',
      sourceUrl,
    });
  }

  return (
    <Screen subtitle="Screenshots stay temporary. Review every cleaned recipe before saving." title="Import recipe">
      <AppCard>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Add screenshots
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <AppButton variant="secondary">One screenshot</AppButton>
          <AppButton variant="secondary">Multiple</AppButton>
        </View>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
          TODO: Plug in image picker and on-device OCR. Do not store screenshots permanently.
        </Text>
      </AppCard>

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

      <Link href="/import/review" asChild>
        <AppButton disabled={Boolean(sourceUrlError)} onPress={handlePrepareImport}>
          Process import
        </AppButton>
      </Link>
    </Screen>
  );
}
