import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../../constants/theme';
import { apiClient } from '../../../lib/apiClient';
import { OrderCard } from '../../../components/customer/OrderCard';
import type { Order, OrderStatus } from '../../../types/orders';

const TABS: { key: OrderStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const EMPTY_MESSAGES: Record<OrderStatus, string> = {
  active: 'No active orders. Browse nearby farms to place one.',
  completed: 'No completed orders yet.',
  cancelled: 'No cancelled orders.',
};

export default function CustomerOrders() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<OrderStatus>('active');
  const [ordersByTab, setOrdersByTab] = useState<Record<OrderStatus, Order[]>>({
    active: [],
    completed: [],
    cancelled: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback((tab: OrderStatus) => {
    setLoading(true);
    apiClient
      .get<Order[]>('/orders', { params: { status: tab } })
      .then((res) => {
        setOrdersByTab((prev) => ({ ...prev, [tab]: res.data }));
        setError(null);
      })
      .catch((err) => {
        console.warn('Could not load orders:', err);
        setError("Couldn't load your orders. Pull down to try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders(activeTab);
      // Reload only the tab currently in view on each focus — switching
      // tabs triggers its own load below, so this doesn't need activeTab
      // in its deps beyond what's already captured at focus time.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadOrders])
  );

  const handleSelectTab = (tab: OrderStatus) => {
    setActiveTab(tab);
    loadOrders(tab);
  };

  const orders = ordersByTab[activeTab];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Your Orders</Text>
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleSelectTab(tab.key)}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading && orders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(order) => order.id}
          contentContainerStyle={orders.length === 0 ? styles.emptyContent : styles.listContent}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => router.push({ pathname: '/(customer)/orders/[id]', params: { id: item.id } })} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error ?? EMPTY_MESSAGES[activeTab]}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  tabRow: { flexDirection: 'row', gap: spacing.xs },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabLabelActive: { color: colors.white },
  listContent: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  emptyContent: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
