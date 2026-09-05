import { TextInput, Text, View, StyleSheet, type TextInputProps } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

type Props = TextInputProps & { error?: string | null };

export function TextField({ style, error, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput style={[styles.input, style]} placeholderTextColor={colors.textMuted} {...props} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
});
