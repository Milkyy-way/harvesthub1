import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';

type Props = {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  caption?: string;
  onPress: () => void;
  destructive?: boolean;
};

// A list row straight on the page background — tinted icon, label, chevron,
// hairline underneath (no white box). Stack several for a menu.
export function SettingsRow({ icon, label, caption, onPress, destructive }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}>
        <MaterialIcons name={icon} size={19} color={destructive ? colors.danger : colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>{label}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {!destructive ? <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDestructive: { backgroundColor: '#F6E7E5' },
  textWrap: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  labelDestructive: { color: colors.danger },
  caption: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
});
