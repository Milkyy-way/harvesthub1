import { ScrollView, View, Pressable, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radius } from '../../constants/theme';
import type { Category } from '../../types/database';

type Props = {
  categories: Category[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  // 'icons' — Home's browse row: a big emoji with the name underneath,
  // nothing boxed around it. 'pills' — compact chips where space is tight
  // (the farm page, next to the list/grid toggle).
  variant?: 'icons' | 'pills';
};

// The 8 category slugs are fixed by 0008's CHECK constraint.
const CATEGORY_EMOJI: Record<string, string> = {
  vegetables: '🥕',
  fruits: '🍎',
  eggs: '🥚',
  dairy: '🥛',
  meat: '🥩',
  herbs: '🌿',
  flowers: '🌻',
  honey: '🍯',
};

export function CategoryRail({ categories, selectedSlug, onSelect, variant = 'pills' }: Props) {
  const icons = variant === 'icons';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={icons ? styles.iconsScrollView : styles.pillsScrollView}
      contentContainerStyle={icons ? styles.iconsContent : styles.pillsContent}
    >
      {categories.map((category) => {
        const active = category.slug === selectedSlug;
        const toggle = () => onSelect(active ? null : category.slug);

        if (icons) {
          return (
            <Pressable key={category.id} style={styles.iconItem} onPress={toggle}>
              <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                {CATEGORY_EMOJI[category.slug] ? (
                  <Text style={styles.emoji}>{CATEGORY_EMOJI[category.slug]}</Text>
                ) : (
                  <MaterialIcons
                    name={(category.icon_name ?? 'eco') as React.ComponentProps<typeof MaterialIcons>['name']}
                    size={28}
                    color={colors.primary}
                  />
                )}
              </View>
              <Text style={[styles.iconLabel, active && styles.iconLabelActive]} numberOfLines={1}>
                {category.name}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={category.id} style={[styles.pill, active && styles.pillActive]} onPress={toggle}>
            {CATEGORY_EMOJI[category.slug] ? <Text style={styles.pillEmoji}>{CATEGORY_EMOJI[category.slug]}</Text> : null}
            <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{category.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const ICON_CIRCLE = 60;

const styles = StyleSheet.create({
  // Fixed, explicit heights — without them, a horizontal ScrollView with no
  // declared size in a column layout doesn't reliably keep its own space in
  // React Native's flexbox (it can end up sized by neighboring siblings
  // instead of its own content, which made the rail grow/shrink depending
  // on how many cards were rendered below it).
  iconsScrollView: { flexGrow: 0, flexShrink: 0, height: 96 },
  iconsContent: { paddingHorizontal: spacing.lg, gap: spacing.md, alignItems: 'flex-start' },
  iconItem: { width: ICON_CIRCLE + 6, alignItems: 'center' },
  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconCircleActive: { backgroundColor: '#EAF2EC', borderColor: colors.primary },
  emoji: { fontSize: 34 },
  iconLabel: { fontSize: 12.5, color: colors.text, marginTop: 4, fontWeight: '500' },
  iconLabelActive: { color: colors.primary, fontWeight: '800' },

  pillsScrollView: { flexGrow: 0, flexShrink: 0, height: 52 },
  pillsContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  pillActive: { backgroundColor: colors.primary },
  pillEmoji: { fontSize: 14 },
  pillLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  pillLabelActive: { color: colors.white },
});
