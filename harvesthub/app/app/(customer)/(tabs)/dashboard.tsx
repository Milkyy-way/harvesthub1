import { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../../constants/theme';
import { apiClient } from '../../../lib/apiClient';
import { HeroShell } from '../../../components/customer/HeroShell';
import { DateRangeFilter } from '../../../components/customer/DateRangeFilter';
import { StatTile } from '../../../components/customer/StatTile';
import { WeeklyActivityChart } from '../../../components/customer/WeeklyActivityChart';
import type { DashboardSummary, DashboardRangeKey } from '../../../types/dashboard';

const RANGE_LABELS: Record<DashboardRangeKey, string> = {
  week: 'this week',
  month: 'this month',
  '3m': 'the last 3 months',
  '6m': 'the last 6 months',
  all: 'all time',
};

export default function CustomerDashboard() {
  const [range, setRange] = useState<DashboardRangeKey>('month');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((forRange: DashboardRangeKey, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    apiClient
      .get<DashboardSummary>('/customers/me/dashboard-summary', { params: { range: forRange } })
      .then((res) => {
        setSummary(res.data);
        setError(null);
      })
      .catch((err) => {
        console.warn('Could not load dashboard summary:', err);
        setError("Couldn't load your activity. Pull down to try again.");
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(range);
      // Reload only on focus + explicit range changes (handled by
      // handleChangeRange below), not on every re-render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range])
  );

  const handleChangeRange = (next: DashboardRangeKey) => {
    setRange(next);
    load(next);
  };

  const headline =
    summary && summary.orders_total > 0
      ? `You've saved $${summary.savings_all_time.toFixed(2)} ${RANGE_LABELS[range]}`
      : "See what you've saved";

  return (
    <View style={styles.container}>
      <HeroShell headline={headline} subheadline={`Spent $${(summary?.spending_all_time ?? 0).toFixed(2)} buying direct`}>
        <DateRangeFilter value={range} onChange={handleChangeRange} />
      </HeroShell>

      {loading && !summary ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(range, true)} tintColor={colors.primary} />}
        >
          {error && !summary ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : summary && summary.orders_total === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="insights" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No orders {RANGE_LABELS[range]} yet.</Text>
            </View>
          ) : summary ? (
            <>
              <View style={styles.grid}>
                <StatTile
                  icon="receipt-long"
                  label="Orders"
                  value={String(summary.orders_total)}
                  caption={`${summary.orders_active} active · ${summary.orders_completed} done · ${summary.orders_cancelled} cancelled`}
                />
                <StatTile icon="account-balance-wallet" label="Spent" value={`$${summary.spending_all_time.toFixed(2)}`} />
                <StatTile icon="savings" label="Saved" value={`$${summary.savings_all_time.toFixed(2)}`} caption="from promo codes" />
                <StatTile icon="trending-up" label="Avg Order" value={`$${summary.average_order_value.toFixed(2)}`} />
              </View>

              <WeeklyActivityChart data={summary.activity_last_7_days} />

              <View style={styles.insightsCard}>
                <Text style={styles.insightsTitle}>Insights</Text>

                <View style={styles.insightRow}>
                  <MaterialIcons name="storefront" size={18} color={colors.primary} />
                  <View style={styles.insightTextWrap}>
                    <Text style={styles.insightLabel}>Favorite Farm</Text>
                    <Text style={styles.insightValue} numberOfLines={1}>
                      {summary.favorite_farm
                        ? `${summary.favorite_farm.farm_name} (${summary.favorite_farm.order_count} order${summary.favorite_farm.order_count === 1 ? '' : 's'})`
                        : 'Not enough orders yet'}
                    </Text>
                  </View>
                </View>

                <View style={styles.insightRow}>
                  <MaterialIcons name="eco" size={18} color={colors.primary} />
                  <View style={styles.insightTextWrap}>
                    <Text style={styles.insightLabel}>Most Ordered</Text>
                    <Text style={styles.insightValue} numberOfLines={1}>
                      {summary.most_ordered_product
                        ? `${summary.most_ordered_product.product_name} (×${summary.most_ordered_product.quantity})`
                        : 'Not enough orders yet'}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  insightsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  insightsTitle: { fontFamily: fonts.headline, fontSize: 15, color: colors.text, marginBottom: spacing.sm },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  insightTextWrap: { flex: 1 },
  insightLabel: { fontSize: 12, color: colors.textMuted },
  insightValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 1 },
});
