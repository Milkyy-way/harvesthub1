import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// Session tokens are stored with expo-secure-store, which uses the device's
// Keychain (iOS) / Keystore (Android) rather than plain storage. This is the
// main reason we don't just use AsyncStorage for auth.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env, fill in your project URL and anon key, and restart the dev server.'
  );
}

// This is the "anon" key — it is safe to ship inside the app because every
// table it can touch is protected by row-level security policies. The
// service_role key (which bypasses RLS) must never go in this project.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase's token auto-refresh only runs while something is actively
// listening. Tying it to app foreground/background state avoids silently
// burning refresh cycles while the app is backgrounded, and makes sure a
// session that expired overnight refreshes as soon as the user reopens it.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
