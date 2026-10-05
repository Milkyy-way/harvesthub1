import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, fonts } from '../../constants/theme';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

// One section heading style for the shopping screens — big serif title
// sitting straight on the page background, optional text action on the
// right ("Clear", "See all").
export function SectionTitle({ title, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: { flex: 1, fontFamily: fonts.headline, fontSize: 21, color: colors.text },
  action: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
});
