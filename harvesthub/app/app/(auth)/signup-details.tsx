import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import type { UserRole } from '../../types/database';
import { customerSignupSchema, farmerAccountSchema, flattenFieldErrors } from '../../lib/validation/schemas';
import { CustomerFields, initialCustomerFormValues, type CustomerFormValues } from '../../components/signup/CustomerFields';
import {
  FarmerAccountFields,
  initialFarmerAccountFormValues,
  type FarmerAccountFormValues,
} from '../../components/signup/FarmerAccountFields';

// Step 2 of 2 — role came from app/(auth)/signup.tsx. This is the exact
// same form/submission logic that used to live behind a role toggle on
// one page; only the entry point changed.
export default function SignupDetails() {
  const { role } = useLocalSearchParams<{ role: UserRole }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [customerValues, setCustomerValues] = useState<CustomerFormValues>(initialCustomerFormValues);
  const [farmerValues, setFarmerValues] = useState<FarmerAccountFormValues>(initialFarmerAccountFormValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const updateCustomer = (patch: Partial<CustomerFormValues>) => setCustomerValues((prev) => ({ ...prev, ...patch }));
  const updateFarmer = (patch: Partial<FarmerAccountFormValues>) => setFarmerValues((prev) => ({ ...prev, ...patch }));

  const handleGoogleSignUp = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const session = await signInWithGoogle();
      if (!session) return; // cancelled the Google sheet

      // Google sign-up is customer-only (farmers use email/password — see
      // 0022). Go straight to the customer details form, but only if this
      // account genuinely doesn't have a role yet: an existing account
      // (this email already signed up before) keeps its real role.
      const { data: profileRow } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (profileRow && !profileRow.role) {
        router.replace('/(role-setup)/details');
      }
      // else: either already fully set up, or somehow already has this
      // role's row started — RootLayout's own redirect effect (which
      // reacts to the session/profile change from signInWithGoogle
      // itself) sends them wherever they actually belong.
    } catch (err: any) {
      console.warn('Could not sign up with Google:', err);
      setError(err?.message ?? 'Could not sign up with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignup = async () => {
    setError(null);
    setFieldErrors({});

    if (role === 'customer') {
      const result = customerSignupSchema.safeParse({
        ...customerValues,
        referralSource: customerValues.referralSource[0],
      });
      if (!result.success) {
        setFieldErrors(flattenFieldErrors(result.error));
        setError('Fix the highlighted fields and try again.');
        return;
      }

      setLoading(true);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: result.data.email.toLowerCase(),
        password: result.data.password,
        options: {
          data: {
            role: 'customer',
            full_name: result.data.fullName,
            phone: result.data.phone,
            address_street: result.data.addressStreet,
            address_city: result.data.addressCity,
            address_state: result.data.addressState,
            address_zip: result.data.addressZip,
            dietary_preferences: result.data.dietaryPreferences,
            produce_interests: result.data.produceInterests,
            referral_source: result.data.referralSource ?? null,
            referral_source_other: result.data.referralSourceOther ?? null,
          },
        },
      });
      setLoading(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      // With email confirmation off, signUp signs them straight in and the
      // root layout's route guard takes over — only show "check your email"
      // when there's no session yet.
      if (!signUpData.session) setSubmitted(true);
      return;
    }

    // Farmer: this is only account creation. Farm details and verification
    // documents are collected next, in-app (app/(farmer)/application.tsx) —
    // uploads need the logged-in session.
    const result = farmerAccountSchema.safeParse(farmerValues);
    if (!result.success) {
      setFieldErrors(flattenFieldErrors(result.error));
      setError('Fix the highlighted fields and try again.');
      return;
    }

    setLoading(true);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: result.data.email.toLowerCase(),
      password: result.data.password,
      options: {
        data: {
          role: 'farmer',
          full_name: result.data.ownerFullName,
          phone: result.data.phone,
          farm_name: result.data.farmName,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!signUpData.session) setSubmitted(true);
  };

  if (submitted) {
    const email = role === 'customer' ? customerValues.email : farmerValues.email;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to {email.trim()}. Confirm it, then come back and log in
          {role === 'farmer' ? ' to finish your farm application.' : '.'}
        </Text>
        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Back to log in</Text>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.title}>{role === 'farmer' ? 'Farm account details' : 'Your account details'}</Text>
        <Text style={styles.subtitle}>
          {role === 'farmer' ? 'Step 2 of 2 — farmer account' : 'Step 2 of 2 — customer account'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {error && /already (been )?registered/i.test(error) ? (
          // Supabase's "User already registered" — offer the way back in
          // instead of a dead end.
          <Pressable
            style={styles.resetHint}
            onPress={() =>
              router.push({
                pathname: '/(auth)/forgot-password',
                params: { email: (role === 'customer' ? customerValues.email : farmerValues.email).trim() },
              })
            }
          >
            <Text style={styles.resetHintText}>Forgot your password? Reset it</Text>
          </Pressable>
        ) : null}

        {role === 'customer' ? (
          <>
            <Pressable style={styles.googleButton} onPress={handleGoogleSignUp} disabled={googleLoading}>
              {googleLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <AntDesign name="google" size={17} color={colors.text} />
                  <Text style={styles.googleButtonText}>Sign up with Google</Text>
                </>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or fill in manually</Text>
              <View style={styles.dividerLine} />
            </View>

            <CustomerFields value={customerValues} onChange={updateCustomer} errors={fieldErrors} />
          </>
        ) : (
          <>
            <FarmerAccountFields value={farmerValues} onChange={updateFarmer} errors={fieldErrors} />
            <Text style={styles.farmerNote}>
              Next, you&apos;ll add your farm details and verification documents. You can explore the farmer app
              while HarvestHub reviews your application — products and orders unlock once you&apos;re approved.
            </Text>
          </>
        )}

        <Pressable style={styles.button} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Sign up</Text>}
        </Pressable>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm, marginBottom: spacing.sm },
  title: { fontFamily: fonts.headlineBold, fontSize: 22, color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xl },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  farmerNote: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 17 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  googleButtonText: { color: colors.text, fontWeight: '600', fontSize: 13.5 },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: 13 },
  resetHint: { marginTop: -spacing.sm, marginBottom: spacing.md },
  resetHintText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
