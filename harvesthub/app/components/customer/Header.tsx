import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, fonts } from '../../constants/theme';
import { HeroShell } from './HeroShell';
import { SearchBar } from './SearchBar';

type Props = {
  addressCity: string | null;
  nearbyFarmCount: number | null;
  searchValue: string;
  onSearchChange: (text: string) => void;
  cartItemCount: number;
  onPressCart: () => void;
  avatarInitial: string;
};

export function Header({
  addressCity,
  nearbyFarmCount,
  searchValue,
  onSearchChange,
  cartItemCount,
  onPressCart,
  avatarInitial,
}: Props) {
  const router = useRouter();

  return (
    <HeroShell
      headline={`What's fresh near ${addressCity ?? 'you'} this week`}
      subheadline={
        nearbyFarmCount != null
          ? `Fresh picks from ${nearbyFarmCount} farm${nearbyFarmCount === 1 ? '' : 's'} nearby.`
          : 'Finding farms near you…'
      }
      right={
        <>
          <Pressable style={styles.cartButton} onPress={onPressCart} hitSlop={8}>
            <MaterialIcons name="shopping-basket" size={19} color={colors.background} />
            {cartItemCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartItemCount > 99 ? '99+' : cartItemCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable style={styles.avatar} onPress={() => router.push('/(customer)/(tabs)/account')} hitSlop={4}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </Pressable>
        </>
      }
    >
      <BlurView intensity={40} tint="light" style={styles.searchWrap}>
        <SearchBar value={searchValue} onChangeText={onSearchChange} variant="frosted" />
      </BlurView>
    </HeroShell>
  );
}

const AVATAR_SIZE = 38;

const styles = StyleSheet.create({
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.primaryDark, fontSize: 10, fontWeight: '800' },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.headline, fontSize: 16, color: colors.primaryDark },
  searchWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
