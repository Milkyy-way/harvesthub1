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

// Choice chips — white pills floating on the page background (soft shadow,
// no border), green when selected. Same look as the category/filter chips.
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
          <Pressable key={option.value} style={[styles.tag, active && styles.tagActive]} onPress={() => toggle(option.value)}>
            <Text style={[styles.tagText, active && styles.tagTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tag: {
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 1,
  },
  tagActive: { backgroundColor: colors.primary },
  tagText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  tagTextActive: { color: colors.white },
});
