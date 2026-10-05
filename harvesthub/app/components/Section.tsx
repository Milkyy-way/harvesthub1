import type { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, fonts } from '../constants/theme';

type Props = {
  title?: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// A titled group of content straight on the page background — the
// replacement for white "card" boxes. Use inside an already-padded screen;
// separate rows inside it with hairlines, not boxes.
export function Section({ title, caption, actionLabel, onAction, children, style }: Props) {
  return (
    <View style={[styles.section, style]}>
      {title ? (
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          {actionLabel && onAction ? (
            <Pressable onPress={onAction} hitSlop={8}>
              <Text style={styles.action}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontFamily: fonts.headline, fontSize: 20, color: colors.text, marginBottom: spacing.xs },
  action: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  caption: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, marginBottom: spacing.sm },
});
