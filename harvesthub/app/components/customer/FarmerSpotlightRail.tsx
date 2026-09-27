import { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, fonts } from '../../constants/theme';
import type { FarmerSpotlightCard } from '../../types/database';

type Props = {
  items: FarmerSpotlightCard[];
  onPressFarmer: (id: string) => void;
};

const RING_SIZE = 60;

export function FarmerSpotlightRail({ items, onPressFarmer }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Farmer spotlights</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {items.map((farmer) => (
          <SpotlightItem key={farmer.id} farmer={farmer} onPress={() => onPressFarmer(farmer.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function SpotlightItem({ farmer, onPress }: { farmer: FarmerSpotlightCard; onPress: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = Boolean(farmer.photo_url) && !imageFailed;

  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.ring}>
        {showPhoto ? (
          <Image
            source={{ uri: farmer.photo_url! }}
            style={styles.ringInner}
            contentFit="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[styles.ringInner, styles.ringInnerFallback]}>
            <MaterialIcons name="storefront" size={22} color={colors.textMuted} />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {farmer.farm_name}
      </Text>
      {farmer.average_rating != null ? (
        <View style={styles.ratingRow}>
          <MaterialIcons name="star" size={10} color={colors.accent} />
          <Text style={styles.ratingText}>{farmer.average_rating.toFixed(1)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: spacing.lg, paddingBottom: spacing.xs },
  title: { fontFamily: fonts.headline, fontSize: 16, color: colors.text, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  item: { width: 66, alignItems: 'center', gap: 6 },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    padding: 2.5,
    backgroundColor: colors.accent,
  },
  ringInner: {
    width: '100%',
    height: '100%',
    borderRadius: RING_SIZE / 2,
    borderWidth: 2.5,
    borderColor: colors.background,
    backgroundColor: colors.border,
  },
  ringInnerFallback: { alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 9.5, textAlign: 'center', lineHeight: 12, color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 9.5, color: colors.textMuted, fontWeight: '600' },
});
