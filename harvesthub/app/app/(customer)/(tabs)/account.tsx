import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../lib/apiClient';
import { colors, spacing, radius, fonts } from '../../../constants/theme';
import { DIETARY_PREFERENCE_OPTIONS, PRODUCE_INTEREST_OPTIONS } from '../../../lib/validation/schemas';
import { HeroShell } from '../../../components/customer/HeroShell';
import { StatTile } from '../../../components/customer/StatTile';
import { SettingsRow } from '../../../components/customer/SettingsRow';
import type { DashboardSummary } from '../../../types/dashboard';

export default function CustomerAccount() {
  const { session, profile, customerProfile } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const firstName = profile?.full_name?.trim().split(' ')[0];

  useFocusEffect(
    useCallback(() => {
      apiClient.get<DashboardSummary>('/customers/me/dashboard-summary').then(
        (res) => setSummary(res.data),
        (err) => console.warn('Could not load account stats:', err)
      );
    }, [])
  );

  const dietaryLabels = (customerProfile?.dietary_preferences ?? []).map(
    (value) => DIETARY_PREFERENCE_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
  const produceLabels = (customerProfile?.produce_interests ?? []).map(
    (value) => PRODUCE_INTEREST_OPTIONS.find((o) => o.value === value)?.label ?? value
  );

  const addressLine = customerProfile
    ? [customerProfile.address_street, `${customerProfile.address_city}, ${customerProfile.address_state} ${customerProfile.address_zip}`]
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <HeroShell headline={firstName ? `Hi, ${firstName}` : 'Your Account'} subheadline="Manage your profile, preferences, and orders." />

      <View style={styles.body}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={26} color={colors.white} />
          </View>
          <View style={styles.profileHeaderText}>
            <Text style={styles.name}>{profile?.full_name ?? 'Your account'}</Text>
            <Text style={styles.email}>{session?.user.email}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatTile icon="receipt-long" label="Total Orders" value={summary ? String(summary.orders_total) : '—'} />
          <StatTile icon="cancel" label="Cancelled" value={summary ? String(summary.orders_cancelled) : '—'} />
        </View>

        <SettingsRow icon="help-outline" label="Help" onPress={() => router.push('/(customer)/help')} />
        <SettingsRow icon="settings" label="Settings" onPress={() => router.push('/(customer)/settings')} />

        <Section title="Contact">
          <InfoRow icon="email" label="Email" value={session?.user.email ?? '—'} />
          <InfoRow icon="phone" label="Phone" value={profile?.phone ?? 'Not set'} />
        </Section>

        <Section title="Delivery Address">
          {addressLine.length > 0 ? (
            <InfoRow icon="place" label="Address" value={addressLine.join('\n')} />
          ) : (
            <Text style={styles.emptyText}>No address on file.</Text>
          )}
        </Section>

        <Section title="Dietary Preferences">
          {dietaryLabels.length > 0 ? <ChipRow labels={dietaryLabels} /> : <Text style={styles.emptyText}>None set.</Text>}
        </Section>

        <Section title="Produce Interests">
          {produceLabels.length > 0 ? <ChipRow labels={produceLabels} /> : <Text style={styles.emptyText}>None set.</Text>}
        </Section>

        <Pressable style={styles.logoutButton} onPress={() => supabase.auth.signOut()}>
          <MaterialIcons name="logout" size={16} color={colors.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={18} color={colors.textMuted} />
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ChipRow({ labels }: { labels: string[] }) {
  return (
    <View style={styles.chipRow}>
      {labels.map((label) => (
        <View key={label} style={styles.chip}>
          <Text style={styles.chipText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderText: { flex: 1 },
  name: { fontFamily: fonts.headlineBold, fontSize: 24, color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textMuted },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 4 },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textMuted },
  infoValue: { fontSize: 14, color: colors.text, marginTop: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.sm,
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
});
