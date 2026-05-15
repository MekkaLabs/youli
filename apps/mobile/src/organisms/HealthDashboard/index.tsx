/**
 * HealthDashboard — painel completo de saúde e fitness
 * Exibe rings de progresso, métricas do dia, tendência semanal e treinos recentes
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useHealth, HEALTH_GOALS, WorkoutSession, DailyHealthData } from '../../hooks/useHealth';

// ── Mini ring de progresso (SVG) ──────────────────────────────────────────
interface ProgressRingMiniProps {
  progress: number;  // 0-100
  color: string;
  size?: number;
  strokeWidth?: number;
  label: string;
  value: string;
}

function ProgressRingMini({ progress, color, size = 64, strokeWidth = 6, label, value }: ProgressRingMiniProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (progress / 100) * circ;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#1F2937" strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2},${size / 2}`}
          />
        </Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color }}>{progress}%</Text>
        </View>
      </View>
      <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '700' }}>{label}</Text>
      <Text style={{ fontSize: 10, color: '#6B7280' }}>{value}</Text>
    </View>
  );
}

// ── Sparkline semanal ────────────────────────────────────────────────────
interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

function Sparkline({ data, color, width = 120, height = 36 }: SparklineProps) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Card de métrica ───────────────────────────────────────────────────────
interface MetricCardProps {
  emoji: string;
  label: string;
  value: string;
  sub: string;
  color: string;
  trend?: number[];
}

function MetricCard({ emoji, label, value, sub, color, trend }: MetricCardProps) {
  return (
    <View style={[styles.metricCard, { borderColor: color + '33' }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricEmoji}>{emoji}</Text>
        <Text style={[styles.metricLabel, { color }]}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
      {trend && <Sparkline data={trend} color={color} width={100} height={28} />}
    </View>
  );
}

// ── Card de treino ────────────────────────────────────────────────────────
function WorkoutCard({ workout, index }: { workout: WorkoutSession; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60)} style={styles.workoutCard}>
      <Text style={styles.workoutEmoji}>{workout.emoji}</Text>
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutType}>{workout.type.charAt(0).toUpperCase() + workout.type.slice(1)}</Text>
        <Text style={styles.workoutMeta}>
          {workout.durationMin}min · {workout.calories}kcal
          {workout.distanceKm ? ` · ${workout.distanceKm}km` : ''}
          {workout.avgHeartRate ? ` · ${Math.round(workout.avgHeartRate)}bpm` : ''}
        </Text>
      </View>
      <Text style={styles.workoutDate}>{new Date(workout.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</Text>
    </Animated.View>
  );
}

// ── Principal ─────────────────────────────────────────────────────────────
export function HealthDashboard() {
  const { summary, loading, progress, permissionStatus, requestPermission, refresh } = useHealth();
  const [tab, setTab] = useState<'hoje' | 'semana' | 'treinos'>('hoje');

  if (loading && !summary) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#DC2626" />
        <Text style={styles.loadingText}>Sincronizando Apple Health...</Text>
      </View>
    );
  }

  if (!summary) return null;

  const { today, weekTrend, weekAvg, workouts } = summary;
  const stepsTrend = weekTrend.map(d => d.steps);
  const calTrend = weekTrend.map(d => d.calories);
  const sleepTrend = weekTrend.map(d => d.sleep);

  return (
    <View style={styles.root}>
      {/* Fonte dos dados */}
      {summary.source === 'mock' && permissionStatus !== 'granted' && (
        <Animated.View entering={FadeIn} style={styles.connectCard}>
          <Text style={styles.connectTitle}>🍎 Conectar Apple Health</Text>
          <Text style={styles.connectText}>Visualize seus dados reais de saúde, sono, passos e treinos.</Text>
          <TouchableOpacity style={styles.connectBtn} onPress={requestPermission}>
            <Text style={styles.connectBtnText}>Autorizar acesso →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['hoje', 'semana', 'treinos'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'hoje' ? '📅 Hoje' : t === 'semana' ? '📈 Semana' : `🏋️ Treinos (${workouts.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'hoje' && progress && (
        <Animated.View entering={FadeInDown.delay(50)} style={styles.section}>
          {/* Rings */}
          <View style={styles.ringsRow}>
            <ProgressRingMini progress={progress.steps} color="#DC2626" label="Passos" value={`${(today.steps / 1000).toFixed(1)}k`} />
            <ProgressRingMini progress={progress.calories} color="#D97706" label="Cal. ativas" value={`${today.activeCalories}kcal`} />
            <ProgressRingMini progress={progress.sleep} color="#7C3AED" label="Sono" value={`${today.sleepHours.toFixed(1)}h`} />
            <ProgressRingMini progress={progress.exercise} color="#059669" label="Exercício" value={`${today.exerciseMin}min`} />
          </View>

          {/* Cards métricas */}
          <View style={styles.metricsGrid}>
            <MetricCard emoji="❤️" label="Freq. cardíaca" value={`${Math.round(today.heartRateAvg || 72)}bpm`} sub={`Repouso: ${Math.round(today.heartRateResting || 58)}bpm`} color="#DC2626" />
            <MetricCard emoji="🚶" label="Distância" value={`${today.distanceKm.toFixed(1)}km`} sub={`${today.steps.toLocaleString()} passos`} color="#0891B2" />
            <MetricCard emoji="💧" label="Hidratação" value={`${(today.waterMl / 1000).toFixed(1)}L`} sub={`Meta: ${(HEALTH_GOALS.waterMl / 1000).toFixed(1)}L`} color="#0EA5E9" />
            <MetricCard emoji="🔥" label="Calorias totais" value={`${today.totalCalories.toLocaleString()}kcal`} sub={`Ativas: ${today.activeCalories}kcal`} color="#D97706" />
          </View>
        </Animated.View>
      )}

      {tab === 'semana' && (
        <Animated.View entering={FadeInDown.delay(50)} style={styles.section}>
          <Text style={styles.sectionLabel}>Médias semanais</Text>
          <View style={styles.metricsGrid}>
            <MetricCard emoji="👟" label="Passos/dia" value={`${Math.round((weekAvg.steps ?? 0) / 1000 * 10) / 10}k`} sub="média 7 dias" color="#DC2626" trend={stepsTrend} />
            <MetricCard emoji="😴" label="Sono/dia" value={`${(weekAvg.sleepHours ?? 0).toFixed(1)}h`} sub="média 7 dias" color="#7C3AED" trend={sleepTrend} />
            <MetricCard emoji="🔥" label="Cal. ativas/dia" value={`${Math.round(weekAvg.activeCalories ?? 0)}kcal`} sub="média 7 dias" color="#D97706" trend={calTrend} />
          </View>

          {/* Tabela semanal */}
          <View style={styles.weekTable}>
            <View style={styles.weekHeader}>
              {['Dia', 'Passos', 'Cal.', 'Sono'].map(h => (
                <Text key={h} style={styles.weekHeaderCell}>{h}</Text>
              ))}
            </View>
            {weekTrend.map((d, i) => {
              const isToday = d.date === new Date().toISOString().split('T')[0];
              return (
                <View key={d.date} style={[styles.weekRow, isToday && styles.weekRowToday]}>
                  <Text style={[styles.weekCell, isToday && styles.weekCellToday]}>
                    {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.weekCell, d.steps >= HEALTH_GOALS.steps && { color: '#059669' }]}>
                    {(d.steps / 1000).toFixed(1)}k
                  </Text>
                  <Text style={styles.weekCell}>{d.calories}</Text>
                  <Text style={[styles.weekCell, d.sleep >= HEALTH_GOALS.sleepHours && { color: '#059669' }]}>
                    {d.sleep.toFixed(1)}h
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}

      {tab === 'treinos' && (
        <Animated.View entering={FadeInDown.delay(50)} style={styles.section}>
          {workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏋️</Text>
              <Text style={styles.emptyTitle}>Sem treinos registrados</Text>
              <Text style={styles.emptySub}>Conecte o Apple Health para sincronizar seus treinos automaticamente.</Text>
            </View>
          ) : (
            workouts.map((w, i) => <WorkoutCard key={w.id} workout={w} index={i} />)
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  connectCard: {
    backgroundColor: '#1A0A0A', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#7C1D1D', gap: 8,
  },
  connectTitle: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  connectText: { fontSize: 13, color: '#9CA3AF', lineHeight: 19 },
  connectBtn: {
    backgroundColor: '#DC2626', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start',
  },
  connectBtnText: { fontSize: 13, color: '#FFF', fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937', alignItems: 'center',
  },
  tabActive: { backgroundColor: '#1A0A0A', borderColor: '#DC2626' },
  tabText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#FCA5A5', fontWeight: '700' },
  section: { gap: 14 },
  sectionLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#111827', borderRadius: 12,
    padding: 12, borderWidth: 1, gap: 4,
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricEmoji: { fontSize: 14 },
  metricLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  metricValue: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  metricSub: { fontSize: 11, color: '#6B7280' },
  weekTable: { backgroundColor: '#111827', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2937' },
  weekHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  weekHeaderCell: { flex: 1, fontSize: 11, color: '#4B5563', fontWeight: '700', textTransform: 'uppercase' },
  weekRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#111827' },
  weekRowToday: { backgroundColor: '#1A1040' },
  weekCell: { flex: 1, fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  weekCellToday: { color: '#A78BFA', fontWeight: '800' },
  workoutCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111827', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#1F2937',
  },
  workoutEmoji: { fontSize: 28 },
  workoutInfo: { flex: 1, gap: 3 },
  workoutType: { fontSize: 14, fontWeight: '700', color: '#F9FAFB' },
  workoutMeta: { fontSize: 12, color: '#6B7280' },
  workoutDate: { fontSize: 11, color: '#4B5563' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#F9FAFB' },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', maxWidth: 260, lineHeight: 20 },
});
