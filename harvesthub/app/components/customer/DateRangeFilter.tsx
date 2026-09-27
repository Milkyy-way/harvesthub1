import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';
import type { DashboardRangeKey } from '../../types/dashboard';

const OPTIONS: { key: DashboardRangeKey; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '3m', label: 'Last 3 Months' },
  { key: '6m', label: 'Last 6 Months' },
  { key: 'all', label: 'All Time' },
];

type Props = {
  value: DashboardRangeKey;
  onChange: (key: DashboardRangeKey) => void;
};

// Sits in HeroShell's bottom slot on Dashboard/Orders in place of a search
// bar — rolling windows (see app/orders/service.py's _RANGE_WINDOWS), not
// calendar periods.
export function DateRangeFilter({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  label: { fontSize: 12.5, fontWeight: '600', color: 'rgba(246,242,231,0.85)' },
  labelActive: { color: colors.primaryDark, fontWeight: '700' },
});
