/**
 * Skeleton — loading placeholder com animação pulse
 * Uso: <Skeleton width={200} height={20} radius={6} />
 *      <Skeleton.Card />  — card de loading genérico
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

// Cards pré-compostos para uso rápido
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton height={12} style={{ marginTop: 10 }} />
      <Skeleton height={12} width="80%" style={{ marginTop: 6 }} />
      <Skeleton height={12} width="60%" style={{ marginTop: 6 }} />
    </View>
  );
}

function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </View>
  );
}

function SkeletonHero() {
  return (
    <View style={styles.hero}>
      <Skeleton height={20} width="50%" />
      <Skeleton height={14} width="35%" style={{ marginTop: 6 }} />
      <View style={styles.heroRings}>
        {[0,1,2,3].map(i => <Skeleton key={i} width={52} height={52} radius={26} />)}
      </View>
      <Skeleton height={44} radius={12} style={{ marginTop: 10 }} />
    </View>
  );
}

function SkeletonInsight() {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightTop}>
        <Skeleton width={60} height={20} radius={6} />
        <Skeleton width={80} height={14} radius={6} />
      </View>
      <Skeleton height={16} style={{ marginTop: 8 }} />
      <Skeleton height={12} width="85%" style={{ marginTop: 6 }} />
      <Skeleton height={12} width="70%" style={{ marginTop: 6 }} />
    </View>
  );
}

Skeleton.Card = SkeletonCard;
Skeleton.List = SkeletonList;
Skeleton.Hero = SkeletonHero;
Skeleton.Insight = SkeletonInsight;

const styles = StyleSheet.create({
  skeleton: { backgroundColor: '#1F2937' },
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1F2937', gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardHeaderText: { flex: 1, gap: 6 },
  hero: { backgroundColor: '#0D1117', borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: '#1F2937' },
  heroRings: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  insightCard: { backgroundColor: '#111827', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1F2937', gap: 4 },
  insightTop: { flexDirection: 'row', justifyContent: 'space-between' },
});
