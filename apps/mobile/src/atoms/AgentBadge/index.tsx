/**
 * AgentBadge
 * Exibe o agente especializado da tela atual com avatar emoji + nome
 * Aparece no canto superior da tela, clicável para consultar o agente
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';
import { pressScaleIn, pressScaleOut } from '../../theme/motion';

export interface AgentBadgeProps {
  name: string;         // Ex: "Leonardo"
  fullName?: string;    // Ex: "Leonardo da Vinci"
  emoji: string;        // Ex: "🎨"
  color: string;        // Hex da cor temática
  domain?: string;      // Ex: "Visão Sistêmica"
  onPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;    // Versão pequena (sem domain)
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function AgentBadge({
  name,
  fullName,
  emoji,
  color,
  domain,
  onPress,
  style,
  compact = false,
}: AgentBadgeProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = pressScaleIn(0.97);
  };

  const handlePressOut = () => {
    scale.value = pressScaleOut(1);
  };

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <AnimatedTouchable
        style={[styles.container, { borderColor: color + '40', backgroundColor: color + '12' }, animatedStyle, style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={!onPress}
      >
        {/* Emoji avatar com fundo colorido */}
        <View style={[styles.avatar, { backgroundColor: color + '25' }]}>
          <Text style={styles.avatarEmoji}>{emoji}</Text>
        </View>

        {/* Info do agente */}
        <View style={styles.info}>
          <Text style={[styles.name, { color }]} numberOfLines={1}>
            {name}
          </Text>
          {!compact && domain && (
            <Text style={styles.domain} numberOfLines={1}>
              {domain}
            </Text>
          )}
        </View>

        {/* Indicador de clicável */}
        {onPress && (
          <View style={[styles.dot, { backgroundColor: color }]} />
        )}
      </AnimatedTouchable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radii.full,
    borderWidth: 1,
    gap: tokens.spacing.xs,
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 14,
  },
  info: {
    flexShrink: 1,
  },
  name: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: 0.2,
  },
  domain: {
    fontSize: 9,
    color: tokens.colors.textMuted,
    letterSpacing: 0.1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.7,
  },
});
