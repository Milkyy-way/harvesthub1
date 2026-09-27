import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/theme';

// The Google OAuth redirect (lib/googleAuth.ts's redirectTo) lands here.
// Expo Router's own deep-link handling sees this URL independently of
// (and in addition to) WebBrowser.openAuthSessionAsync's promise, which is
// what actually captures the tokens — without a real route at this path,
// the router has nothing to match and shows "Unmatched Route" instead.
// This screen does no work itself; it just needs to exist, then bounce
// back to "/" so RootLayout's own redirect effect (which by then sees
// whatever session googleAuth.ts just set) takes over as normal.
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/'), 50);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
