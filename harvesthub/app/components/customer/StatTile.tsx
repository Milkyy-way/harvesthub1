import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';

type Props = {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  value: string;
  caption?: string;
};

// A headline number on a soft green wash (not a white card) — two per row.
export function StatTile({ icon, label, value, caption }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <MaterialIcons name={icon} size={16} color={colors.primary} />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {caption ? (
        <Text style={styles.caption} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.tint,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.primaryDark },
  value: { fontFamily: fonts.headlineBold, fontSize: 26, color: colors.text, marginTop: 6 },
  caption: { fontSize: 11.5, lineHeight: 16, color: colors.textMuted, marginTop: 2 },
});
