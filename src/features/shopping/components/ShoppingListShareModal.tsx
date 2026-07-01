import * as React from 'react';
import { Modal, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { ProfileSummary } from '@/features/social/components/ProfileSummary';
import { UserSearchPanel } from '@/features/social/components/UserSearchPanel';
import {
  listShoppingListShareProfiles,
  removeShoppingListShare,
  shareShoppingListWithUser,
} from '@/features/social/socialApi';
import type { ShareProfile, UserProfile } from '@/features/social/socialTypes';
import { borderRadius, fontSize, spacing, useThemeColors } from '@/lib/theme';

type ShoppingListShareModalProps = {
  listId: string;
  onClose: () => void;
  visible: boolean;
};

export function ShoppingListShareModal({ listId, onClose, visible }: ShoppingListShareModalProps) {
  const colors = useThemeColors();
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedProfile, setSelectedProfile] = React.useState<UserProfile | null>(null);
  const [shares, setShares] = React.useState<ShareProfile[]>([]);

  const loadShares = React.useCallback(async () => {
    try {
      setError(null);
      setShares(await listShoppingListShareProfiles(listId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'List shares could not be loaded.');
    }
  }, [listId]);

  React.useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      void loadShares();
    }, 0);

    return () => clearTimeout(timeout);
  }, [loadShares, visible]);

  async function handleShare() {
    if (!selectedProfile || isSaving) {
      return;
    }

    try {
      setError(null);
      setIsSaving(true);
      await shareShoppingListWithUser({ listId, permission: 'view', userId: selectedProfile.userId });
      setSelectedProfile(null);
      await loadShares();
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : 'Shopping list could not be shared.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(userId: string) {
    try {
      setError(null);
      await removeShoppingListShare(listId, userId);
      await loadShares();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Shared access could not be removed.');
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', flex: 1, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: borderRadius.lg,
            borderTopRightRadius: borderRadius.lg,
            gap: spacing.lg,
            maxHeight: '88%',
            padding: spacing.lg,
          }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' }}>
            <Text selectable style={{ color: colors.text, flex: 1, fontSize: fontSize.lg, fontWeight: '800' }}>
              Share shopping list
            </Text>
            <AppButton onPress={onClose} variant="ghost">
              Close
            </AppButton>
          </View>
          {error ? (
            <Text selectable style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}
          <UserSearchPanel onSelectUser={setSelectedProfile} selectedUserId={selectedProfile?.userId} title="Share with" />
          <AppButton disabled={!selectedProfile || isSaving} onPress={handleShare}>
            {isSaving ? 'Sharing...' : 'Share view access'}
          </AppButton>
          <View style={{ gap: spacing.md }}>
            <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
              Current access
            </Text>
            {shares.length === 0 ? (
              <Text selectable style={{ color: colors.mutedText }}>
                No explicit shares yet.
              </Text>
            ) : null}
            {shares.map((share) => (
              <AppCard key={share.userId}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: spacing.md }}>
                  <ProfileSummary profile={share.profile} />
                  <AppButton onPress={() => handleRemove(share.userId)} variant="danger">
                    Remove
                  </AppButton>
                </View>
              </AppCard>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
