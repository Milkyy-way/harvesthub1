import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fonts } from '../../constants/theme';
import { TextField } from '../../components/TextField';
import { TagSelector } from '../../components/TagSelector';
import { DIETARY_PREFERENCE_OPTIONS, PRODUCE_INTEREST_OPTIONS } from '../../lib/validation/schemas';
import type { DietaryPreference, ProduceInterest } from '../../types/database';

// Only ever reached with a session that already has an identity (Google
// gave us name/email) but no role — this asks for whatever's still
// missing instead of repeating the full signup form. Submits through
// complete_profile_setup() (see supabase/migrations/0018_...), the one
// place allowed to set role/status directly.
export default function RoleSetupDetails() {
  const { role } = useLocalSearchParams<{ role: 'customer' | 'farmer' }>();
  const { profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreference[]>([]);
  const [produceInterests, setProduceInterests] = useState<ProduceInterest[]>([]);
  const [farmName, setFarmName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFarmer = role === 'farmer';

  const handleSubmit = async () => {
    if (loading) return; // already submitting — a second tap while it's in flight must not fire this twice
    setError(null);
    if (!fullName.trim() || !phone.trim()) {
      setError('Enter your name and phone number.');
      return;
    }
    if (!isFarmer && (!addressStreet.trim() || !addressCity.trim() || !addressState.trim() || !addressZip.trim())) {
      setError('Enter your full delivery/pickup address.');
      return;
    }
    if (isFarmer && !farmName.trim()) {
      setError('Enter your farm or business name.');
      return;
    }

    setLoading(true);
    const { error: rpcError } = await supabase.rpc('complete_profile_setup', {
      p_role: role,
      p_full_name: fullName.trim(),
      p_phone: phone.trim(),
      p_address_street: isFarmer ? null : addressStreet.trim(),
      p_address_city: isFarmer ? null : addressCity.trim(),
      p_address_state: isFarmer ? null : addressState.trim(),
      p_address_zip: isFarmer ? null : addressZip.trim(),
      p_dietary_preferences: isFarmer ? [] : dietaryPreferences,
      p_produce_interests: isFarmer ? [] : produceInterests,
      p_farm_name: isFarmer ? farmName.trim() : null,
    });

    if (rpcError) {
      setLoading(false);
      setError(rpcError.message);
      return;
    }
    // Deliberately NOT resetting loading on success — this screen doesn't
    // navigate itself, it waits for RootLayout's redirect effect to react
    // to the profile update below and move on. Re-enabling the button in
    // that gap is exactly what let a second, redundant tap through last
    // time (which then correctly — but confusingly — said "already set
    // up," since the first tap had already succeeded).
    await refreshProfile();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{isFarmer ? 'Your farm details' : 'Your delivery details'}</Text>
        <Text style={styles.subtitle}>
          {isFarmer
            ? "Just enough to start your application — you'll add farm photos and verification documents next."
            : 'So nearby farms show up for you and orders reach the right address.'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextField placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <TextField
          placeholder="Phone number"
          autoComplete="tel"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        {isFarmer ? (
          <TextField placeholder="Farm / business name" value={farmName} onChangeText={setFarmName} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Delivery / pickup address</Text>
            <TextField placeholder="Street address" value={addressStreet} onChangeText={setAddressStreet} />
            <TextField placeholder="City" value={addressCity} onChangeText={setAddressCity} />
            <View style={styles.row}>
              <TextField style={styles.flex1} placeholder="State" value={addressState} onChangeText={setAddressState} />
              <TextField
                style={styles.flex1}
                placeholder="ZIP code"
                keyboardType="number-pad"
                value={addressZip}
                onChangeText={setAddressZip}
              />
            </View>

            <Text style={styles.sectionTitle}>Dietary preferences (optional)</Text>
            <TagSelector options={DIETARY_PREFERENCE_OPTIONS} value={dietaryPreferences} onChange={setDietaryPreferences} />

            <Text style={styles.sectionTitle}>What are you interested in? (optional)</Text>
            <TagSelector options={PRODUCE_INTEREST_OPTIONS} value={produceInterests} onChange={setProduceInterests} />
          </>
        )}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Continue</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  title: { fontFamily: fonts.headlineBold, fontSize: 22, color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 13.5, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 19 },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
