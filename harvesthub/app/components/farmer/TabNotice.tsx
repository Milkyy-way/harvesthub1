import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import type { ProfileStatus } from '../../types/database';

type Props = {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  body: string;
  tone?: 'locked' | 'info';
};

// Centered message filling a farmer tab that has nothing to show yet —
// either locked (not approved) or not built yet (Products/Orders before
// Farmer F2/F3).
export function TabNotice({ icon, title, body, tone = 'info' }: Props) {
  const color = tone === 'locked' ? colors.textMuted : colors.primary;
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
        <MaterialIcons name={icon} size={30} color={color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

// What a locked tab says, by why it's locked. Products/Orders unlock once
// profiles.status is 'active'.
export function LockedTabNotice({ status, feature }: { status: ProfileStatus | undefined; feature: string }) {
  const body =
    status === 'rejected'
      ? `Your application needs changes before it can be approved. See Home for the reviewer's notes, then resubmit to unlock ${feature}.`
      : status === 'suspended'
        ? `Your farmer account is suspended, so ${feature} is unavailable. Contact HarvestHub support for details.`
        : `${feature} unlocks as soon as HarvestHub approves your application. We'll let you know when that happens.`;
  return <TabNotice icon="lock" tone="locked" title={`${feature} is locked`} body={body} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.headline, fontSize: 20, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  body: { fontSize: 13.5, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
});
