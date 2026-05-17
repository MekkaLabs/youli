/**
 * Youli — TodayFocusCard organism
 * Hormozi Squad: "Qual é a única coisa que, se feita, torna todo o resto mais fácil?"
 * Design Squad: card em destaque, violeta, número grande, CTA óbvio.
 * Copy Squad: linguagem direta, sem rodeios.
 *
 * Exibe na Dashboard a tarefa + hábito mais importantes do dia.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useI18n } from '../../hooks/useI18n';
import { useAccessibility } from '../../accessibility/useAccessibility';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

interface FocusItem {
  type: 'task' | 'habit' | 'goal';
  title: string;
  urgency: 'critical' | 'high' | 'normal';
  area?: string;
}

export function TodayFocusCard() {
  const { t } = useI18n();
  const { fontMultiplier, highContrast, reduceMotion } = useAccessibility();
  const [item, setItem] = useState<FocusItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch top priority from life-health gaps
    fetch(`${API_BASE}/api/copilot/life-health?userId=default`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const gap = data.topGaps?.[0];
        if (gap) {
          setItem({
            type: 'task',
            title: gap.requirement ?? gap.area,
            urgency: gap.gapMagnitude >= 30 ? 'critical' : gap.gapMagnitude >= 15 ? 'high' : 'normal',
            area: gap.area,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#7C3AED" size="small" />
      </View>
    );
  }

  if (!item) return null;

  const urgencyColor = item.urgency === 'critical' ? '#EF4444'
    : item.urgency === 'high' ? '#F59E0B' : '#7C3AED';
  const urgencyLabel = item.urgency === 'critical' ? '🔴 Crítico'
    : item.urgency === 'high' ? '🟡 Alta prioridade' : '🟣 Foco do dia';

  const navigateTo = () => {
    if (item.area === 'habitos') router.push('/(tabs)/habitos' as any);
    else if (item.area === 'metas') router.push('/(tabs)/metas' as any);
    else if (item.area === 'fitness') router.push('/(tabs)/fitness' as any);
    else router.push('/(tabs)/tarefas' as any);
  };

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.delay(50).duration(400)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Foco do dia: ${item.title}`}
    >
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: urgencyColor }, highContrast && styles.cardHC]}
        onPress={navigateTo}
        activeOpacity={0.8}
      >
        <View style={styles.topRow}>
          <Text style={[styles.urgencyTag, { color: urgencyColor }]}>{urgencyLabel}</Text>
          <Text style={styles.tapHint}>Ver →</Text>
        </View>
        <Text style={[styles.title, { fontSize: 16 * fontMultiplier }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.area && (
          <View style={[styles.areaChip, { backgroundColor: urgencyColor + '22' }]}>
            <Text style={[styles.areaText, { color: urgencyColor }]}>
              {item.area.charAt(0).toUpperCase() + item.area.slice(1)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loading: { padding: 16, alignItems: 'center' },
  card: {
    backgroundColor: '#0D0D1A',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1F2937',
    borderLeftWidth: 4, gap: 8,
  },
  cardHC: { backgroundColor: '#000', borderColor: '#fff' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  urgencyTag: { fontSize: 12, fontWeight: '800' },
  tapHint: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  title: {
    fontSize: 16, fontWeight: '800', color: '#F9FAFB', lineHeight: 22,
  },
  areaChip: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  areaText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
