/**
 * VoiceButton — átomo de microfone animado
 * Mostra estado: idle | listening | processing
 */

import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

export type VoiceState = 'idle' | 'listening' | 'processing';

interface VoiceButtonProps {
  state?: VoiceState;
  size?: number;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const STATE_COLORS: Record<VoiceState, string> = {
  idle: '#6B7280',       // cinza
  listening: '#EF4444',  // vermelho
  processing: '#7C3AED', // roxo (cor do dashboard/Leonardo)
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function VoiceButton({
  state = 'idle',
  size = 44,
  onPress,
  disabled = false,
  style,
}: VoiceButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (state === 'listening') {
      // Pulso rítmico vermelho
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 400, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        true,
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.7, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1,
        true,
      );
    } else if (state === 'processing') {
      // Rotação suave (simula thinking)
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600 }),
          withTiming(0.95, { duration: 600 }),
        ),
        -1,
        true,
      );
      opacity.value = 1;
    } else {
      // Idle: spring de retorno
      scale.value = withSpring(1);
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [state]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const color = STATE_COLORS[state];
  const iconSize = size * 0.45;

  return (
    <AnimatedTouchable
      onPress={onPress}
      disabled={disabled || state === 'processing'}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: state === 'idle' ? 'rgba(107,114,128,0.12)' : `${color}22`,
          borderColor: color,
        },
        animStyle,
        style,
      ]}
    >
      {/* Ícone SVG inline do microfone via Text — use react-native-svg em produção */}
      <Animated.Text
        style={{
          fontSize: iconSize,
          color,
          lineHeight: iconSize * 1.4,
        }}
      >
        {state === 'processing' ? '⟳' : '🎤'}
      </Animated.Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
