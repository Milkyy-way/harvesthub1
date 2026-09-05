import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { uploadFarmPhoto } from '../../lib/farmerPhoto';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, radius } from '../../constants/theme';
import { PhotoUploadField } from '../../components/PhotoUploadField';
import type { PickedFile } from '../../lib/validation/schemas';

// Mandatory gate shown once, right after a farmer is approved — routed here
// by app/_layout.tsx whenever profile.status === 'active' but
// farmerProfile.photo_url is still null. This is the farmer's store/logo
// photo shown on their card in the customer feed, not a per-item product
// photo (that's a later checkpoint).
export default function AddFarmPhoto() {
  const { session, refreshProfile } = useAuth();
  const [photo, setPhoto] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!photo || !session?.user) return;
    setError(null);
    setUploading(true);
    try {
      const photoUrl = await uploadFarmPhoto(session.user.id, photo);
      const { error: updateError } = await supabase
        .from('farmer_profiles')
        .update({ photo_url: photoUrl })
        .eq('id', session.user.id);
      if (updateError) throw updateError;
      await refreshProfile();
    } catch {
      setError('Could not save your photo. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add your store photo</Text>
      <Text style={styles.subtitle}>
        This is what customers will see on your farm&apos;s card when they browse nearby farms.
      </Text>
      <PhotoUploadField value={photo} onChange={setPhoto} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, (!photo || uploading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!photo || uploading}
      >
        {uploading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Continue</Text>}
      </Pressable>
      <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  title: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.md, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 160,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: '600' },
  logout: { marginTop: spacing.lg, padding: spacing.xs },
  logoutText: { color: colors.textMuted, fontSize: 13 },
});
