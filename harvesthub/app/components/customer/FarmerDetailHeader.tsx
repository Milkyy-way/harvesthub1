import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import { formatDistance } from './formatDistance';
import type { FarmerDetail } from '../../types/database';

type Props = {
  farmer: FarmerDetail;
};

const FARM_TYPE_LABELS: Record<string, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  livestock: 'Livestock',
};

export function FarmerDetailHeader({ farmer }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Same defensive fallback as FarmerCard — a present photo_url doesn't
  // guarantee the image actually loads.
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = Boolean(farmer.photo_url) && !imageFailed;

  const locationLine = [farmer.address_city, farmer.address_state].filter(Boolean).join(', ');
  const metaLine = [locationLine, farmer.distance_km !== null ? `${formatDistance(farmer.distance_km)} away` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View>
      <View style={styles.photoWrap}>
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
            <MaterialIcons name="storefront" size={56} color={colors.textMuted} />
          </View>
        )}
        <Pressable
          style={[styles.back, { top: insets.top + spacing.sm }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{farmer.farm_name}</Text>

        {metaLine ? (
          <View style={styles.metaRow}>
            <MaterialIcons name="place" size={15} color={colors.textMuted} />
            <Text style={styles.metaText}>{metaLine}</Text>
          </View>
        ) : null}

        {farmer.years_in_operation !== null ? (
          <View style={styles.metaRow}>
            <MaterialIcons name="schedule" size={15} color={colors.textMuted} />
            <Text style={styles.metaText}>{farmer.years_in_operation} years in operation</Text>
          </View>
        ) : null}

        {farmer.farm_types.length > 0 ? (
          <View style={styles.chipRow}>
            {farmer.farm_types.map((type) => (
              <View key={type} style={styles.chip}>
                <Text style={styles.chipText}>{FARM_TYPE_LABELS[type] ?? type}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {farmer.bio ? <Text style={styles.bio}>{farmer.bio}</Text> : null}

        {farmer.certifications.length > 0 ? (
          <View style={styles.chipRow}>
            {farmer.certifications.map((cert, index) => (
              <View key={`${cert.cert_type}-${index}`} style={[styles.chip, styles.certChip]}>
                <MaterialIcons name="verified" size={13} color={colors.primary} style={styles.certIcon} />
                <Text style={[styles.chipText, styles.certChipText]}>{cert.cert_name}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const PHOTO_HEIGHT = 190;

const styles = StyleSheet.create({
  photoWrap: { width: '100%', height: PHOTO_HEIGHT, backgroundColor: colors.background },
  photo: { width: '100%', height: '100%' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  back: {
    position: 'absolute',
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  info: { padding: spacing.lg, paddingBottom: spacing.xs },
  name: { fontFamily: fonts.headlineBold, fontSize: 28, lineHeight: 34, color: colors.text, marginBottom: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metaText: { fontSize: 13, color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  certChip: { backgroundColor: '#EAF2EC', borderColor: colors.primary },
  certChipText: { color: colors.primaryDark },
  certIcon: { marginRight: 3 },
  bio: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: spacing.sm },
});
