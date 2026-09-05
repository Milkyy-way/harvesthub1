import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, radius } from '../constants/theme';
import { pickFarmPhoto } from '../lib/farmerPhoto';
import type { PickedFile } from '../lib/validation/schemas';

type Props = {
  value: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
};

export function PhotoUploadField({ value, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handlePick = async () => {
    setError(null);
    try {
      const file = await pickFarmPhoto();
      if (file) onChange(file);
    } catch {
      setError('Could not open the photo picker. Try again.');
    }
  };

  return (
    <View style={styles.container}>
      {value ? (
        <Image source={{ uri: value.uri }} style={styles.preview} contentFit="cover" />
      ) : (
        <View style={[styles.preview, styles.previewFallback]}>
          <Text style={styles.previewFallbackText}>No photo selected</Text>
        </View>
      )}
      <Pressable style={styles.button} onPress={handlePick}>
        <Text style={styles.buttonText}>{value ? 'Choose a different photo' : 'Choose photo'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: spacing.lg },
  preview: {
    width: 160,
    height: 160,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  previewFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  previewFallbackText: { color: colors.textMuted, fontSize: 12 },
  button: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
  },
  buttonText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
});
