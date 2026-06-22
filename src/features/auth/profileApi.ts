import type { User } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase';
import { getSafeDataErrorMessage, throwIfDatabaseNotReady } from '@/lib/supabaseStatus';

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getFallbackDisplayName(user: User) {
  const emailName = user.email?.split('@')[0]?.trim();
  return emailName || null;
}

export async function ensureProfile(user: User) {
  const supabase = getSupabase();
  const metadata = user.user_metadata as Record<string, unknown>;
  const displayName = readMetadataString(metadata, ['full_name', 'name', 'display_name']) ?? getFallbackDisplayName(user);
  const avatarUrl = readMetadataString(metadata, ['avatar_url', 'picture']);

  const { data, error } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();

  if (error) {
    throwIfDatabaseNotReady(error);
    throw new Error('Profile lookup failed');
  }

  if (data) {
    return;
  }

  const { error: insertError } = await supabase.from('profiles').insert({
    avatar_url: avatarUrl,
    display_name: displayName,
    id: user.id,
    preferred_language: 'en',
    theme: 'system',
    user_id: user.id,
  });

  if (insertError) {
    throwIfDatabaseNotReady(insertError);
    throw new Error('Profile setup failed');
  }
}

export function getProfileSetupErrorMessage(error: unknown) {
  return getSafeDataErrorMessage(error, 'Profile setup will retry after database sync is ready.');
}
