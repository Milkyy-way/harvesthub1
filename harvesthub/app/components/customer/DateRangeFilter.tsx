import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../constants/theme';
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

// One row of filter chips above the content (Dashboard/Orders) — rolling
// windows (see app/orders/service.py's _RANGE_WINDOWS), not calendar periods.
export function DateRangeFilter({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content} style={styles.scroll}>
      {OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable key={opt.key} style={[styles.pill, active && styles.pillActive]} onPress={() => onChange(opt.key)}>
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleeds to the screen edges so chips scroll under the page gutters.
  scroll: { marginHorizontal: -spacing.lg },
  content: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 4 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  pillActive: { backgroundColor: colors.primary },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  labelActive: { color: colors.white },
});
