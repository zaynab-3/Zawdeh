import * as WebBrowser from 'expo-web-browser';

import { authRedirectUrl, isSupabaseConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

type GoogleSignInResult = {
  error?: string;
};

function extractOAuthParams(url: string) {
  const [, fragment = ''] = url.split('#');
  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const params = new URLSearchParams(query);

  new URLSearchParams(fragment).forEach((value, key) => {
    params.set(key, value);
  });

  return {
    accessToken: params.get('access_token'),
    code: params.get('code'),
    error: params.get('error_description') ?? params.get('error'),
    refreshToken: params.get('refresh_token'),
  };
}

export async function startGoogleSignIn(): Promise<GoogleSignInResult> {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase is not configured yet.' };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authRedirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return { error: 'Could not start Google sign-in.' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUrl);

    if (result.type !== 'success') {
      return {};
    }

    const params = extractOAuthParams(result.url);

    if (params.error) {
      return { error: 'Google sign-in was not completed.' };
    }

    if (params.accessToken && params.refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });

      return sessionError ? { error: 'Could not save your sign-in session.' } : {};
    }

    if (params.code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
      return exchangeError ? { error: 'Could not complete Google sign-in.' } : {};
    }

    return { error: 'Google sign-in returned without a session.' };
  } catch {
    return { error: 'Google sign-in is unavailable right now.' };
  }
}
