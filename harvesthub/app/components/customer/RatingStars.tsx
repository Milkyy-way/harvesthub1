import { View, Pressable, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '../../constants/theme';

type Props = {
  value: number;
  onSelect?: (rating: number) => void;
  size?: number;
  disabled?: boolean;
};

const STAR_VALUES = [1, 2, 3, 4, 5];

export function RatingStars({ value, onSelect, size = 22, disabled }: Props) {
  return (
    <View style={styles.row}>
      {STAR_VALUES.map((star) => (
        <Pressable
          key={star}
          onPress={onSelect && !disabled ? () => onSelect(star) : undefined}
          disabled={!onSelect || disabled}
          hitSlop={6}
        >
          <MaterialIcons
            name={star <= value ? 'star' : 'star-border'}
            size={size}
            color={star <= value ? colors.accent : colors.border}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
