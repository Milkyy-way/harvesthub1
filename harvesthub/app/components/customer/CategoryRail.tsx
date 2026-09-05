import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';
import type { Category } from '../../types/database';

type Props = {
  categories: Category[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
};

export function CategoryRail({ categories, selectedSlug, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.content}
    >
      {categories.map((category) => {
        const active = category.slug === selectedSlug;
        return (
          <Pressable
            key={category.id}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onSelect(active ? null : category.slug)}
          >
            {category.icon_name ? (
              <MaterialIcons
                name={category.icon_name as React.ComponentProps<typeof MaterialIcons>['name']}
                size={16}
                color={active ? colors.white : colors.textMuted}
                style={styles.icon}
              />
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]}>{category.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Fixed, explicit height — without this, a horizontal ScrollView with no
  // declared size in a column layout doesn't reliably keep its own space in
  // React Native's flexbox (Yoga defaults flexShrink to 0, but with no
  // basis/height either, it can end up sized by neighboring siblings
  // instead of its own content, which is what caused the rail to visibly
  // grow/shrink depending on how many farmer cards were rendered below it).
  scrollView: { flexGrow: 0, flexShrink: 0, height: 52, marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xs, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  icon: { marginRight: 4 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  labelActive: { color: colors.white },
});
