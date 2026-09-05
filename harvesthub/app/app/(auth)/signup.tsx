import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';
import type { UserRole } from '../../types/database';
import { customerSignupSchema, farmerAccountSchema, flattenFieldErrors } from '../../lib/validation/schemas';
import { CustomerFields, initialCustomerFormValues, type CustomerFormValues } from '../../components/signup/CustomerFields';
import {
  FarmerAccountFields,
  initialFarmerAccountFormValues,
  type FarmerAccountFormValues,
} from '../../components/signup/FarmerAccountFields';

export default function Signup() {
  const [role, setRole] = useState<UserRole>('customer');
  const [customerValues, setCustomerValues] = useState<CustomerFormValues>(initialCustomerFormValues);
  const [farmerValues, setFarmerValues] = useState<FarmerAccountFormValues>(initialFarmerAccountFormValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const updateCustomer = (patch: Partial<CustomerFormValues>) => setCustomerValues((prev) => ({ ...prev, ...patch }));
  const updateFarmer = (patch: Partial<FarmerAccountFormValues>) => setFarmerValues((prev) => ({ ...prev, ...patch }));

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
      const { error: signUpError } = await supabase.auth.signUp({
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
      setSubmitted(true);
      return;
    }

    // Farmer: this is only account creation (step 1). Farm details and
    // verification documents are collected later, in-app, once the farmer
    // has confirmed their email and logged in — see app/(farmer)/onboarding.
    const result = farmerAccountSchema.safeParse(farmerValues);
    if (!result.success) {
      setFieldErrors(flattenFieldErrors(result.error));
      setError('Fix the highlighted fields and try again.');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
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
    setSubmitted(true);
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Join HarvestHub as a customer or a farmer</Text>

        <View style={styles.roleToggle}>
          <Pressable
            style={[styles.roleOption, role === 'customer' && styles.roleOptionActive]}
            onPress={() => setRole('customer')}
          >
            <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>Customer</Text>
          </Pressable>
          <Pressable
            style={[styles.roleOption, role === 'farmer' && styles.roleOptionActive]}
            onPress={() => setRole('farmer')}
          >
            <Text style={[styles.roleText, role === 'farmer' && styles.roleTextActive]}>Farmer</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {role === 'customer' ? (
          <CustomerFields value={customerValues} onChange={updateCustomer} errors={fieldErrors} />
        ) : (
          <>
            <FarmerAccountFields value={farmerValues} onChange={updateFarmer} errors={fieldErrors} />
            <Text style={styles.farmerNote}>
              After you confirm your email and log in, you&apos;ll complete your farm details and verification
              documents. Your application is reviewed before you get full access.
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
  container: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  farmerNote: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.lg,
  },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  roleOptionActive: { backgroundColor: colors.primary },
  roleText: { color: colors.textMuted, fontWeight: '500', fontSize: 14 },
  roleTextActive: { color: colors.white },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: 13 },
});
