import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';

import { startGoogleSignIn } from '@/features/auth/googleSignIn';
import { ensureProfile, getProfileSetupErrorMessage } from '@/features/auth/profileApi';
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
  const [profileError, setProfileError] = React.useState<string | null>(null);
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
        if (!data.session) {
          setProfileError(null);
        }
      })
      .finally(() => setIsLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfileError(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [configured]);

  React.useEffect(() => {
    if (!configured || !session?.user) {
      return undefined;
    }

    let isMounted = true;

    ensureProfile(session.user)
      .then(() => {
        if (isMounted) {
          setProfileError(null);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setProfileError(getProfileSetupErrorMessage(error));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [configured, session?.user]);

  const signInWithGoogle = React.useCallback(async () => {
    setAuthError(null);
    setProfileError(null);
    const result = await startGoogleSignIn();

    if (result.error) {
      setAuthError(result.error);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    setAuthError(null);
    setProfileError(null);

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
      authError: authError ?? profileError,
      isConfigured: configured,
      isLoading,
      session,
      signInWithGoogle,
      signOut,
      user: session?.user ?? null,
    }),
    [authError, configured, isLoading, profileError, session, signInWithGoogle, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
