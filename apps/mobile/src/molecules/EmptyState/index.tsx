/**
 * Youli — EmptyState molecule
 * Design Squad: visual, motivador, com CTA claro.
 * Hormozi Squad: mostra a transformação, não só o vazio.
 * Copy Squad: texto que inspira ação, não culpa.
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAccessibility } from '../../accessibility/useAccessibility';

interface EmptyStateProps {
  emoji: string;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  style?: ViewStyle;
  /** Secondary action (e.g. "Importar do histórico") */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  emoji, title, body, ctaLabel, onCta, style,
  secondaryLabel, onSecondary,
}: EmptyStateProps) {
  const { fontMultiplier, highContrast } = useAccessibility();

  return (
    <Animated.View
      entering={FadeInDown.delay(100).duration(400)}
      style={[styles.container, style]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.emoji} accessibilityElementsHidden>{emoji}</Text>
      <Text style={[styles.title, { fontSize: 17 * fontMultiplier, color: highContrast ? '#FFFFFF' : '#F9FAFB' }]}>
        {title}
      </Text>
      <Text style={[styles.body, { fontSize: 14 * fontMultiplier, color: highContrast ? '#E0E0E0' : '#6B7280' }]}>
        {body}
      </Text>
      {ctaLabel && onCta && (
        <TouchableOpacity
          style={styles.cta}
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
      {secondaryLabel && onSecondary && (
        <TouchableOpacity
          style={styles.secondary}
          onPress={onSecondary}
          accessibilityRole="button"
          accessibilityLabel={secondaryLabel}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 12,
  },
  emoji: { fontSize: 52, marginBottom: 4 },
  title: {
    fontSize: 17, fontWeight: '800', color: '#F9FAFB',
    textAlign: 'center', lineHeight: 24,
  },
  body: {
    fontSize: 14, color: '#6B7280', textAlign: 'center',
    lineHeight: 21, maxWidth: 280,
  },
  cta: {
    marginTop: 8, backgroundColor: '#7C3AED', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 13,
    minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: {
    paddingHorizontal: 16, paddingVertical: 10,
    minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center',
  },
  secondaryText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
});
