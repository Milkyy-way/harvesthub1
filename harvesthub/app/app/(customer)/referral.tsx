import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, fonts } from '../../constants/theme';

// There is no referral program in the backend yet — no codes, no tracking,
// no reward mechanics. This screen is an honest placeholder rather than a
// fake link that would look real but do nothing when shared.
export default function ReferralScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Referral Link</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="card-giftcard" size={28} color={colors.accent} />
        </View>
        <Text style={styles.title}>Coming soon</Text>
        <Text style={styles.body}>
          Referral links aren&apos;t set up yet — we need to decide how invites are tracked and what a referral actually earns
          before this becomes a real, shareable link.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FBF1DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.headline, fontSize: 18, color: colors.text, marginBottom: spacing.xs },
  body: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, maxWidth: 280 },
});
