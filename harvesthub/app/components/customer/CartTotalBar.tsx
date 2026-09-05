import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';

type Props = {
  itemCount: number;
  total: number;
  onPress?: () => void;
};

export function CartTotalBar({ itemCount, total, onPress }: Props) {
  const insets = useSafeAreaInsets();

  if (itemCount === 0) return null;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.summaryRow}>
        <Text style={styles.count}>
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </Text>
        <Text style={styles.total}>${total.toFixed(2)}</Text>
      </View>
      {onPress ? (
        <Pressable
          style={({ pressed }) => [styles.viewCartButton, pressed && styles.viewCartButtonPressed]}
          onPress={onPress}
        >
          <Text style={styles.viewCartText}>View Cart</Text>
          <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  count: { color: colors.white, fontSize: 14, fontWeight: '500' },
  total: { color: colors.white, fontSize: 18, fontWeight: '700' },
  // A distinct, full-width button rather than just a chevron on the total
  // row — the total row alone read as a static label, not something to tap.
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  viewCartButtonPressed: { opacity: 0.85 },
  viewCartText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
