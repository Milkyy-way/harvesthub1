import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../constants/theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// A label/value line straight on the page background with a hairline under
// it — the Account screens' contact/address/farm details.
export function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={19} color={colors.primary} style={styles.icon} />
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// Read-only tags (preferences, farm types) on the soft green wash.
export function ChipRow({ labels }: { labels: string[] }) {
  return (
    <View style={styles.chipRow}>
      {labels.map((label) => (
        <View key={label} style={styles.chip}>
          <Text style={styles.chipText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: { marginTop: 2 },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 12, color: colors.textMuted },
  infoValue: { fontSize: 15, color: colors.text, marginTop: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: { backgroundColor: colors.tint, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
});
