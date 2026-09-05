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
import { SearchBar } from '../../../components/customer/SearchBar';
import { CategoryRail } from '../../../components/customer/CategoryRail';
import { FarmerFeedList } from '../../../components/customer/FarmerFeedList';
import type { Category, CartSummary, FarmerFeedResponse } from '../../../types/database';

const PAGE_SIZE = 20;

export default function CustomerHome() {
  const { customerProfile } = useAuth();
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

  useEffect(() => {
    apiClient.get<Category[]>('/categories').then(
      (res) => setCategories(res.data),
      (err) => console.warn('Could not load categories:', err)
    );
  }, []);

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
        companyName="HarvestHub"
        addressLine={customerProfile?.address_street ?? 'Loading address…'}
        cartItemCount={cartItemCount}
        onPressCart={() => router.push('/(customer)/cart')}
      />
      <SearchBar value={searchText} onChangeText={setSearchText} />
      <CategoryRail categories={categories} selectedSlug={selectedCategory} onSelect={setSelectedCategory} />
      <FarmerFeedList
        items={items}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleEndReached}
        onPressFarmer={(id) => router.push({ pathname: '/(customer)/farmer/[id]', params: { id } })}
        emptyMessage={emptyMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
