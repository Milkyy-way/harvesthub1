import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  // Multi-select by default (dietary tags, farm types). Single-select mode
  // (referral source) reuses the same pill UI instead of a separate component.
  multiple?: boolean;
};

export function TagSelector<T extends string>({ options, value, onChange, multiple = true }: Props<T>) {
  const toggle = (option: T) => {
    if (!multiple) {
      onChange(value.includes(option) ? [] : [option]);
      return;
    }
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = value.includes(option.value);
        return (
          <Pressable
            key={option.value}
            style={[styles.tag, active && styles.tagActive]}
            onPress={() => toggle(option.value)}
          >
            <Text style={[styles.tagText, active && styles.tagTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  tag: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  tagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  tagTextActive: { color: colors.white },
});
