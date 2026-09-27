import { View, TextInput, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  // 'frosted' sits directly on Header's gradient hero (see Header.tsx,
  // wrapped in a BlurView there) — light text/icon on a translucent
  // background, no own margins since the hero controls its own spacing.
  variant?: 'default' | 'frosted';
};

export function SearchBar({ value, onChangeText, placeholder = 'Search products, farms', variant = 'default' }: Props) {
  const frosted = variant === 'frosted';
  return (
    <View style={[styles.container, frosted && styles.containerFrosted]}>
      <MaterialIcons name="search" size={20} color={frosted ? 'rgba(246,242,231,0.75)' : colors.textMuted} />
      <TextInput
        style={[styles.input, frosted && styles.inputFrosted]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={frosted ? 'rgba(246,242,231,0.75)' : colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  containerFrosted: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  inputFrosted: { color: colors.background, fontSize: 13 },
});
