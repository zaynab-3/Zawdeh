import * as React from 'react';
import { Text } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { getOwnProfile, updateOwnProfile } from '@/features/social/socialApi';
import { useThemeColors } from '@/lib/theme';

export function ProfileEditor() {
  const colors = useThemeColors();
  const [displayName, setDisplayName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [username, setUsername] = React.useState('');

  React.useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      getOwnProfile()
        .then((profile) => {
          if (isMounted && profile) {
            setDisplayName(profile.displayName ?? '');
            setUsername(profile.username ?? '');
          }
        })
        .catch((loadError) => {
          if (isMounted) {
            setError(loadError instanceof Error ? loadError.message : 'Profile could not be loaded.');
          }
        });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, []);

  async function saveProfile() {
    try {
      setError(null);
      setIsSaving(true);
      await updateOwnProfile({ displayName, username });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Profile could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppCard>
      <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
        Your profile
      </Text>
      <Text selectable style={{ color: colors.mutedText }}>
        Username must be 3-30 letters, numbers, or underscores.
      </Text>
      <AppInput label="Display name" onChangeText={setDisplayName} placeholder="Zainab" value={displayName} />
      <AppInput
        autoCapitalize="none"
        label="Username"
        onChangeText={setUsername}
        placeholder="zainab_cooks"
        value={username}
      />
      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <AppButton disabled={isSaving} onPress={saveProfile}>
        {isSaving ? 'Saving...' : 'Save profile'}
      </AppButton>
    </AppCard>
  );
}
