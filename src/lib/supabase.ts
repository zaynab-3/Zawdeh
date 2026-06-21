import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { createClient, processLock, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';

import { env, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

let supabaseClient: SupabaseClient<Database> | null = null;
let autoRefreshRegistered = false;

const secureStoreAdapter: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
};

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client environment variables are missing.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
        lock: processLock,
        persistSession: true,
        storage: secureStoreAdapter,
      },
    });
  }

  if (!autoRefreshRegistered && process.env.EXPO_OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (!supabaseClient) {
        return;
      }

      if (state === 'active') {
        supabaseClient.auth.startAutoRefresh();
      } else {
        supabaseClient.auth.stopAutoRefresh();
      }
    });
    autoRefreshRegistered = true;
  }

  return supabaseClient;
}
