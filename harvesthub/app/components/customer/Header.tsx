import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';

type Props = {
  companyName?: string;
  addressLine: string;
  onPressAddress?: () => void;
  cartItemCount?: number;
  onPressCart?: () => void;
};

export function Header({ companyName = 'HarvestHub', addressLine, onPressAddress, cartItemCount = 0, onPressCart }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      {onPressCart ? (
        <Pressable style={[styles.cartButton, { top: insets.top + spacing.sm }]} onPress={onPressCart} hitSlop={8}>
          <MaterialIcons name="shopping-basket" size={22} color={colors.white} />
          {cartItemCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      <Text style={styles.companyName}>{companyName}</Text>
      <Pressable style={styles.addressRow} onPress={onPressAddress} disabled={!onPressAddress} hitSlop={8}>
        <Text style={styles.address} numberOfLines={1}>
          {addressLine}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    position: 'relative',
  },
  companyName: { fontSize: 22, fontWeight: '700', color: colors.white, marginBottom: 4 },
  addressRow: { paddingHorizontal: spacing.lg },
  address: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  cartButton: {
    position: 'absolute',
    right: spacing.lg,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
});
