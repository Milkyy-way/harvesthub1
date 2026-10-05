import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';
import type { HarvestPick, HarvestPickTag } from '../../types/database';
import { SectionTitle } from './SectionTitle';
import { formatDistance } from './formatDistance';

type Props = {
  items: HarvestPick[];
};

const TAG_LABELS: Record<HarvestPickTag, string> = {
  farmer_favorite: '⭐ Farmer favorite',
  limited: '⏳ Limited',
  just_picked: '🌱 Just picked',
};

export function HarvestPicksRail({ items }: Props) {
  const router = useRouter();
  if (items.length === 0) return null;

  return (
    <View>
      <SectionTitle title="This week's harvest" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {items.map((pick) => (
          <HarvestCard
            key={pick.id}
            pick={pick}
            onPress={() => router.push({ pathname: '/(customer)/farmer/[id]', params: { id: pick.farmer_id } })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// No card box: a rounded photo with its badge, and the text right under it
// on the page background.
function HarvestCard({ pick, onPress }: { pick: HarvestPick; onPress: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = Boolean(pick.image_url) && !imageFailed;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View>
        {showPhoto ? (
          <Image
            source={{ uri: pick.image_url! }}
            style={styles.photo}
            contentFit="cover"
            transition={150}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <MaterialIcons name="eco" size={34} color={colors.primaryMid} />
          </View>
        )}
        {pick.tag ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{TAG_LABELS[pick.tag]}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {pick.name}
      </Text>
      <Text style={styles.price}>
        ${pick.price.toFixed(2)}
        <Text style={styles.unit}> / {pick.unit}</Text>
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {pick.farm_name} · {formatDistance(pick.distance_km)}
      </Text>
    </Pressable>
  );
}

const CARD_WIDTH = 168;
const PHOTO_HEIGHT = 126;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  card: { width: CARD_WIDTH },
  pressed: { opacity: 0.8 },
  photo: { width: CARD_WIDTH, height: PHOTO_HEIGHT, borderRadius: radius.lg, backgroundColor: '#EAF2EC' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  price: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 2 },
  unit: { fontSize: 12.5, fontWeight: '400', color: colors.textMuted },
  meta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
});
