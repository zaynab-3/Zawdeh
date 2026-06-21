import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';

import { startGoogleSignIn } from '@/features/auth/googleSignIn';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  authError: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  user: User | null;
};

export const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const configured = isSupabaseConfigured();
  const [isLoading, setIsLoading] = React.useState(configured);

  React.useEffect(() => {
    if (!configured) {
      return undefined;
    }

    const supabase = getSupabase();

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setAuthError('Could not restore your session.');
          return;
        }

        setSession(data.session);
      })
      .finally(() => setIsLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, [configured]);

  const signInWithGoogle = React.useCallback(async () => {
    setAuthError(null);
    const result = await startGoogleSignIn();

    if (result.error) {
      setAuthError(result.error);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    setAuthError(null);

    if (!configured) {
      setSession(null);
      return;
    }

    const { error } = await getSupabase().auth.signOut();
    if (error) {
      setAuthError('Could not sign out.');
    }
  }, [configured]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      authError,
      isConfigured: configured,
      isLoading,
      session,
      signInWithGoogle,
      signOut,
      user: session?.user ?? null,
    }),
    [authError, configured, isLoading, session, signInWithGoogle, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
