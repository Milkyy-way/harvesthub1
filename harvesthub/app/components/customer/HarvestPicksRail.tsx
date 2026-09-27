import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import type { HarvestPick, HarvestPickTag } from '../../types/database';

type Props = {
  items: HarvestPick[];
};

const TAG_LABELS: Record<HarvestPickTag, string> = {
  farmer_favorite: 'Farmer favorite',
  limited: 'Limited',
  just_picked: 'Just picked',
};

export function HarvestPicksRail({ items }: Props) {
  const router = useRouter();
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.title}>This week&apos;s harvest</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {items.map((pick) => (
          <HarvestCard key={pick.id} pick={pick} onPress={() => router.push({ pathname: '/(customer)/farmer/[id]', params: { id: pick.farmer_id } })} />
        ))}
      </ScrollView>
    </View>
  );
}

function HarvestCard({ pick, onPress }: { pick: HarvestPick; onPress: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = Boolean(pick.image_url) && !imageFailed;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.photoWrap}>
        {showPhoto ? (
          <Image
            source={{ uri: pick.image_url! }}
            style={styles.photo}
            contentFit="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <MaterialIcons name="eco" size={28} color={colors.textMuted} />
          </View>
        )}
        {pick.tag ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{TAG_LABELS[pick.tag]}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {pick.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {pick.farm_name} · {pick.distance_km.toFixed(1)} mi
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            ${pick.price.toFixed(2)}
            <Text style={styles.unit}>/{pick.unit}</Text>
          </Text>
          <View style={styles.addButton}>
            <MaterialIcons name="add" size={13} color={colors.white} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const CARD_WIDTH = 172;
const PHOTO_HEIGHT = 108;

const styles = StyleSheet.create({
  section: { paddingTop: spacing.lg },
  head: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  title: { fontFamily: fonts.headline, fontSize: 18, color: colors.text },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  photoWrap: { position: 'relative' },
  photo: { width: '100%', height: PHOTO_HEIGHT, backgroundColor: colors.background },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(30,51,36,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: colors.white, fontSize: 9.5, fontWeight: '700' },
  body: { padding: spacing.sm },
  name: { fontFamily: fonts.headline, fontSize: 14, color: colors.text },
  meta: { fontSize: 10.5, color: colors.textMuted, marginTop: 3 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  price: { fontSize: 13, fontWeight: '700', color: colors.primary },
  unit: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  addButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
