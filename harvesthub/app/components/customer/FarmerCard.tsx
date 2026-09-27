import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import type { FarmerFeedCard as FarmerFeedCardType } from '../../types/database';
import { formatDistance } from './formatDistance';

type Props = {
  farmer: FarmerFeedCardType;
  onPress: () => void;
};

export function FarmerCard({ farmer, onPress }: Props) {
  // photo_url being present doesn't guarantee the image actually loads (a
  // dead URL, blocked host, etc.) — without this, a failed load just
  // renders a blank/broken box instead of falling back to the icon.
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = farmer.photo_url && !imageFailed;

  return (
    <Pressable style={({ pressed }) => [styles.container, pressed && styles.pressed]} onPress={onPress}>
      {showPhoto ? (
        <Image
          source={{ uri: farmer.photo_url! }}
          style={styles.photo}
          contentFit="cover"
          transition={150}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <MaterialIcons name="storefront" size={40} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {farmer.farm_name}
        </Text>
        <View style={styles.metaRow}>
          <MaterialIcons name="place" size={14} color={colors.textMuted} />
          <Text style={styles.distance}>{formatDistance(farmer.distance_km)} away</Text>
        </View>
        {farmer.matched_categories.length > 0 ? (
          <Text style={styles.matched} numberOfLines={1}>
            {farmer.matched_categories.join(' · ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const CARD_IMAGE_HEIGHT = 150;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: { opacity: 0.85 },
  photo: { width: '100%', height: CARD_IMAGE_HEIGHT, backgroundColor: colors.background },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { padding: spacing.md },
  name: { fontFamily: fonts.headline, fontSize: 17, color: colors.text, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distance: { fontSize: 13, color: colors.textMuted },
  matched: { fontSize: 12, color: colors.primary, marginTop: 6, textTransform: 'capitalize', fontWeight: '500' },
});
