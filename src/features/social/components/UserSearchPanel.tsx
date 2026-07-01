import * as React from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/features/auth/useAuth';
import { ProfileSummary } from '@/features/social/components/ProfileSummary';
import { useFollowState, useProfileSearch } from '@/features/social/useSocial';
import type { UserProfile } from '@/features/social/socialTypes';
import { spacing, useThemeColors } from '@/lib/theme';

type UserSearchPanelProps = {
  onSelectUser?: (profile: UserProfile) => void;
  selectedUserId?: string;
  title?: string;
};

function UserResultRow({
  onSelectUser,
  profile,
  selectedUserId,
}: {
  onSelectUser?: (profile: UserProfile) => void;
  profile: UserProfile;
  selectedUserId?: string;
}) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const isSelf = user?.id === profile.userId;
  const { counts, error, follow, isFollowing, isLoading, unfollow } = useFollowState(isSelf ? undefined : profile.userId);

  return (
    <AppCard>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.md }}>
        <ProfileSummary profile={profile} />
        {onSelectUser ? (
          <AppButton
            disabled={isSelf}
            onPress={() => onSelectUser(profile)}
            variant={selectedUserId === profile.userId ? 'primary' : 'secondary'}>
            {selectedUserId === profile.userId ? 'Selected' : 'Select'}
          </AppButton>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Text selectable style={{ color: colors.mutedText }}>
          {counts.followers} followers
        </Text>
        <Text selectable style={{ color: colors.mutedText }}>
          {counts.following} following
        </Text>
      </View>
      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <AppButton disabled={isSelf || isLoading} onPress={isFollowing ? unfollow : follow} variant={isFollowing ? 'ghost' : 'primary'}>
        {isSelf ? 'You' : isFollowing ? 'Unfollow' : 'Follow'}
      </AppButton>
    </AppCard>
  );
}

export function UserSearchPanel({ onSelectUser, selectedUserId, title = 'Find people' }: UserSearchPanelProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { error, isSearching, profiles, query, setQuery } = useProfileSearch();
  const visibleProfiles = React.useMemo(() => profiles.filter((profile) => profile.userId !== user?.id), [profiles, user?.id]);

  return (
    <View style={{ gap: spacing.md }}>
      <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
        {title}
      </Text>
      <AppInput label="Search users" onChangeText={setQuery} placeholder="Username or display name" value={query} />
      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      {isSearching ? <LoadingState label="Searching users" /> : null}
      {query.trim() && !isSearching && visibleProfiles.length === 0 ? (
        <EmptyState message="Try another username or display name." title="No users found" />
      ) : null}
      {visibleProfiles.map((profile) => (
        <UserResultRow
          key={profile.userId}
          onSelectUser={onSelectUser}
          profile={profile}
          selectedUserId={selectedUserId}
        />
      ))}
    </View>
  );
}
