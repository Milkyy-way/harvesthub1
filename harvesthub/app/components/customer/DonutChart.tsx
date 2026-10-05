import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, fonts } from '../../constants/theme';
import { DONUT_STEP_DEG, allocateTicks, percentLabel, segmentAtPoint } from '../../lib/donut';

export type DonutSegment = {
  key: string;
  label: string;
  sublabel?: string; // e.g. what "Other" contains
  value: number;
  color: string;
};

type Props = {
  segments: DonutSegment[]; // in drawing order, clockwise from 12 o'clock
  formatValue: (value: number) => string;
  centerCaption: string; // under the total, e.g. "on produce"
  size?: number;
  thickness?: number;
};

const TICK_WIDTH = 3.6;

// Part-to-whole at a glance (≤ 6 segments — fold the rest into "Other").
// The legend under the ring is the readable version of the same numbers
// (name, amount, share), so color is never the only way to tell segments
// apart. Tap a segment or a legend row to highlight it; tap again to clear.
export function DonutChart({ segments, formatValue, centerCaption, size = 188, thickness = 20 }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const counts = useMemo(() => allocateTicks(segments.map((s) => s.value)), [segments]);

  const ticks = useMemo(() => {
    const out: { index: number; segment: number }[] = [];
    let index = 0;
    segments.forEach((_, si) => {
      for (let t = 0; t < counts[si]; t++, index++) {
        // First tick of each segment stays empty: the gap between neighbors.
        if (segments.length > 1 && t === 0) continue;
        out.push({ index, segment: si });
      }
    });
    return out;
  }, [segments, counts]);

  const selectedIndex = segments.findIndex((s) => s.key === selectedKey);
  const selected = selectedIndex >= 0 ? segments[selectedIndex] : null;
  const toggle = (key: string) => setSelectedKey((prev) => (prev === key ? null : key));

  const summary = segments.map((s) => `${s.label} ${formatValue(s.value)} (${percentLabel(s.value, total)})`).join(', ');

  return (
    <View>
      <View style={styles.chartRow}>
        <Pressable
          style={{ width: size, height: size }}
          onPress={(e) => {
            const i = segmentAtPoint(e.nativeEvent.locationX, e.nativeEvent.locationY, size, thickness, counts);
            if (i === null) setSelectedKey(null);
            else toggle(segments[i].key);
          }}
          accessibilityRole="image"
          accessibilityLabel={`${formatValue(total)} ${centerCaption}: ${summary}`}
        >
          {ticks.map((tick) => (
            <View
              key={tick.index}
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${(tick.index + 0.5) * DONUT_STEP_DEG}deg` }] }]}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: size / 2 - TICK_WIDTH / 2,
                  width: TICK_WIDTH,
                  height: thickness,
                  backgroundColor: segments[tick.segment].color,
                  opacity: selectedIndex === -1 || selectedIndex === tick.segment ? 1 : 0.22,
                }}
              />
            </View>
          ))}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
            {selected ? (
              <>
                <Text style={styles.centerLabel} numberOfLines={1}>
                  {selected.label}
                </Text>
                <Text style={styles.centerValue}>{formatValue(selected.value)}</Text>
                <Text style={styles.centerCaption}>{percentLabel(selected.value, total)} of total</Text>
              </>
            ) : (
              <>
                <Text style={styles.centerValue}>{formatValue(total)}</Text>
                <Text style={styles.centerCaption}>{centerCaption}</Text>
              </>
            )}
          </View>
        </Pressable>
      </View>

      <View style={styles.legend}>
        {segments.map((segment) => {
          const isSelected = segment.key === selectedKey;
          return (
            <Pressable
              key={segment.key}
              style={[styles.legendRow, isSelected && styles.legendRowSelected]}
              onPress={() => toggle(segment.key)}
            >
              <View style={[styles.swatch, { backgroundColor: segment.color }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendLabel}>{segment.label}</Text>
                {segment.sublabel ? (
                  <Text style={styles.legendSublabel} numberOfLines={1}>
                    {segment.sublabel}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.legendValue}>{formatValue(segment.value)}</Text>
              <Text style={styles.legendPct}>{percentLabel(segment.value, total)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartRow: { alignItems: 'center', marginVertical: spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  centerLabel: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted },
  centerValue: { fontFamily: fonts.headlineBold, fontSize: 26, color: colors.text },
  centerCaption: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  legend: { marginTop: spacing.md },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  legendRowSelected: { backgroundColor: colors.tint },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { flex: 1 },
  legendLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  legendSublabel: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  legendValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  legendPct: { width: 40, textAlign: 'right', fontSize: 13, color: colors.textMuted },
});
