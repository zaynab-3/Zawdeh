import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/features/auth/useAuth';
import { authRedirectUrl, getMissingClientEnvVars } from '@/lib/env';
import { fontSize, spacing, useThemeColors } from '@/lib/theme';

export default function AuthScreen() {
  const colors = useThemeColors();
  const { authError, isConfigured, isLoading, signInWithGoogle, signOut, user } = useAuth();
  const missingEnv = getMissingClientEnvVars();

  return (
    <Screen subtitle="Use Google through Supabase Auth. No Google secret is stored in the app." title="Sign in">
      {isLoading ? <LoadingState label="Checking session" /> : null}

      <AppCard>
        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
            {user ? 'Signed in' : 'Continue with Google'}
          </Text>
          <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md, lineHeight: 22 }}>
            {user?.email ?? 'Sign in to sync recipes, pantry, shopping, and meal plans.'}
          </Text>
        </View>

        {user ? (
          <AppButton onPress={signOut} variant="secondary">
            Sign out
          </AppButton>
        ) : (
          <AppButton disabled={!isConfigured || isLoading} onPress={signInWithGoogle}>
            Continue with Google
          </AppButton>
        )}
      </AppCard>

      {!isConfigured ? (
        <AppCard>
          <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
            Missing environment values
          </Text>
          <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md, lineHeight: 22 }}>
            {missingEnv.join(', ')}
          </Text>
        </AppCard>
      ) : null}

      {authError ? (
        <Text selectable style={{ color: colors.danger, fontSize: fontSize.md }}>
          {authError}
        </Text>
      ) : null}

      <AppCard>
        <Text selectable style={{ color: colors.text, fontSize: fontSize.md, fontWeight: '800' }}>
          Redirect URL
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontSize: fontSize.md }}>
          {authRedirectUrl}
        </Text>
      </AppCard>
    </Screen>
  );
}
