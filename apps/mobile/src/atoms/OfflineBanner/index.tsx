/**
 * OfflineBanner — barra deslizante que aparece quando sem conexão
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkStatus } from '../../hooks/useNetworkStatus';

interface OfflineBannerProps {
  status: NetworkStatus;
}

export function OfflineBanner({ status }: OfflineBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const isOffline = status === 'offline';
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (isOffline) {
      // Desliza para baixo (visível)
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current && status === 'online') {
      // Volta a conexão: mantém visível 1.5s mostrando "Conectado!" depois some
      Animated.sequence([
        Animated.delay(1500),
        Animated.spring(translateY, {
          toValue: -80,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
      ]).start(() => {
        wasOfflineRef.current = false;
      });
    }
  }, [isOffline, status, translateY]);

  const topOffset = insets.top;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: topOffset, transform: [{ translateY }], pointerEvents: 'none' },
        isOffline ? styles.offline : styles.online,
      ]}
    >
      <Text style={styles.icon}>{isOffline ? '📡' : '✅'}</Text>
      <View>
        <Text style={styles.title}>
          {isOffline ? 'Sem conexão' : 'Conectado!'}
        </Text>
        <Text style={styles.subtitle}>
          {isOffline
            ? 'Alguns recursos podem estar indisponíveis'
            : 'Sincronizando dados...'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  offline: { backgroundColor: '#1F0A0A', borderWidth: 1, borderColor: '#7F1D1D' },
  online:  { backgroundColor: '#0A1F0A', borderWidth: 1, borderColor: '#14532D' },
  icon: { fontSize: 20 },
  title: { fontSize: 13, fontWeight: '700', color: '#F9FAFB' },
  subtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
});
