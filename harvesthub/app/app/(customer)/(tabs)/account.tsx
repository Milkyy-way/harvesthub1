import { View, Text, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { colors, spacing, radius } from '../../../constants/theme';

export default function CustomerAccount() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{profile?.full_name ?? 'Your account'}</Text>
      <Text style={styles.note}>More account settings are coming soon.</Text>
      <Pressable style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  greeting: { fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  note: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xl },
  button: { borderWidth: 1, borderColor: colors.text, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: colors.text, fontWeight: '600' },
});
