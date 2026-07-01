import { Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import type { SocialNotification } from '@/features/social/socialTypes';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

type NotificationListProps = {
  error?: string | null;
  isLoading: boolean;
  markAllRead: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  notifications: SocialNotification[];
  unreadCount: number;
};

function getNotificationTitle(notification: SocialNotification) {
  switch (notification.type) {
    case 'user_followed':
      return 'Someone followed you';
    case 'recipe_shared':
      return 'Recipe shared with you';
    case 'recipe_access_removed':
      return 'Recipe access removed';
    case 'shopping_list_shared':
      return 'Shopping list shared with you';
    case 'shopping_list_access_removed':
      return 'Shopping list access removed';
    case 'collection_shared':
      return 'Collection shared with you';
    case 'collection_access_removed':
      return 'Collection access removed';
    default:
      return 'Activity update';
  }
}

export function NotificationList({
  error,
  isLoading,
  markAllRead,
  markRead,
  notifications,
  unreadCount,
}: NotificationListProps) {
  const colors = useThemeColors();

  if (isLoading) {
    return <LoadingState label="Loading notifications" />;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' }}>
        <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
          {unreadCount} unread
        </Text>
        <AppButton disabled={unreadCount === 0} onPress={markAllRead} variant="secondary">
          Mark all read
        </AppButton>
      </View>
      {error ? (
        <Text selectable style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      {notifications.length === 0 ? <EmptyState message="Collaboration updates will show here." title="No notifications" /> : null}
      {notifications.map((notification) => (
        <AppCard key={notification.id}>
          <View style={{ gap: spacing.sm }}>
            <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
              {getNotificationTitle(notification)}
            </Text>
            <Text selectable style={{ color: colors.mutedText }}>
              {new Date(notification.createdAt).toLocaleString()}
            </Text>
            <Text selectable style={{ color: notification.readAt ? colors.mutedText : colors.primary, fontWeight: '700' }}>
              {notification.readAt ? 'Read' : 'Unread'}
            </Text>
          </View>
          {!notification.readAt ? (
            <AppButton onPress={() => markRead(notification.id)} variant="ghost">
              Mark read
            </AppButton>
          ) : null}
        </AppCard>
      ))}
    </View>
  );
}
