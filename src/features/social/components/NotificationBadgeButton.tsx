import { Link } from 'expo-router';

import { AppButton } from '@/components/ui/AppButton';
import { useNotifications } from '@/features/social/useSocial';

export function NotificationBadgeButton() {
  const { unreadCount } = useNotifications();
  const label = unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications';

  return (
    <Link href={'/notifications' as never} asChild>
      <AppButton variant={unreadCount > 0 ? 'primary' : 'secondary'}>{label}</AppButton>
    </Link>
  );
}
