import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';

export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Legal</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.placeholderBanner}>
          <MaterialIcons name="info-outline" size={16} color={colors.accent} />
          <Text style={styles.placeholderBannerText}>
            Placeholder text below — swap in your real, reviewed Terms of Service and Privacy Policy before this ships to
            real customers.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Terms of Service</Text>
        <Text style={styles.body}>[TERMS OF SERVICE — add your reviewed terms here]</Text>

        <Text style={styles.sectionTitle}>Privacy Policy</Text>
        <Text style={styles.body}>[PRIVACY POLICY — add your reviewed privacy policy here]</Text>
      </ScrollView>
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
  headerTitle: { fontFamily: fonts.headline, fontSize: 17, color: colors.text },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  placeholderBanner: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: '#FBF1DC',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  placeholderBannerText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 17 },
  sectionTitle: { fontFamily: fonts.headline, fontSize: 16, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  body: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});
