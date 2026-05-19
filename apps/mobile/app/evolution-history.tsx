/**
 * Evolution History — Histórico de evolução por área de vida
 * Visualiza a trajetória de todas as métricas registradas pelo SWE-CI.
 */
import { useI18n } from '../src/hooks/useI18n';
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EvolutionChart, type EvolutionPoint } from '../src/molecules/EvolutionChart';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

interface EvolutionSequence {
  area: string;
  metric: string;
  points: EvolutionPoint[];
  trendLabel: 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down';
  patternInsight: string;
  volatility: number;
  trend: { slope: number; rSquared: number };
}

interface HistoryPayload {
  userId: string;
  days: number;
  sequences: EvolutionSequence[];
  totalPoints: number;
  areasWithData: string[];
}

const DAYS_OPTIONS = [7, 30, 90] as const;
type DaysOption = typeof DAYS_OPTIONS[number];

const AREA_ICONS: Record<string, string> = {
  habitos: '📋',
  metas: '🎯',
  financeiro: '💰',
  fitness: '💪',
  calendario: '📅',
  tarefas: '✅',
  insights: '🧠',
  dashboard: '🏠',
  foco: '🎯',
  perfil: '👤',
};

const TREND_COLORS: Record<EvolutionSequence['trendLabel'], string> = {
  strong_up: '#00b894',
  up: '#55efc4',
  flat: '#74b9ff',
  down: '#fdcb6e',
  strong_down: '#e17055',
};

function EmptyState({ days }: { days: number }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>📊</Text>
      <Text style={styles.emptyTitle}>Sem dados nos últimos {days} dias</Text>
      <Text style={styles.emptySub}>
        O SWE-CI registra métricas automaticamente durante as sessões do copiloto.
        Complete check-ins e use o copiloto para acumular histórico.
      </Text>
    </View>
  );
}

function SummaryRow({ sequences }: { sequences: EvolutionSequence[] }) {
  const { t } = useI18n();
  const improving = sequences.filter((s) => s.trendLabel === 'strong_up' || s.trendLabel === 'up').length;
  const declining = sequences.filter((s) => s.trendLabel === 'strong_down' || s.trendLabel === 'down').length;
  const stable    = sequences.length - improving - declining;

  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryNum, { color: '#00b894' }]}>{improving}</Text>
        <Text style={styles.summaryLabel}>{t('evolutionHistory.improving')}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryNum, { color: '#74b9ff' }]}>{stable}</Text>
        <Text style={styles.summaryLabel}>{t('evolutionHistory.stable')}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryNum, { color: '#e17055' }]}>{declining}</Text>
        <Text style={styles.summaryLabel}>{t('evolutionHistory.declining')}</Text>
      </View>
    </View>
  );
}

export default function EvolutionHistoryScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<DaysOption>(30);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async (forceDays?: DaysOption, forceArea?: string) => {
    const d = forceDays ?? days;
    const a = forceArea ?? selectedArea;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/copilot/evolution-history?userId=default&days=${d}&area=${a}`
      );
      if (res.ok) {
        const json = await res.json() as HistoryPayload;
        setData(json);
      }
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days, selectedArea]);

  React.useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDaysChange = (d: DaysOption) => {
    setDays(d);
    fetchHistory(d, selectedArea);
  };

  const handleAreaChange = (a: string) => {
    setSelectedArea(a);
    fetchHistory(days, a);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const sequences = data?.sequences ?? [];
  const areasWithData = data?.areasWithData ?? [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{t('evolutionHistory.title')}</Text>
          <Text style={styles.subtitle}>Histórico de métricas SWE-CI</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Days filter */}
        <Animated.View entering={FadeInDown.delay(0)} style={styles.daysRow}>
          {DAYS_OPTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dayChip, days === d && styles.dayChipActive]}
              onPress={() => handleDaysChange(d)}
            >
              <Text style={[styles.dayChipText, days === d && styles.dayChipTextActive]}>
                {d}d
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Area filter */}
        {areasWithData.length > 0 && (
          <Animated.View entering={FadeInDown.delay(40)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaScroll}>
              <TouchableOpacity
                style={[styles.areaChip, selectedArea === 'all' && styles.areaChipActive]}
                onPress={() => handleAreaChange('all')}
              >
                <Text style={[styles.areaChipText, selectedArea === 'all' && styles.areaChipTextActive]}>
                  🌍 Todas
                </Text>
              </TouchableOpacity>
              {areasWithData.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.areaChip, selectedArea === a && styles.areaChipActive]}
                  onPress={() => handleAreaChange(a)}
                >
                  <Text style={[styles.areaChipText, selectedArea === a && styles.areaChipTextActive]}>
                    {AREA_ICONS[a] ?? '📊'} {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#7C3AED" size="large" />
            <Text style={styles.loadingText}>Carregando histórico...</Text>
          </View>
        ) : sequences.length === 0 ? (
          <EmptyState days={days} />
        ) : (
          <>
            {/* Summary */}
            <Animated.View entering={FadeInDown.delay(80)} style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {data?.totalPoints ?? 0} pontos · {sequences.length} métricas rastreadas
              </Text>
              <SummaryRow sequences={sequences} />
            </Animated.View>

            {/* Charts */}
            <View style={styles.chartsList}>
              {sequences.map((seq, i) => (
                <Animated.View
                  key={`${seq.area}-${seq.metric}`}
                  entering={FadeInDown.delay(120 + i * 40)}
                  style={[styles.chartWrapper, { borderColor: TREND_COLORS[seq.trendLabel] + '44' }]}
                >
                  <View style={styles.chartMeta}>
                    <Text style={styles.chartAreaLabel}>
                      {AREA_ICONS[seq.area] ?? '📊'} {seq.area}
                    </Text>
                    <Text style={[styles.chartVolatility, { color: seq.volatility > 2 ? '#fdcb6e' : '#6B7280' }]}>
                      {seq.volatility > 2 ? t('evolutionHistory.highVolatility') : `R² ${seq.trend.rSquared.toFixed(2)}`}
                    </Text>
                  </View>
                  <EvolutionChart
                    area={seq.area}
                    metric={seq.metric}
                    points={seq.points}
                    trendLabel={seq.trendLabel}
                    patternInsight={seq.patternInsight}
                  />
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1F2937',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: '#7C3AED', fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '900', color: '#F9FAFB', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  scroll: { padding: 16, gap: 12 },

  daysRow: { flexDirection: 'row', gap: 8 },
  dayChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937',
    alignItems: 'center',
  },
  dayChipActive: { backgroundColor: '#2D1B6E', borderColor: '#7C3AED' },
  dayChipText: { fontSize: 13, color: '#6B7280', fontWeight: '700' },
  dayChipTextActive: { color: '#A78BFA' },

  areaScroll: { gap: 8, paddingVertical: 4 },
  areaChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937',
  },
  areaChipActive: { backgroundColor: '#1A1040', borderColor: '#7C3AED' },
  areaChipText: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'capitalize' },
  areaChipTextActive: { color: '#A78BFA' },

  loadingBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 13, color: '#6B7280' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#F9FAFB' },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', maxWidth: 280, lineHeight: 20 },

  summaryCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1F2937', gap: 12,
  },
  summaryTitle: { fontSize: 12, color: '#6B7280', fontWeight: '700', textAlign: 'center', textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 24, fontWeight: '900' },
  summaryLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' },
  summaryDivider: { width: 1, height: 32, backgroundColor: '#1F2937' },

  chartsList: { gap: 12 },
  chartWrapper: {
    borderRadius: 14, borderWidth: 1,
    overflow: 'hidden',
  },
  chartMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
    backgroundColor: '#111827',
  },
  chartAreaLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', textTransform: 'capitalize' },
  chartVolatility: { fontSize: 10, fontWeight: '600' },
});
