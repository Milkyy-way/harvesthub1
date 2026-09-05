import { View, Text, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';

export default function PendingReview() {
  const { profile, farmerVerification, refreshProfile } = useAuth();

  const rejected = profile?.status === 'rejected';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{rejected ? 'Application not approved' : "You're all set — for now"}</Text>
      <Text style={styles.subtitle}>
        {rejected
          ? "We weren't able to approve your farm application."
          : "Thanks for applying! We're reviewing your farm details and documents."}
      </Text>
      {rejected && farmerVerification?.reviewer_notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Reviewer notes</Text>
          <Text style={styles.notesText}>{farmerVerification.reviewer_notes}</Text>
        </View>
      ) : (
        <Text style={styles.note}>
          This usually takes a few business days. You&apos;ll get full access to your farmer dashboard as soon as
          you&apos;re approved — no need to do anything else in the meantime.
        </Text>
      )}
      <Pressable style={styles.refreshButton} onPress={() => refreshProfile()}>
        <Text style={styles.refreshButtonText}>Check status</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md, textAlign: 'center' },
  note: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  notesBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    alignSelf: 'stretch',
  },
  notesLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  notesText: { fontSize: 13, color: colors.textMuted },
  refreshButton: { paddingVertical: 10, paddingHorizontal: 20, marginBottom: spacing.md },
  refreshButtonText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  button: { borderWidth: 1, borderColor: colors.text, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: colors.text, fontWeight: '600' },
});
