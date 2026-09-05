import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';
import { pickVerificationDocument } from '../lib/storage';
import type { PickedFile } from '../lib/validation/schemas';

type Props = {
  label: string;
  value: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
  required?: boolean;
};

export function DocumentUploadField({ label, value, onChange, required }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handlePick = async () => {
    setError(null);
    try {
      const file = await pickVerificationDocument();
      if (file) onChange(file);
    } catch {
      setError('Could not open the file picker. Try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <Pressable style={styles.button} onPress={handlePick}>
        <Text style={styles.buttonText} numberOfLines={1}>
          {value ? value.name : 'Choose file'}
        </Text>
      </Pressable>
      {value ? (
        <Pressable onPress={() => onChange(null)}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { fontSize: 13, color: colors.text, marginBottom: spacing.xs, fontWeight: '500' },
  button: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    backgroundColor: colors.surface,
  },
  buttonText: { color: colors.textMuted },
  remove: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
});
