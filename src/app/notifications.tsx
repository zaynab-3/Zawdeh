import { Screen } from '@/components/layout/Screen';
import { NotificationList } from '@/features/social/components/NotificationList';
import { useNotifications } from '@/features/social/useSocial';

export default function NotificationsScreen() {
  const notifications = useNotifications();

  return (
    <Screen subtitle="Realtime collaboration updates for your account." title="Notifications">
      <NotificationList {...notifications} />
    </Screen>
  );
}
