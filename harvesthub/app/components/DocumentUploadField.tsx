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
  // A file for this slot is already stored from an earlier save — picking a
  // new one replaces it; leaving it alone keeps the stored one.
  uploaded?: boolean;
  error?: string | null;
};

export function DocumentUploadField({ label, value, onChange, required, uploaded, error: fieldError }: Props) {
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
      <Pressable style={[styles.button, (value || uploaded) && styles.buttonDone]} onPress={handlePick}>
        <Text style={[styles.buttonText, (value || uploaded) && styles.buttonTextDone]} numberOfLines={1}>
          {value ? value.name : uploaded ? 'Uploaded ✓  ·  tap to replace' : 'Choose file'}
        </Text>
      </Pressable>
      {value ? (
        <Pressable onPress={() => onChange(null)}>
          <Text style={styles.remove}>{uploaded ? 'Keep the file already uploaded' : 'Remove'}</Text>
        </Pressable>
      ) : null}
      {error || fieldError ? <Text style={styles.error}>{error ?? fieldError}</Text> : null}
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
  buttonDone: { borderColor: colors.primaryMid },
  buttonText: { color: colors.textMuted },
  buttonTextDone: { color: colors.primary, fontWeight: '600' },
  remove: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
});
