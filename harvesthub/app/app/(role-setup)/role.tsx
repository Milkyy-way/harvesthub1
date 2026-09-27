import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import { Logo } from '../../components/Logo';

// The fallback path: reached when a session exists with no role chosen
// yet and nothing already told us which one (e.g. resuming a Google
// signup that was abandoned before a role was picked, or logging back in
// with Google on an account stuck at this same point). When the role IS
// already known — picking a role on the Sign Up screen, then choosing
// Google there — app/(auth)/signup-details.tsx skips straight to
// app/(role-setup)/details.tsx and this screen is never shown.
export default function RoleSetupRole() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Logo size={48} />
      <Text style={styles.title}>One more thing</Text>
      <Text style={styles.subtitle}>How will you use HarvestHub?</Text>

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push({ pathname: '/(role-setup)/details', params: { role: 'customer' } })}
        >
          <View style={styles.cardIcon}>
            <MaterialIcons name="shopping-basket" size={28} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Customer</Text>
          <Text style={styles.cardBody}>Browse farms, order fresh produce.</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push({ pathname: '/(role-setup)/details', params: { role: 'farmer' } })}
        >
          <View style={styles.cardIcon}>
            <MaterialIcons name="agriculture" size={28} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Farmer</Text>
          <Text style={styles.cardBody}>List your farm, sell directly.</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.headlineBold, fontSize: 24, color: colors.text, marginTop: spacing.xl },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl + spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  cardPressed: { opacity: 0.7 },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: '#EAF2EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { fontFamily: fonts.headline, fontSize: 16, color: colors.text, marginBottom: 4 },
  cardBody: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
});
