import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import type { Order } from '../../types/orders';

type Props = {
  order: Order;
  onPress: () => void;
  // Rebook is only offered for Completed/Cancelled — an Active order is
  // still in progress, "reorder" doesn't make sense for it yet.
  showRebook?: boolean;
  onRebook?: () => void;
  rebooking?: boolean;
};

export function OrderCard({ order, onPress, showRebook, onRebook, rebooking }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const firstFarm = order.store_orders[0];
  const showPhoto = Boolean(firstFarm?.photo_url) && !imageFailed;

  const farmNames = order.store_orders.map((so) => so.farm_name).join(' · ');
  const placedDate = new Date(order.placed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <Pressable style={({ pressed }) => [styles.container, pressed && styles.pressed]} onPress={onPress}>
      {showPhoto ? (
        <Image
          source={{ uri: firstFarm!.photo_url! }}
          style={styles.photo}
          contentFit="cover"
          transition={150}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <MaterialIcons name="storefront" size={22} color={colors.primaryMid} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.farmNames} numberOfLines={1}>
          {farmNames}
        </Text>
        <Text style={styles.meta}>
          {placedDate} · {order.store_orders.length} farm{order.store_orders.length === 1 ? '' : 's'} · $
          {order.grand_total.toFixed(2)}
        </Text>
      </View>

      {showRebook ? (
        <Pressable style={styles.rebookButton} onPress={onRebook} disabled={rebooking} hitSlop={6}>
          {rebooking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <MaterialIcons name="replay" size={14} color={colors.primary} />
              <Text style={styles.rebookText}>Rebook</Text>
            </>
          )}
        </Pressable>
      ) : (
        <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const PHOTO_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.7 },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: radius.md, backgroundColor: colors.tint },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  farmNames: { fontFamily: fonts.headline, fontSize: 15, color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 78,
    justifyContent: 'center',
  },
  rebookText: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
