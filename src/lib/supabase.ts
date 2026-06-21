import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { createClient, processLock, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';

import { env, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/types/database';

let supabaseClient: SupabaseClient<Database> | null = null;
let autoRefreshRegistered = false;

const isWeb = process.env.EXPO_OS === 'web';
const canUseDevelopmentFallback = process.env.NODE_ENV !== 'production';

function hasSecureStoreMethods() {
  return (
    !isWeb &&
    typeof SecureStore.getItemAsync === 'function' &&
    typeof SecureStore.setItemAsync === 'function' &&
    typeof SecureStore.deleteItemAsync === 'function'
  );
}

async function getFallbackItem(key: string) {
  if (isWeb || canUseDevelopmentFallback) {
    return AsyncStorage.getItem(key);
  }

  throw new Error('SecureStore is unavailable.');
}

async function setFallbackItem(key: string, value: string) {
  if (isWeb || canUseDevelopmentFallback) {
    await AsyncStorage.setItem(key, value);
    return;
  }

  throw new Error('SecureStore is unavailable.');
}

async function removeFallbackItem(key: string) {
  if (isWeb || canUseDevelopmentFallback) {
    await AsyncStorage.removeItem(key);
    return;
  }

  throw new Error('SecureStore is unavailable.');
}

const secureStoreAdapter: SupportedStorage = {
  getItem: async (key) => {
    try {
      if (!hasSecureStoreMethods()) {
        return await getFallbackItem(key);
      }

      return await SecureStore.getItemAsync(key);
    } catch {
      return getFallbackItem(key);
    }
  },
  removeItem: async (key) => {
    try {
      if (!hasSecureStoreMethods()) {
        await removeFallbackItem(key);
        return;
      }

      await SecureStore.deleteItemAsync(key);
    } catch {
      await removeFallbackItem(key);
    }
  },
  setItem: async (key, value) => {
    try {
      if (!hasSecureStoreMethods()) {
        await setFallbackItem(key, value);
        return;
      }

      await SecureStore.setItemAsync(key, value);
    } catch {
      await setFallbackItem(key, value);
    }
  },
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
