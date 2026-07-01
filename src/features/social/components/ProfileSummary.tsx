import { Text, View } from 'react-native';

import { fontSize, spacing, useThemeColors } from '@/lib/theme';
import type { UserProfile } from '@/features/social/socialTypes';

type ProfileSummaryProps = {
  profile: UserProfile;
};

export function getProfileLabel(profile: UserProfile) {
  return profile.displayName || profile.username || 'Zawdeh user';
}

export function ProfileSummary({ profile }: ProfileSummaryProps) {
  const colors = useThemeColors();

  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
        {getProfileLabel(profile)}
      </Text>
      <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.sm }}>
        {profile.username ? `@${profile.username}` : profile.userId.slice(0, 8)}
      </Text>
    </View>
  );
}
