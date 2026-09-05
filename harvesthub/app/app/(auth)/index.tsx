import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../constants/theme';

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>HH</Text>
      </View>
      <Text style={styles.title}>HarvestHub</Text>
      <Text style={styles.subtitle}>Fresh, local, straight from the farm</Text>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.primaryButtonText}>Sign up</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.secondaryButtonText}>Log in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: colors.white, fontSize: 22, fontWeight: '600' },
  title: { color: colors.white, fontSize: 28, fontWeight: '600', marginBottom: spacing.xs },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: spacing.xl },
  actions: { width: '100%', marginTop: spacing.xl },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
