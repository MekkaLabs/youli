/**
 * CheckButton — botão de check animado para hábitos
 * Estados: unchecked → checking (bounce) → checked (verde com ✓)
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';

interface CheckButtonProps {
  checked: boolean;
  onPress: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CheckButton({
  checked,
  onPress,
  color = '#059669',
  size = 36,
  disabled = false,
}: CheckButtonProps) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    if (checked) {
      // Bounce ao checar
      scale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 300 }),
        withSpring(0.9, { damping: 10 }),
        withSpring(1, { damping: 12 }),
      );
      progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    } else {
      scale.value = withSpring(1);
      progress.value = withTiming(0, { duration: 150 });
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
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
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
