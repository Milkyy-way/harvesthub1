import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';
import type { ProductItem } from '../../types/database';

type Props = {
  product: ProductItem;
  pending: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
};

// "Low Stock Warning: If available quantity is less than 11..."
const LOW_STOCK_THRESHOLD = 11;

export function ProductCard({ product, pending, onIncrement, onDecrement }: Props) {
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
          <MaterialIcons name="eco" size={26} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        {product.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {product.description}
          </Text>
        ) : null}
        <Text style={styles.price}>
          ${product.price.toFixed(2)} <Text style={styles.unit}>/ {product.unit}</Text>
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
          <MaterialIcons name="remove" size={18} color={colors.primary} />
        </Pressable>
        <Text style={styles.stepperValue}>{product.cart_quantity}</Text>
        <Pressable
          style={[styles.stepperButton, (outOfStock || pending || atMax) && styles.stepperButtonDisabled]}
          onPress={onIncrement}
          disabled={outOfStock || pending || atMax}
          hitSlop={8}
        >
          <MaterialIcons name="add" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const PHOTO_SIZE = 64;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  // "Out of Stock: Reduce UI opacity/transparency for out-of-stock items
  // and disable interaction." — the stepper buttons are separately
  // disabled below; this dims the whole card.
  outOfStock: { opacity: 0.5 },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: radius.md, backgroundColor: colors.background },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  description: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, marginTop: 4 },
  unit: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  outOfStockText: { fontSize: 12, color: colors.danger, fontWeight: '600', marginTop: 4 },
  lowStockText: { fontSize: 12, color: colors.accent, fontWeight: '600', marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: { opacity: 0.35 },
  stepperValue: { fontSize: 15, fontWeight: '600', color: colors.text, minWidth: 20, textAlign: 'center' },
});
