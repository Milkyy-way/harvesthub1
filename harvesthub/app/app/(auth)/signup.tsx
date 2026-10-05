import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import { Logo } from '../../components/Logo';

// Just the role choice — a fork, not a list, so the two options sit
// centered side by side rather than stacked like a menu. Whichever is
// picked carries through to app/(auth)/signup-details.tsx, which offers
// BOTH the full email/password form and "Sign up with Google" for that
// same, already-decided role — Google never has to ask again here.
export default function Signup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Logo size={48} />
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>How will you use HarvestHub?</Text>

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push({ pathname: '/(auth)/signup-details', params: { role: 'customer' } })}
        >
          <View style={styles.cardIcon}>
            <MaterialIcons name="shopping-basket" size={28} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Customer</Text>
          <Text style={styles.cardBody}>Browse farms, order fresh produce.</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push({ pathname: '/(auth)/signup-details', params: { role: 'farmer' } })}
        >
          <View style={styles.cardIcon}>
            <MaterialIcons name="agriculture" size={28} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Farmer</Text>
          <Text style={styles.cardBody}>List your farm, sell directly.</Text>
        </Pressable>
      </View>

      <Link href="/(auth)/login" style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Log in</Text>
      </Link>
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
    backgroundColor: colors.tint,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  cardPressed: { opacity: 0.7 },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { fontFamily: fonts.headline, fontSize: 16, color: colors.text, marginBottom: 4 },
  cardBody: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
  link: { marginTop: spacing.xl, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: 13 },
});
