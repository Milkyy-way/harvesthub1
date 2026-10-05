import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import { RatingStars } from '../../components/customer/RatingStars';
import type { FarmerRatings, ReceivedRating } from '../../types/farmer';

// Farmer F7 — read-only view of the ratings customers left after picking
// up an order (GET /farmers/me/ratings). Who rated is deliberately not
// shown; farmers don't reply to ratings in v1.
export default function FarmerRatingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const approved = profile?.status === 'active';

  const [data, setData] = useState<FarmerRatings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<FarmerRatings>('/farmers/me/ratings');
      setData(res.data);
      setError(null);
    } catch (err) {
      console.warn('Could not load ratings:', err);
      setError("Couldn't load your ratings. Pull down to try again.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (approved) load();
    }, [approved, load])
  );

  const maxCount = data ? Math.max(1, ...data.distribution) : 1;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ratings</Text>
        <View style={styles.back} />
      </View>

      {!approved ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Ratings appear once your farm is approved and customers start picking up orders.</Text>
        </View>
      ) : !data ? (
        <View style={styles.center}>
          {error ? <Text style={styles.muted}>{error}</Text> : <ActivityIndicator color={colors.primary} />}
        </View>
      ) : (
        <FlatList
          data={data.recent}
          keyExtractor={(item, index) => `${item.created_at}-${index}`}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.card}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLeft}>
                    <Text style={styles.average}>{data.average != null ? data.average.toFixed(1) : '—'}</Text>
                    <RatingStars value={Math.round(data.average ?? 0)} size={18} />
                    <Text style={styles.muted}>
                      {data.count === 0 ? 'No ratings yet' : `${data.count} rating${data.count === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                  <View style={styles.bars}>
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const n = data.distribution[stars - 1] ?? 0;
                      return (
                        <View key={stars} style={styles.barRow}>
                          <Text style={styles.barLabel}>{stars}</Text>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${(n / maxCount) * 100}%` }]} />
                          </View>
                          <Text style={styles.barCount}>{n}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <Text style={styles.note}>
                  Customers rate your farm after they pick up an order. This average is what they see on your farm page,
                  and it helps your farm show up in their Home feed. You won’t see who left each rating.
                </Text>
              </View>
              {data.recent.length > 0 ? <Text style={styles.sectionTitle}>Recent ratings</Text> : null}
            </>
          }
          renderItem={({ item }) => <RatingRow rating={item} />}
        />
      )}
    </View>
  );
}

function RatingRow({ rating }: { rating: ReceivedRating }) {
  return (
    <View style={styles.ratingRow}>
      <View style={styles.ratingTop}>
        <RatingStars value={rating.rating} size={16} />
        <Text style={styles.ratingDate}>{new Date(rating.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.ratingItems} numberOfLines={1}>
        {rating.items_summary}
      </Text>
      {rating.comment ? <Text style={styles.ratingComment}>“{rating.comment}”</Text> : null}
    </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
  muted: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, textAlign: 'center' },
  card: {
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  summaryLeft: { alignItems: 'center', gap: 4 },
  average: { fontFamily: fonts.headlineBold, fontSize: 40, color: colors.text },
  bars: { flex: 1, gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { width: 10, fontSize: 12, color: colors.textMuted },
  barTrack: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  barCount: { width: 22, fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  note: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: spacing.md },
  sectionTitle: { fontFamily: fonts.headline, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  ratingRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ratingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingDate: { fontSize: 12, color: colors.textMuted },
  ratingItems: { fontSize: 13, color: colors.text, marginTop: 4 },
  ratingComment: { fontSize: 13, lineHeight: 19, color: colors.text, marginTop: 4, fontStyle: 'italic' },
});
