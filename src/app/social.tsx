import { Screen } from '@/components/layout/Screen';
import { ProfileEditor } from '@/features/social/components/ProfileEditor';
import { UserSearchPanel } from '@/features/social/components/UserSearchPanel';

export default function SocialScreen() {
  return (
    <Screen subtitle="Search profiles, follow cooks, and prepare recipe sharing." title="Social">
      <ProfileEditor />
      <UserSearchPanel />
    </Screen>
  );
}
