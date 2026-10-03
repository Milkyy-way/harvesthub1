import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getVerificationDocumentUrl } from '../../lib/storage';
import { VERIFICATION_DOCUMENTS } from '../../lib/verificationDocuments';
import { CERTIFICATION_TYPE_OPTIONS } from '../../lib/validation/schemas';
import { formatDay } from '../../lib/format';
import { SUPPORT_EMAIL } from '../../constants/support';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import type { FarmerCertification } from '../../types/database';

const INSURANCE_WARNING_DAYS = 30;

// Farmer F5 — read-only view of what's on file: certifications (shown as
// badges on the farm page once approved) and the verification documents
// from the application, each viewable through a short-lived private link.
// Nothing is edited here: an approved farmer adds a certification or
// replaces a document through HarvestHub (a new badge is public, so it
// shouldn't skip review); a rejected farmer uses the application instead.
export default function DocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile, farmerProfile, farmerVerification } = useAuth();
  const [certs, setCerts] = useState<FarmerCertification[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const userId = session?.user.id;
  const rejected = profile?.status === 'rejected';

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('farmer_certifications')
      .select('*')
      .eq('farmer_id', userId)
      .order('created_at')
      .then(({ data, error }) => {
        if (error) console.warn('Could not load certifications:', error.message);
        setCerts((data ?? []) as FarmerCertification[]);
      });
  }, [userId]);

  const openDocument = async (path: string) => {
    setOpening(path);
    try {
      await WebBrowser.openBrowserAsync(await getVerificationDocumentUrl(path));
    } catch (err) {
      console.warn('Could not open document:', err);
      Alert.alert('Could not open document', 'Please try again.');
    } finally {
      setOpening(null);
    }
  };

  const insurance = insuranceStatus(farmerVerification?.insurance_expiration_date ?? null);
  const taxId = farmerProfile?.tax_id;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Certifications & documents</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Certifications</Text>
          <Text style={styles.caption}>
            {profile?.status === 'active' ? 'Shown as badges on your farm page.' : 'Shown as badges on your farm page once you’re approved.'}
          </Text>
          {certs === null ? (
            <ActivityIndicator color={colors.primary} />
          ) : certs.length === 0 ? (
            <Text style={styles.muted}>No certifications on file.</Text>
          ) : (
            certs.map((cert) => (
              <DocRow
                key={cert.id}
                icon="workspace-premium"
                title={cert.cert_name}
                detail={CERTIFICATION_TYPE_OPTIONS.find((o) => o.value === cert.cert_type)?.label ?? cert.cert_type}
                path={cert.file_path}
                opening={opening === cert.file_path}
                onOpen={openDocument}
              />
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verification documents</Text>
          <Text style={styles.caption}>From your application. Only you and HarvestHub can see these.</Text>
          {VERIFICATION_DOCUMENTS.map((doc) => {
            const path = farmerVerification?.[doc.column] ?? null;
            const detail =
              doc.key === 'businessLicense' && farmerVerification?.business_license_number
                ? `License #${farmerVerification.business_license_number}`
                : doc.key === 'insurance' && insurance
                  ? insurance.label
                  : path
                    ? 'On file'
                    : doc.required
                      ? 'Missing'
                      : 'Not provided';
            return (
              <DocRow
                key={doc.key}
                icon="description"
                title={doc.label}
                detail={detail}
                detailColor={doc.key === 'insurance' && insurance ? insurance.color : undefined}
                path={path}
                opening={opening === path}
                onOpen={openDocument}
              />
            );
          })}
          {taxId ? <DocRow icon="badge" title="Tax ID / EIN" detail={`ending in ${taxId.replace(/\D/g, '').slice(-4)}`} path={null} onOpen={openDocument} /> : null}
        </View>

        {rejected ? (
          <Pressable style={styles.primaryButton} onPress={() => router.push('/(farmer)/application')}>
            <Text style={styles.primaryText}>Update & resubmit your application</Text>
          </Pressable>
        ) : (
          <View style={styles.card}>
            <Text style={styles.muted}>
              Got a new certification, or need to update a document (like renewed insurance)? Send it to HarvestHub and
              we&apos;ll review it.
            </Text>
            <Pressable style={styles.linkRow} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Farm documents update`)}>
              <MaterialIcons name="mail-outline" size={16} color={colors.primary} />
              <Text style={styles.linkText}>{SUPPORT_EMAIL}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function insuranceStatus(expiresOn: string | null): { label: string; color: string } | null {
  if (!expiresOn) return null;
  const [y, m, d] = expiresOn.split('-').map(Number);
  const expiry = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: `Expired ${formatDay(expiresOn)} — please send renewed insurance`, color: colors.danger };
  if (days <= INSURANCE_WARNING_DAYS) return { label: `Expires ${formatDay(expiresOn)} (in ${days} day${days === 1 ? '' : 's'})`, color: colors.accent };
  return { label: `Valid until ${formatDay(expiresOn)}`, color: colors.textMuted };
}

function DocRow({
  icon,
  title,
  detail,
  detailColor,
  path,
  opening,
  onOpen,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  detail: string;
  detailColor?: string;
  path: string | null;
  opening?: boolean;
  onOpen: (path: string) => void;
}) {
  return (
    <View style={styles.docRow}>
      <MaterialIcons name={icon} size={18} color={path ? colors.primary : colors.textMuted} />
      <View style={styles.flex1}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={[styles.docDetail, detailColor ? { color: detailColor } : null]}>{detail}</Text>
      </View>
      {path ? (
        <Pressable onPress={() => onOpen(path)} hitSlop={8} disabled={opening}>
          {opening ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.viewText}>View</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  card: {
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
  cardTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.text, marginBottom: 2 },
  caption: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginBottom: spacing.sm },
  muted: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  docTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  docDetail: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  viewText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 13.5 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
