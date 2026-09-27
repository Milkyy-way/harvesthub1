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
  const { session, profile, farmerVerification, farmerProfile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inRoleSetup = segments[0] === '(role-setup)';
    const inFarmerOnboarding = segments[0] === '(farmer)' && segments[1] === 'onboarding';
    const onPendingReviewScreen = segments[0] === '(farmer)' && segments[1] === 'pending-review';
    const onAddPhotoScreen = segments[0] === '(farmer)' && segments[1] === 'add-photo';

    if (!session && !inAuthGroup) {
      // Not logged in, and trying to view something other than the auth
      // screens — send them back to the welcome/login flow.
      router.replace('/(auth)');
      return;
    }

    if (!session || !profile) return;

    if (!profile.role) {
      // Signed in (password or OAuth) but hasn't picked customer/farmer
      // yet — status is 'pending_role_selection' (see
      // supabase/migrations/0018_oauth_role_selection.sql). This is the
      // one case where a session exists but nothing else does — every
      // other branch below assumes profile.role is set.
      if (!inRoleSetup) router.replace('/(role-setup)/role');
      return;
    }

    if (profile.role === 'farmer' && profile.status !== 'active') {
      // Self-service signup, gated access: a farmer can log in as soon as
      // they confirm their email, but doesn't see the real dashboard until
      // an admin approves them. Route them into whichever part of that gate
      // they belong in — the wizard if they haven't finished it, otherwise
      // the waiting screen — no matter which (farmer)/* route they hit.
      const wizardDone = !!farmerVerification?.submitted_at;
      if (!wizardDone && !inFarmerOnboarding) {
        router.replace('/(farmer)/onboarding');
      } else if (wizardDone && !onPendingReviewScreen) {
        router.replace('/(farmer)/pending-review');
      }
      return;
    }

    if (profile.role === 'farmer' && !farmerProfile?.photo_url) {
      // Approved, but hasn't uploaded the store photo shown on their feed
      // card yet — this only happens once, right after approval, and is
      // separate from the pre-approval onboarding wizard above.
      if (!onAddPhotoScreen) router.replace('/(farmer)/add-photo');
      return;
    }

    if (inAuthGroup || inRoleSetup) {
      // Logged in but still sitting on an auth or role-setup screen (just
      // finished signing up, or just finished picking a role/filling in
      // details) — route into the correct experience for their role. Without
      // the inRoleSetup half of this check, completing role-setup had
      // nothing that ever navigated away from it — the screen would just
      // sit there indefinitely even though the profile update itself had
      // already succeeded.
      router.replace(profile.role === 'farmer' ? '/(farmer)' : '/(customer)/(tabs)');
    } else if (profile.role === 'farmer' && (inFarmerOnboarding || onPendingReviewScreen || onAddPhotoScreen)) {
      // An approved, photo-complete farmer landing back on the wizard/
      // waiting/photo screen by URL — bounce them to the real dashboard.
      router.replace('/(farmer)');
    }
  }, [session, profile, farmerVerification, farmerProfile, loading, segments]);

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
