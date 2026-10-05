import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';
import { TextField } from '../TextField';
import type { DeliveryAddressDraft, FulfillmentMethod } from '../../types/checkout';

type Props = {
  method: FulfillmentMethod | null;
  onSelectMethod: (method: FulfillmentMethod) => void;
  pickupAddressLine: string | null;
  onPressDirections: () => void;
  deliveryAddress: DeliveryAddressDraft;
  onChangeDeliveryAddress: (field: keyof DeliveryAddressDraft, value: string) => void;
};

export function FulfillmentSelector({
  method,
  onSelectMethod,
  pickupAddressLine,
  onPressDirections,
  deliveryAddress,
  onChangeDeliveryAddress,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>How would you like to get this order?</Text>

      {/* Delivery is a real, working option end to end (backend, pricing,
          checkout) — just not offered in the UI for now, per the Phase 1
          pickup-only decision. Hiding the button, not the branch below
          that renders a delivery address form if method ever were
          'delivery' — that stays intact for whenever this button comes
          back. */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggle, method === 'pickup' && styles.toggleActive]}
          onPress={() => onSelectMethod('pickup')}
        >
          <MaterialIcons name="storefront" size={16} color={method === 'pickup' ? colors.white : colors.textMuted} />
          <Text style={[styles.toggleText, method === 'pickup' && styles.toggleTextActive]}>Pickup</Text>
        </Pressable>
      </View>

      {method === 'pickup' ? (
        <View style={styles.pickupBox}>
          <MaterialIcons name="place" size={16} color={colors.textMuted} />
          <Text style={styles.pickupAddress} numberOfLines={2}>
            {pickupAddressLine ?? 'Pickup address not available yet'}
          </Text>
          <Pressable style={styles.directionsButton} onPress={onPressDirections} hitSlop={8}>
            <Text style={styles.directionsText}>Get Directions</Text>
          </Pressable>
        </View>
      ) : method === 'delivery' ? (
        <View style={styles.deliveryBox}>
          <TextField
            placeholder="Street address"
            value={deliveryAddress.street}
            onChangeText={(v) => onChangeDeliveryAddress('street', v)}
          />
          <View style={styles.row}>
            <View style={styles.flexInput}>
              <TextField
                placeholder="City"
                value={deliveryAddress.city}
                onChangeText={(v) => onChangeDeliveryAddress('city', v)}
              />
            </View>
            <View style={styles.stateInput}>
              <TextField
                placeholder="State"
                value={deliveryAddress.state}
                onChangeText={(v) => onChangeDeliveryAddress('state', v)}
                autoCapitalize="characters"
                maxLength={2}
              />
            </View>
            <View style={styles.zipInput}>
              <TextField
                placeholder="ZIP"
                value={deliveryAddress.zip}
                onChangeText={(v) => onChangeDeliveryAddress('zip', v)}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  toggleRow: { flexDirection: 'row', gap: spacing.xs },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 13, fontWeight: '600', color: colors.text },
  toggleTextActive: { color: colors.white },
  pickupBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm + 2,
    backgroundColor: colors.tint,
    borderRadius: radius.md,
  },
  pickupAddress: { flex: 1, fontSize: 12, color: colors.text, minWidth: 120 },
  directionsButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  directionsText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  deliveryBox: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.xs },
  flexInput: { flex: 2 },
  stateInput: { flex: 1 },
  zipInput: { flex: 1 },
});
