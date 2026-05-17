/**
 * Youli — Floating Action Button (FAB)
 * Design Squad: posicionamento padrão iOS/Android, 56pt (acessível).
 * Acessibilidade: role="button", label descritivo, hitSlop generoso.
 */

import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { useAccessibility } from '../../accessibility/useAccessibility';

interface FABProps {
  label: string;
  icon?: string;
  onPress: () => void;
  style?: ViewStyle;
  color?: string;
  accessibilityLabel?: string;
}

const AnimTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function FAB({
  label, icon = '+', onPress, style, color = '#7C3AED', accessibilityLabel,
}: FABProps) {
  const { reduceMotion } = useAccessibility();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimTouchable
      onPress={onPress}
      onPressIn={() => { if (!reduceMotion) scale.value = withSpring(0.92, { damping: 14 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14 }); }}
      style={[styles.fab, { backgroundColor: color }, style, animStyle]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      activeOpacity={0.85}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.label}>{label}</Text>
    </AnimTouchable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 56,
    minHeight: 56,
    justifyContent: 'center',
    // Elevation / shadow
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: { fontSize: 20, color: '#fff', fontWeight: '900' },
  label: { fontSize: 14, color: '#fff', fontWeight: '800' },
});
