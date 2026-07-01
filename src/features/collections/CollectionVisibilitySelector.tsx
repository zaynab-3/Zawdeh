import * as React from 'react';
import { Text } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { VisibilitySegmentedControl } from '@/features/social/components/VisibilitySegmentedControl';
import { setCollectionVisibility } from '@/features/social/socialApi';
import type { Visibility } from '@/types/database';
import { useThemeColors } from '@/lib/theme';

type CollectionVisibilitySelectorProps = {
  collectionId: string;
  onChanged: () => Promise<void> | void;
  visibility: Visibility;
};

export function CollectionVisibilitySelector({ collectionId, onChanged, visibility }: CollectionVisibilitySelectorProps) {
  const colors = useThemeColors();
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleChange(nextVisibility: Visibility) {
    if (nextVisibility === visibility || isSaving) {
      return;
    }

    try {
      setError(null);
      setIsSaving(true);
      await setCollectionVisibility(collectionId, nextVisibility);
      await onChanged();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Collection visibility could not be updated.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppCard>
      <VisibilitySegmentedControl disabled={isSaving} onChange={handleChange} value={visibility} />
      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </AppCard>
  );
}
