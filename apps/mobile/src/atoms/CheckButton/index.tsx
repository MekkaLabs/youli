/**
 * CheckButton — botão de check animado para hábitos
 * Estados: unchecked → checking (bounce) → checked (verde com ✓)
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { iosSpring, iosTiming } from '../../theme/motion';

interface CheckButtonProps {
  checked: boolean;
  onPress: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
  /** Screen reader label — e.g. "Marcar hábito Meditação como concluído" */
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CheckButton({
  checked,
  onPress,
  color = '#059669',
  size = 36,
  disabled = false,
  accessibilityLabel,
}: CheckButtonProps) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    if (checked) {
      // iOS-like: micro-pop sem overshoot agressivo
      scale.value = withSpring(1.06, { ...iosSpring.gentle, overshootClamping: true });
      setTimeout(() => {
        scale.value = withSpring(1, iosSpring.gentle);
      }, 80);
      progress.value = withTiming(1, { duration: iosTiming.fast, easing: iosTiming.easeOut });
    } else {
      scale.value = withSpring(1, iosSpring.gentle);
      progress.value = withTiming(0, { duration: 140, easing: iosTiming.easeOut });
    }
  }, [checked]);

  const animStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(255,255,255,0.06)', color],
    );
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      ['#374151', color],
    );
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: bg,
      borderColor,
    };
  });

  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          // Ensure minimum tap target even if visual size is smaller
          minWidth: Math.max(size, 44),
          minHeight: Math.max(size, 44),
        },
        animStyle,
      ]}
    >
      <Animated.Text
        style={[
          styles.check,
          { fontSize: size * 0.5, lineHeight: size * 0.6 },
          checkStyle,
        ]}
      >
        ✓
      </Animated.Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
