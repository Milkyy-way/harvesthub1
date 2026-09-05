import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../../constants/theme';

export default function CustomerOrders() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  text: { fontSize: 14, color: colors.textMuted },
});
