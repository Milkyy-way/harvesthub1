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

export function SettingsRow({ icon, label, caption, onPress, destructive }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}>
        <MaterialIcons name={icon} size={18} color={destructive ? colors.danger : colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, destructive && styles.labelDestructive]}>{label}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {!destructive ? <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: '#EAF2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDestructive: { backgroundColor: '#F6E7E5' },
  textWrap: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  labelDestructive: { color: colors.danger },
  caption: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
