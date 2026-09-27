import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';

type Props = {
  amount: number;
};

export function SavingsTicker({ amount }: Props) {
  const router = useRouter();

  return (
    <Pressable style={styles.container} onPress={() => router.push('/(customer)/(tabs)/dashboard')}>
      <View style={styles.left}>
        <View style={styles.icon}>
          <MaterialIcons name="savings" size={17} color="#8A6A22" />
        </View>
        <View>
          <Text style={styles.amount}>${amount.toFixed(2)} saved</Text>
          <Text style={styles.label}>buying direct this month</Text>
        </View>
      </View>
      <Text style={styles.cta}>Details ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: -16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.accent}26`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: { fontFamily: fonts.headline, fontSize: 16, color: colors.text },
  label: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  cta: { fontSize: 10.5, fontWeight: '700', color: colors.primary },
});
