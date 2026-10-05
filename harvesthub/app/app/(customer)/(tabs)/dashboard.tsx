import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, chartColors } from '../../../constants/theme';
import { apiClient } from '../../../lib/apiClient';
import { formatMoney } from '../../../lib/format';
import { HeroShell } from '../../../components/customer/HeroShell';
import { DateRangeFilter } from '../../../components/customer/DateRangeFilter';
import { StatTile } from '../../../components/customer/StatTile';
import { WeeklyActivityChart } from '../../../components/customer/WeeklyActivityChart';
import { DonutChart, type DonutSegment } from '../../../components/customer/DonutChart';
import { Section } from '../../../components/Section';
import type { CategorySpend, DashboardSummary, DashboardRangeKey } from '../../../types/dashboard';

const RANGE_LABELS: Record<DashboardRangeKey, string> = {
  week: 'this week',
  month: 'this month',
  '3m': 'the last 3 months',
  '6m': 'the last 6 months',
  all: 'all time',
};

// Donut segments: the customer's top categories in their fixed chart colors
// (color_slot comes from the backend, pinned to ALL-TIME rank so changing
// the range never repaints a category), everything else folded into one
// gray "Other".
function toDonutSegments(categories: CategorySpend[]): DonutSegment[] {
  const named = categories
    .filter((c) => c.color_slot !== null && c.color_slot < chartColors.categorical.length)
    .sort((a, b) => (a.color_slot ?? 0) - (b.color_slot ?? 0));
  const rest = categories.filter((c) => !named.includes(c));
  const segments: DonutSegment[] = named.map((c) => ({
    key: c.slug,
    label: c.name,
    value: c.amount,
    color: chartColors.categorical[c.color_slot!],
  }));
  if (rest.length > 0) {
    segments.push({
      key: 'other',
      label: 'Other',
      sublabel: rest.map((c) => c.name).join(', '),
      value: rest.reduce((sum, c) => sum + c.amount, 0),
      color: chartColors.other,
    });
  }
  return segments;
}

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

  const segments = useMemo(() => toDonutSegments(summary?.spending_by_category ?? []), [summary]);

  const headline =
    summary && summary.orders_total > 0
      ? `You've saved ${formatMoney(summary.savings_all_time)} ${RANGE_LABELS[range]}`
      : "See what you've saved";

  return (
    <View style={styles.container}>
      <HeroShell headline={headline} subheadline={`Spent ${formatMoney(summary?.spending_all_time ?? 0)} buying direct`}>
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
              <Text style={styles.emptyEmoji}>🧺</Text>
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
                <StatTile icon="account-balance-wallet" label="Spent" value={formatMoney(summary.spending_all_time)} />
                <StatTile icon="savings" label="Saved" value={formatMoney(summary.savings_all_time)} caption="from promo codes" />
                <StatTile icon="trending-up" label="Avg order" value={formatMoney(summary.average_order_value)} />
              </View>

              <Section title="What you buy" caption={`By category, ${RANGE_LABELS[range]} — item totals, before fees and tax. Tap a slice for details.`}>
                {segments.length > 0 ? (
                  <DonutChart segments={segments} formatValue={formatMoney} centerCaption="on produce" />
                ) : (
                  <Text style={styles.muted}>Nothing bought {RANGE_LABELS[range]} yet.</Text>
                )}
              </Section>

              <Section title="Last 7 days" caption="What you spent each day.">
                <WeeklyActivityChart data={summary.activity_last_7_days} />
              </Section>

              <Section title="Insights">
                <InsightRow
                  icon="storefront"
                  label="Favorite farm"
                  value={
                    summary.favorite_farm
                      ? `${summary.favorite_farm.farm_name} (${summary.favorite_farm.order_count} order${summary.favorite_farm.order_count === 1 ? '' : 's'})`
                      : 'Not enough orders yet'
                  }
                />
                <InsightRow
                  icon="eco"
                  label="Most ordered"
                  value={
                    summary.most_ordered_product
                      ? `${summary.most_ordered_product.product_name} (×${summary.most_ordered_product.quantity})`
                      : 'Not enough orders yet'
                  }
                />
              </Section>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function InsightRow({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.insightIcon}>
        <MaterialIcons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.insightTextWrap}>
        <Text style={styles.insightLabel}>{label}</Text>
        <Text style={styles.insightValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm },
  emptyEmoji: { fontSize: 44 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  muted: { fontSize: 13.5, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  insightIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTextWrap: { flex: 1 },
  insightLabel: { fontSize: 12.5, color: colors.textMuted },
  insightValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 1 },
});
