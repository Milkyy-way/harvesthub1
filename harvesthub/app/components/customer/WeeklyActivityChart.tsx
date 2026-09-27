import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../constants/theme';
import type { DailyActivity } from '../../types/dashboard';

type Props = {
  data: DailyActivity[];
};

const MAX_BAR_HEIGHT = 90;
const MIN_BAR_HEIGHT = 4;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// A small hand-rolled bar chart — no charting library exists in this project
// yet, and 7 fixed data points don't justify pulling one in (most require a
// native react-native-svg dependency; plain Views are enough here).
export function WeeklyActivityChart({ data }: Props) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Last 7 Days</Text>
      <View style={styles.barsRow}>
        {data.map((day) => {
          const height = day.amount > 0 ? Math.max((day.amount / maxAmount) * MAX_BAR_HEIGHT, MIN_BAR_HEIGHT) : MIN_BAR_HEIGHT;
          const isToday = day.date === todayKey;
          const weekday = WEEKDAY_LABELS[new Date(`${day.date}T00:00:00`).getDay()];
          return (
            <View key={day.date} style={styles.barColumn}>
              {day.amount > 0 ? <Text style={styles.amountLabel}>${Math.round(day.amount)}</Text> : <View style={styles.amountLabelSpacer} />}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height },
                    day.amount === 0 && styles.barEmpty,
                    isToday && styles.barToday,
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{weekday}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barColumn: { alignItems: 'center', flex: 1 },
  amountLabel: { fontSize: 10, fontWeight: '700', color: colors.primaryDark, marginBottom: 4 },
  amountLabelSpacer: { height: 14 },
  barTrack: { height: MAX_BAR_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: 14, borderRadius: radius.sm, backgroundColor: colors.primary },
  barEmpty: { backgroundColor: colors.border },
  barToday: { backgroundColor: colors.accent },
  dayLabel: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  dayLabelToday: { color: colors.accent, fontWeight: '700' },
});
