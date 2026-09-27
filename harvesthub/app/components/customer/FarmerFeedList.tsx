import type { ReactElement } from 'react';
import { FlatList, RefreshControl, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/theme';
import type { FarmerFeedCard as FarmerFeedCardType } from '../../types/database';
import { FarmerCard } from './FarmerCard';

type Props = {
  items: FarmerFeedCardType[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onPressFarmer: (id: string) => void;
  emptyMessage: string;
  // Rendered above the farm cards, inside the same FlatList — this is
  // how the hero/savings/spotlight/harvest/category-rail sections sit
  // above "Farms near you" without nesting another scroll view (which
  // would break this list's own virtualization and onEndReached paging).
  header?: ReactElement | null;
};

export function FarmerFeedList({
  items,
  loading,
  refreshing,
  onRefresh,
  onEndReached,
  onPressFarmer,
  emptyMessage,
  header,
}: Props) {
  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FarmerCard farmer={item} onPress={() => onPressFarmer(item.id)} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.content}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  // flex: 1 so the list firmly claims all remaining vertical space and
  // scrolls its own content internally — without this, it has no declared
  // size and its layout can end up entangled with siblings above it (see
  // the note in CategoryRail.tsx's styles for the same underlying issue).
  list: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  emptyContent: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
