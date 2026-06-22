import type { User } from '@supabase/supabase-js';

import { isSupabaseConfigured } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';

export async function getAuthenticatedUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await getSupabase().auth.getUser();

    if (error) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
