import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Newsreader_600SemiBold, Newsreader_700Bold } from '@expo-google-fonts/newsreader';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { resolveRedirect } from '../lib/routeGuard';
import { colors } from '../constants/theme';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY. Set it in .env to your Stripe test-mode publishable key (pk_test_...).'
  );
}

// Without this, the MaterialIcons font (used everywhere via IconSymbol /
// direct @expo/vector-icons/MaterialIcons imports — search bar, category
// rail, farmer cards, tab bar) can render as blank/garbled glyphs on the
// very first frame after a cold launch, because the font file hasn't
// finished loading into the native text renderer yet. Holding the splash
// screen until it's ready avoids that flash entirely.
SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { session, profile, farmerVerification, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // Screens that finish a step (signup, role setup, the farmer
    // application) don't navigate themselves — they refresh the profile and
    // this effect moves them on. See lib/routeGuard.ts for the rules.
    const target = resolveRedirect({
      hasSession: !!session,
      profile,
      applicationSubmitted: !!farmerVerification?.submitted_at,
      segments,
    });
    if (target) router.replace(target);
  }, [session, profile, farmerVerification, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...AntDesign.font,
    Newsreader_600SemiBold,
    Newsreader_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <StripeProvider publishableKey={stripePublishableKey!} merchantIdentifier="merchant.com.harvesthub.app">
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </StripeProvider>
  );
}
