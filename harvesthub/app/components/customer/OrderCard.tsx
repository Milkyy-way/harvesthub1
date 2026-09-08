import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';
import type { Order } from '../../types/orders';

type Props = {
  order: Order;
  onPress: () => void;
};

export function OrderCard({ order, onPress }: Props) {
  const farmNames = order.store_orders.map((so) => so.farm_name).join(' · ');
  const placedDate = new Date(order.placed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <Pressable style={({ pressed }) => [styles.container, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.farmNames} numberOfLines={1}>
          {farmNames}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
      </View>
      <Text style={styles.meta}>
        {placedDate} · {order.store_orders.length} farm{order.store_orders.length === 1 ? '' : 's'}
      </Text>
      <View style={styles.footerRow}>
        <Text style={styles.total}>${order.grand_total.toFixed(2)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  farmNames: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.xs },
  total: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
});
