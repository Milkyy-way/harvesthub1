import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Alert, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';
import { apiClient } from '../../lib/apiClient';
import { useCheckoutDraft } from '../../contexts/CheckoutDraftContext';
import { CheckoutFarmSection } from '../../components/customer/CheckoutFarmSection';
import type { CheckoutPreviewResponse } from '../../types/checkout';

type PaymentMethod = 'card' | 'wallet' | 'cash_on_pickup';

const WALLET_LABEL = Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay';

export default function CheckoutScreen() {
  const { farmerIds: farmerIdsParam } = useLocalSearchParams<{ farmerIds: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fulfillmentByFarm } = useCheckoutDraft();

  const farmerIds = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(farmerIdsParam ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [farmerIdsParam]);

  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoInputs, setPromoInputs] = useState<Record<string, string>>({});
  const [appliedPromoCodes, setAppliedPromoCodes] = useState<Record<string, string>>({});
  const [applyingPromoFor, setApplyingPromoFor] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const loadPreview = useCallback(
    (promoOverrides: Record<string, string> = appliedPromoCodes) => {
      if (farmerIds.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      apiClient
        .post<CheckoutPreviewResponse>('/checkout/preview', {
          groups: farmerIds.map((farmerId) => ({
            farmer_id: farmerId,
            fulfillment_method: fulfillmentByFarm[farmerId]?.method ?? 'pickup',
            promo_code: promoOverrides[farmerId] ?? null,
          })),
        })
        .then((res) => {
          setPreview(res.data);
          setError(null);
        })
        .catch((err) => {
          console.warn('Could not load checkout preview:', err);
          setError("Couldn't load your order summary. Pull to try again.");
        })
        .finally(() => {
          setLoading(false);
          setApplyingPromoFor(null);
        });
    },
    // farmerIds/fulfillmentByFarm intentionally excluded from deps beyond
    // the initial load — re-running this only happens explicitly (promo
    // apply), not on every context render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    loadPreview({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyPromo = (farmerId: string) => {
    const code = (promoInputs[farmerId] ?? '').trim();
    if (!code) return;
    setApplyingPromoFor(farmerId);
    const nextCodes = { ...appliedPromoCodes, [farmerId]: code };
    setAppliedPromoCodes(nextCodes);
    loadPreview(nextCodes);
  };

  const handlePlaceOrder = () => {
    Alert.alert(
      'Payment coming soon',
      "This is your full estimate — placing the order and taking payment is the next piece we're building. Nothing has been charged."
    );
  };

  if (loading && !preview) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          preview?.groups.map((group) => (
            <CheckoutFarmSection
              key={group.farmer_id}
              group={group}
              deliveryAddress={
                group.fulfillment_method === 'delivery' ? fulfillmentByFarm[group.farmer_id]?.deliveryAddress ?? null : null
              }
              promoCodeInput={promoInputs[group.farmer_id] ?? ''}
              onChangePromoCodeInput={(value) => setPromoInputs((prev) => ({ ...prev, [group.farmer_id]: value }))}
              onApplyPromo={() => handleApplyPromo(group.farmer_id)}
              applyingPromo={applyingPromoFor === group.farmer_id}
            />
          ))
        )}

        {preview && preview.groups.length > 0 ? (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Payment method</Text>
            <PaymentOption
              icon="credit-card"
              label="Credit / Debit Card"
              selected={paymentMethod === 'card'}
              onPress={() => setPaymentMethod('card')}
            />
            <PaymentOption
              icon="account-balance-wallet"
              label={WALLET_LABEL}
              selected={paymentMethod === 'wallet'}
              onPress={() => setPaymentMethod('wallet')}
            />
            {preview.groups.some((g) => g.fulfillment_method === 'pickup') ? (
              <PaymentOption
                icon="payments"
                label="Cash on Pickup"
                selected={paymentMethod === 'cash_on_pickup'}
                onPress={() => setPaymentMethod('cash_on_pickup')}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {preview && preview.groups.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {preview.groups.length} order{preview.groups.length === 1 ? '' : 's'} · Grand total
            </Text>
            <Text style={styles.totalValue}>${preview.grand_total.toFixed(2)}</Text>
          </View>
          <Pressable
            style={[styles.placeOrderButton, !paymentMethod && styles.placeOrderButtonDisabled]}
            onPress={handlePlaceOrder}
            disabled={!paymentMethod}
          >
            <Text style={styles.placeOrderText}>{paymentMethod ? 'Place Order' : 'Select a payment method'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function PaymentOption({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.paymentOption, selected && styles.paymentOptionSelected]} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={selected ? colors.primary : colors.textMuted} />
      <Text style={[styles.paymentOptionLabel, selected && styles.paymentOptionLabelSelected]}>{label}</Text>
      <MaterialIcons
        name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
        size={20}
        color={selected ? colors.primary : colors.border}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  scrollContent: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  paymentSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  paymentOptionSelected: { borderColor: colors.primary, backgroundColor: '#EAF2EC' },
  paymentOptionLabel: { flex: 1, fontSize: 14, color: colors.text },
  paymentOptionLabelSelected: { fontWeight: '700' },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  totalLabel: { fontSize: 13, color: colors.textMuted },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  placeOrderButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: { opacity: 0.4 },
  placeOrderText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
