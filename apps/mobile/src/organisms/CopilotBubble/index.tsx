/**
 * CopilotBubble (v2)
 * Floating action button com pulso Reanimated
 * Abre modal com CopilotBar v2 (agentes especializados)
 * Lê o nome do orquestrador do AsyncStorage
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CopilotBar } from '../CopilotBar';
import { tokens } from '../../theme/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORAGE_KEY = '@youli:orchestrator';

interface CopilotBubbleProps {
  userContext?: object;
}

export function CopilotBubble({ userContext }: CopilotBubbleProps) {
  const [open, setOpen] = useState(false);
  const [orchName, setOrchName] = useState('Youli');
  const [orchEmoji, setOrchEmoji] = useState('🤖');
  const insets = useSafeAreaInsets();

  // Carrega config do orquestrador
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) {
        const { name, emoji } = JSON.parse(v);
        setOrchName(name);
        setOrchEmoji(emoji);
      }
    });
  }, [open]); // re-carrega quando fecha (usuário pode ter mudado)

  // Animação de pulso
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <Animated.View
          style={[
            styles.bubble,
            { bottom: insets.bottom + 90 },
            bubbleStyle,
          ]}
        >
          <TouchableOpacity
            onPress={() => setOpen(true)}
            style={styles.bubbleInner}
            activeOpacity={0.85}
          >
            <Text style={styles.bubbleEmoji}>{orchEmoji}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Modal do Copilot */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill} />
        </Pressable>

        {/* Sheet */}
        <Animated.View
          entering={SlideInDown.springify().damping(24).stiffness(220).mass(0.9)}
          style={[styles.sheet, { paddingBottom: insets.bottom }]}
        >
          <View style={styles.handle} />
          <CopilotBar
            onClose={() => setOpen(false)}
            orchestratorName={orchName}
            orchestratorEmoji={orchEmoji}
            userContext={userContext}
          />
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    right: 20,
    zIndex: 200,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  bubbleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleEmoji: {
    fontSize: 26,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.88,
    backgroundColor: tokens.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
});
