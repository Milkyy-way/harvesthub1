import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';

type Props = {
  amount: number;
};

// A warm, tinted banner (not a white card) — sits on the page background
// like a promo strip.
export function SavingsTicker({ amount }: Props) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => router.push('/(customer)/(tabs)/dashboard')}
    >
      <Text style={styles.emoji}>🧺</Text>
      <View style={styles.textWrap}>
        <Text style={styles.amount}>${amount.toFixed(2)} saved</Text>
        <Text style={styles.label}>buying direct from local farms</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Details</Text>
        <MaterialIcons name="chevron-right" size={16} color={colors.primaryDark} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: `${colors.accent}2E`,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { opacity: 0.8 },
  emoji: { fontSize: 30 },
  textWrap: { flex: 1 },
  amount: { fontFamily: fonts.headlineBold, fontSize: 20, color: colors.primaryDark },
  label: { fontSize: 12.5, color: colors.text, marginTop: 1 },
  cta: { flexDirection: 'row', alignItems: 'center' },
  ctaText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
});
