import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/features/auth/useAuth';
import { authRedirectUrl, getMissingClientEnvVars, isSupabaseConfigured } from '@/lib/env';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { signOut, user } = useAuth();
  const missingEnv = getMissingClientEnvVars();

  return (
    <Screen subtitle="Configuration and account state." title="Settings">
      <ThemeToggle />

      <AppCard>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Supabase
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md }}>
          {isSupabaseConfigured() ? 'Client env is configured.' : `Missing: ${missingEnv.join(', ')}`}
        </Text>
      </AppCard>

      <AppCard>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Google redirect
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md }}>
          {authRedirectUrl}
        </Text>
      </AppCard>

      <View style={{ gap: spacing.md }}>
        <Link href="/auth" asChild>
          <AppButton>{user ? 'Account' : 'Sign in'}</AppButton>
        </Link>
        {user ? (
          <AppButton onPress={signOut} variant="secondary">
            Sign out
          </AppButton>
        ) : null}
      </View>
    </Screen>
  );
}
