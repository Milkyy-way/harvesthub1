import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/theme';
import type { DailyActivity } from '../../types/dashboard';

type Props = {
  data: DailyActivity[];
};

const MAX_BAR_HEIGHT = 96;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Spending per day for the last 7 days — plain Views, no chart library.
// One series in the brand green with today emphasized in gold; thin bars
// with rounded tops anchored to a quiet baseline; amounts labeled only on
// days that had spending.
export function WeeklyActivityChart({ data }: Props) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <View>
      <View style={styles.barsRow}>
        {data.map((day) => {
          const height = day.amount > 0 ? Math.max((day.amount / maxAmount) * MAX_BAR_HEIGHT, 6) : 0;
          const isToday = day.date === todayKey;
          const weekday = WEEKDAY_LABELS[new Date(`${day.date}T00:00:00`).getDay()];
          return (
            <View key={day.date} style={styles.barColumn}>
              <Text style={[styles.amountLabel, day.amount === 0 && styles.hidden]}>${Math.round(day.amount)}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height }, isToday && styles.barToday]} />
              </View>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{isToday ? 'Today' : weekday}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barColumn: { alignItems: 'center', flex: 1 },
  amountLabel: { fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: 4 },
  hidden: { opacity: 0 },
  barTrack: {
    height: MAX_BAR_HEIGHT,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bar: { width: 16, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: colors.primary },
  barToday: { backgroundColor: colors.accent },
  dayLabel: { fontSize: 11.5, color: colors.textMuted, marginTop: spacing.xs },
  dayLabelToday: { color: colors.text, fontWeight: '700' },
});
