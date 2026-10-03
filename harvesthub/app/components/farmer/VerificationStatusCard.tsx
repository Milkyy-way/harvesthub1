import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import type { ProfileStatus } from '../../types/database';

type Props = {
  status: ProfileStatus | undefined;
  farmName: string;
  reviewerNotes: string | null | undefined;
  submittedAt: string | null | undefined;
  // Shown only for a rejected application — opens the application to fix and resubmit.
  onResubmit?: () => void;
};

type Tone = { icon: React.ComponentProps<typeof MaterialIcons>['name']; color: string; title: string };

function toneFor(status: ProfileStatus | undefined): Tone {
  switch (status) {
    case 'active':
      return { icon: 'verified', color: colors.primary, title: 'Approved' };
    case 'rejected':
      return { icon: 'error-outline', color: colors.danger, title: 'Application not approved' };
    case 'suspended':
      return { icon: 'block', color: colors.danger, title: 'Account suspended' };
    default:
      return { icon: 'hourglass-top', color: colors.accent, title: 'Application under review' };
  }
}

// The farmer's verification state in one card — the Home tab's lead card
// and the Account tab's "Application" section. profiles.status is the
// source of truth (0004's trigger keeps it in sync with
// farmer_verification.status, and an admin can suspend directly on it).
export function VerificationStatusCard({ status, farmName, reviewerNotes, submittedAt, onResubmit }: Props) {
  const tone = toneFor(status);
  const notes = reviewerNotes?.trim();
  const submittedLabel = submittedAt ? new Date(submittedAt).toLocaleDateString() : null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${tone.color}1A` }]}>
          <MaterialIcons name={tone.icon} size={20} color={tone.color} />
        </View>
        <Text style={styles.title}>{tone.title}</Text>
      </View>

      {status === 'active' ? (
        <Text style={styles.body}>{farmName} is approved on HarvestHub.</Text>
      ) : status === 'rejected' ? (
        <>
          <Text style={styles.body}>
            We couldn&apos;t approve {farmName} yet. Fix what the reviewer flagged, then resubmit — no need to start over.
          </Text>
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Reviewer notes</Text>
            <Text style={styles.notesText}>{notes || 'No notes were left. Contact HarvestHub for details.'}</Text>
          </View>
          {onResubmit ? (
            <Pressable style={styles.button} onPress={onResubmit}>
              <Text style={styles.buttonText}>Update & resubmit</Text>
            </Pressable>
          ) : null}
        </>
      ) : status === 'suspended' ? (
        <Text style={styles.body}>Your farmer account is suspended. Contact HarvestHub support for details.</Text>
      ) : (
        <Text style={styles.body}>
          We&apos;re reviewing {farmName}&apos;s details and documents. This usually takes a few business days.
          {submittedLabel ? ` Submitted ${submittedLabel}.` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  iconWrap: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.headline, fontSize: 18, color: colors.text },
  body: { fontSize: 13.5, lineHeight: 20, color: colors.textMuted },
  notesBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  notesLabel: { fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { fontSize: 13.5, lineHeight: 20, color: colors.text },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
