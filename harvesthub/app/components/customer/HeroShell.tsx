import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import { Logo } from '../Logo';

type Props = {
  headline: string;
  subheadline?: string;
  // Optional right-side content in the brand row (Home's cart+avatar) —
  // most screens using this shell don't pass one.
  right?: ReactNode;
  // Bottom slot below the headline — Home's search bar, the
  // DateRangeFilter on Dashboard/Orders, or nothing (Account).
  children?: ReactNode;
};

// The shared gradient hero shell behind Home's Header, and now Dashboard/
// Orders/Account's compact heroes too — same brand row (HH logo +
// "HarvestHub"), same headline treatment, everything below the brand row
// is screen-specific (passed in via right/children).
export function HeroShell({ headline, subheadline, right, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.primaryMid, colors.primary, colors.primaryDark]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.glow} />

      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Logo size={LOGO_SIZE} />
          <Text style={styles.brandText}>HarvestHub</Text>
        </View>
        {right ? <View style={styles.topRowRight}>{right}</View> : null}
      </View>

      <Text style={styles.headline}>{headline}</Text>
      {subheadline ? <Text style={styles.subheadline}>{subheadline}</Text> : null}

      {children ? <View style={styles.bottomSlot}>{children}</View> : null}
    </LinearGradient>
  );
}

const LOGO_SIZE = 30;

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    right: -50,
    top: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${colors.accent}26`,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandText: { fontFamily: fonts.brand, fontSize: 15, color: colors.background, letterSpacing: 0.2 },
  topRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headline: {
    fontFamily: fonts.headline,
    fontSize: 26,
    lineHeight: 32,
    color: colors.background,
    marginTop: spacing.lg,
    maxWidth: 300,
  },
  subheadline: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(246,242,231,0.75)',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  bottomSlot: { marginTop: spacing.md },
});
