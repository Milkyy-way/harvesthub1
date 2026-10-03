import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import { formatDay, formatMoney } from '../../lib/format';
import type { FarmerEarnings } from '../../types/farmer';

type Props = {
  earnings: FarmerEarnings | null; // null while loading
  onPress: () => void;
};

// The farmer Home tab's earnings summary (Farmer F4): this week's earnings,
// what the payout stands at, and when it's prepared — tap for the full
// Earnings screen.
export function EarningsCard({ earnings, onPress }: Props) {
  const week = earnings?.open_periods.find((p) => p.is_current_week);
  const net = week?.breakdown.net ?? 0;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Earned this week</Text>
        <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
      </View>

      {!earnings || !week ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <>
          <Text style={styles.amount}>{formatMoney(week.breakdown.earnings)}</Text>
          <Text style={styles.sub}>
            {net < 0
              ? `You owe ${formatMoney(-net)} this week from cash orders — it comes off your next payout.`
              : `Payout so far ${formatMoney(net)} · prepared ${formatDay(week.payout_prepared_on)}`}
          </Text>

          <View style={styles.statsRow}>
            <Stat label="Waiting to be paid" value={formatMoney(earnings.awaiting_payout)} />
            <Stat
              label={earnings.in_progress.order_count === 1 ? '1 order in progress' : `${earnings.in_progress.order_count} orders in progress`}
              value={`~${formatMoney(earnings.in_progress.estimated_earnings)}`}
            />
          </View>
        </>
      )}
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
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
  pressed: { opacity: 0.8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  loading: { marginVertical: spacing.lg },
  amount: { fontFamily: fonts.headlineBold, fontSize: 34, color: colors.text, marginTop: 2 },
  sub: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
