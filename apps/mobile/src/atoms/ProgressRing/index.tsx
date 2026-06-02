import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fontSize, fontWeight } from '../../theme/tokens';

interface ProgressRingProps {
  value: number;        // 0–100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showPercent?: boolean;
}

export function ProgressRing({
  value, size = 72, strokeWidth = 6, color = colors.success, label, showPercent = true,
}: ProgressRingProps) {
  const clamp = Math.min(100, Math.max(0, value));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamp, { duration: 800 });
  }, [clamp]);

  // Pure RN fallback (Skia version quando disponível)
  const inner = size - strokeWidth * 2;

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: inner, height: inner, borderRadius: inner / 2,
          backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
          borderWidth: strokeWidth, borderColor: clamp > 0 ? color : colors.border,
        }}>
          {showPercent && (
            <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.black, color: colors.text }}>
              {clamp}%
            </Text>
          )}
        </View>
      </View>
      {label && <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.muted, textAlign: 'center' }}>{label}</Text>}
    </View>
  );
}
