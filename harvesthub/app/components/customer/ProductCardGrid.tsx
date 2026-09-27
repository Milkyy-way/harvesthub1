import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import type { ProductItem } from '../../types/database';

type Props = {
  product: ProductItem;
  pending: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
};

// Same threshold as ProductCard.tsx (list view) — keep in sync.
const LOW_STOCK_THRESHOLD = 11;

// Grid counterpart to ProductCard — same data/behavior, laid out as a
// compact vertical tile for a 2-column grid instead of a full-width row.
export function ProductCardGrid({ product, pending, onIncrement, onDecrement }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const outOfStock = product.quantity_available <= 0;
  const lowStock = !outOfStock && product.quantity_available < LOW_STOCK_THRESHOLD;
  const atMax = product.cart_quantity >= product.quantity_available;
  const showPhoto = Boolean(product.image_url) && !imageFailed;

  return (
    <View style={[styles.container, outOfStock && styles.outOfStock]}>
      {showPhoto ? (
        <Image
          source={{ uri: product.image_url! }}
          style={styles.photo}
          contentFit="cover"
          transition={150}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <MaterialIcons name="eco" size={30} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.price}>
          ${product.price.toFixed(2)} <Text style={styles.unit}>/{product.unit}</Text>
        </Text>
        {outOfStock ? (
          <Text style={styles.outOfStockText}>Out of stock</Text>
        ) : lowStock ? (
          <Text style={styles.lowStockText}>Only {product.quantity_available} left</Text>
        ) : null}
      </View>

      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepperButton, (outOfStock || pending || product.cart_quantity === 0) && styles.stepperButtonDisabled]}
          onPress={onDecrement}
          disabled={outOfStock || pending || product.cart_quantity === 0}
          hitSlop={8}
        >
          <MaterialIcons name="remove" size={16} color={colors.primary} />
        </Pressable>
        <Text style={styles.stepperValue}>{product.cart_quantity}</Text>
        <Pressable
          style={[styles.stepperButton, (outOfStock || pending || atMax) && styles.stepperButtonDisabled]}
          onPress={onIncrement}
          disabled={outOfStock || pending || atMax}
          hitSlop={8}
        >
          <MaterialIcons name="add" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const PHOTO_HEIGHT = 110;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  outOfStock: { opacity: 0.5 },
  photo: { width: '100%', height: PHOTO_HEIGHT, backgroundColor: colors.background },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { padding: spacing.sm, paddingBottom: spacing.xs },
  name: { fontFamily: fonts.headline, fontSize: 13.5, color: colors.text },
  price: { fontSize: 13, fontWeight: '600', color: colors.primaryDark, marginTop: 4 },
  unit: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  outOfStockText: { fontSize: 11, color: colors.danger, fontWeight: '600', marginTop: 4 },
  lowStockText: { fontSize: 11, color: colors.accent, fontWeight: '600', marginTop: 4 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: { opacity: 0.35 },
  stepperValue: { fontSize: 14, fontWeight: '600', color: colors.text },
});
