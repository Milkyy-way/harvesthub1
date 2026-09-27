import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../../constants/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../lib/apiClient';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { Header } from '../../../components/customer/Header';
import { SavingsTicker } from '../../../components/customer/SavingsTicker';
import { FarmerSpotlightRail } from '../../../components/customer/FarmerSpotlightRail';
import { HarvestPicksRail } from '../../../components/customer/HarvestPicksRail';
import { CategoryRail } from '../../../components/customer/CategoryRail';
import { FarmerFeedList } from '../../../components/customer/FarmerFeedList';
import type {
  Category,
  CartSummary,
  FarmerFeedResponse,
  FarmerSpotlightResponse,
  HarvestPicksResponse,
} from '../../../types/database';
import type { DashboardSummary } from '../../../types/dashboard';

const PAGE_SIZE = 20;

export default function CustomerHome() {
  const { customerProfile, profile } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);

  const [items, setItems] = useState<FarmerFeedResponse['items']>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);

  const [spotlight, setSpotlight] = useState<FarmerSpotlightResponse['items']>([]);
  const [harvestPicks, setHarvestPicks] = useState<HarvestPicksResponse['items']>([]);
  const [savingsAmount, setSavingsAmount] = useState<number | null>(null);

  const avatarInitial = (profile?.full_name?.trim()?.[0] ?? 'H').toUpperCase();

  useEffect(() => {
    apiClient.get<Category[]>('/categories').then(
      (res) => setCategories(res.data),
      (err) => console.warn('Could not load categories:', err)
    );
  }, []);

  // These three power the hero/spotlight/harvest sections and don't
  // depend on search or category filters — fetched once, refreshed on
  // pull-to-refresh alongside the main feed (see handleRefresh below).
  const loadExtras = useCallback(() => {
    apiClient.get<FarmerSpotlightResponse>('/farmers/spotlight').then(
      (res) => setSpotlight(res.data.items),
      (err) => console.warn('Could not load farmer spotlight:', err)
    );
    apiClient.get<HarvestPicksResponse>('/products/harvest').then(
      (res) => setHarvestPicks(res.data.items),
      (err) => console.warn('Could not load harvest picks:', err)
    );
    apiClient.get<DashboardSummary>('/customers/me/dashboard-summary').then(
      (res) => setSavingsAmount(res.data.savings_all_time),
      (err) => console.warn('Could not load savings summary:', err)
    );
  }, []);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  // Refetched on focus (not just mount) — the cart can change on the farm
  // detail or cart screens, and this badge should reflect that the moment
  // the customer comes back to Home, not just on first load.
  useFocusEffect(
    useCallback(() => {
      apiClient.get<CartSummary>('/cart').then(
        (res) => setCartItemCount(res.data.item_count),
        (err) => console.warn('Could not load cart count:', err)
      );
    }, [])
  );

  const fetchPage = useCallback(
    async (nextOffset: number, replace: boolean) => {
      setError(null);
      if (replace) setLoading(true);
      try {
        const res = await apiClient.get<FarmerFeedResponse>('/farmers/feed', {
          params: {
            category: selectedCategory ?? undefined,
            search: debouncedSearch.trim() || undefined,
            limit: PAGE_SIZE,
            offset: nextOffset,
          },
        });
        setItems((prev) => (replace ? res.data.items : [...prev, ...res.data.items]));
        setTotal(res.data.total);
        setOffset(nextOffset);
      } catch (err) {
        console.warn('Could not load farmer feed:', err);
        setError("Couldn't load nearby farms. Pull down to try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory, debouncedSearch]
  );

  useEffect(() => {
    fetchPage(0, true);
    // fetchPage is recreated when selectedCategory/debouncedSearch change —
    // this effect intentionally re-runs on those, not on fetchPage itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, debouncedSearch]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPage(0, true);
    loadExtras();
  };

  const handleEndReached = () => {
    if (loading || refreshing || items.length >= total) return;
    fetchPage(offset + PAGE_SIZE, false);
  };

  const trimmedSearch = debouncedSearch.trim();
  const emptyMessage = error
    ? error
    : selectedCategory
      ? `No farms currently carry ${selectedCategory} near you.`
      : trimmedSearch
        ? `No results for "${trimmedSearch}".`
        : 'No farms nearby yet.';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Header
        addressCity={customerProfile?.address_city ?? null}
        nearbyFarmCount={total || null}
        searchValue={searchText}
        onSearchChange={setSearchText}
        cartItemCount={cartItemCount}
        onPressCart={() => router.push('/(customer)/cart')}
        avatarInitial={avatarInitial}
      />
      <FarmerFeedList
        items={items}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        onPressFarmer={(id) => router.push({ pathname: '/(customer)/farmer/[id]', params: { id } })}
        emptyMessage={emptyMessage}
        header={
          <View>
            {savingsAmount != null && savingsAmount > 0 ? <SavingsTicker amount={savingsAmount} /> : null}
            <FarmerSpotlightRail
              items={spotlight}
              onPressFarmer={(id) => router.push({ pathname: '/(customer)/farmer/[id]', params: { id } })}
            />
            <HarvestPicksRail items={harvestPicks} />
            <CategoryRail categories={categories} selectedSlug={selectedCategory} onSelect={setSelectedCategory} />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
