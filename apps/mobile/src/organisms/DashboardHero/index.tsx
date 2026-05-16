/**
 * DashboardHero v2 — painel hero com dados reais de todos os módulos
 * Rings de progresso + stats em tempo real + ação rápida
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { useHabits } from '../../hooks/useHabits';
import { useGoals } from '../../hooks/useGoals';
import { useHealth } from '../../hooks/useHealth';
import { useLifePatterns } from '../../hooks/useLifePatterns';
import { useXP } from '../../hooks/useXP';

// Mini ring SVG
function MiniRing({ value, color, size = 44, label }: { value: number; color: string; size?: number; label: string }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#1F2937" strokeWidth={5} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={5} fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <SvgText x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill="#F9FAFB">
          {Math.round(value)}
        </SvgText>
      </Svg>
      <Text style={[styles.ringLabel, { color }]}>{label}</Text>
    </View>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function energyEmoji(level: string | number) {
  if (typeof level === 'string') {
    return level === 'high' ? '⚡' : level === 'medium' ? '🔋' : '😴';
  }
  return level >= 70 ? '⚡' : level >= 40 ? '🔋' : '😴';
}

interface DashboardHeroProps {
  data?: any;
  onOpenCopilot?: () => void;
}

export function DashboardHero({ data, onOpenCopilot }: DashboardHeroProps) {
  const habits = useHabits();
  const goals = useGoals();
  const health = useHealth();
  const patterns = useLifePatterns();
  const { xpData } = useXP();

  const habitsArr = (habits as any).habits ?? [];
  const goalsArr = (goals as any).goals ?? [];
  const healthData = (health as any).data;

  // Calcula scores em tempo real
  const habitScore = useMemo(() => {
    if (!habitsArr.length) return 0;
    const done = habitsArr.filter((h: any) => h.completedToday || (habits as any).isCompletedToday?.(h)).length;
    return Math.round((done / habitsArr.length) * 100);
  }, [habitsArr]);

  const goalScore = useMemo(() => {
    const active = goalsArr.filter((g: any) => g.status === 'active');
    if (!active.length) return 0;
    return Math.round(active.reduce((s: number, g: any) => s + (g.progress ?? 0), 0) / active.length);
  }, [goalsArr]);

  const stepsScore = useMemo(() => {
    const steps = healthData?.steps ?? data?.steps ?? 0;
    return Math.min(100, Math.round((steps / 10000) * 100));
  }, [healthData, data]);

  const lifeBalance = patterns.lifeBalance ?? 70;
  const topStreak = useMemo(() =>
    habitsArr.reduce((max: any, h: any) => (!max || h.streak > max.streak ? h : max), null),
    [habitsArr]
  );

  const activeGoals = goalsArr.filter((g: any) => g.status === 'active').length;
  const dayFocus = data?.dashboard?.dayFocus ?? topStreak?.title ?? 'Defina seu foco do dia';
  const energy = data?.dashboard?.energy ?? (lifeBalance >= 70 ? 'high' : lifeBalance >= 40 ? 'medium' : 'low');

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'short',
  });

  return (
    <Animated.View entering={FadeInUp.springify().damping(24).stiffness(220).mass(0.9)} style={styles.card}>
      {/* Top row — saudação + energia */}
      <View style={styles.topRow}>
        <View style={styles.greetBlock}>
          <Text style={styles.greetText}>{greeting()} {energyEmoji(energy)}</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpLevel}>Nv {xpData.level}</Text>
          <Text style={styles.xpPts}>{xpData.total} XP</Text>
        </View>
      </View>

      {/* Foco do dia */}
      <View style={styles.focusBlock}>
        <Text style={styles.focusLabel}>FOCO DO DIA</Text>
        <Text style={styles.focusText} numberOfLines={2}>{dayFocus}</Text>
      </View>

      {/* Rings de progresso */}
      <Animated.View entering={FadeInDown.delay(100).springify().damping(24).stiffness(220).mass(0.9)} style={styles.ringsRow}>
        <MiniRing value={habitScore}  color="#059669" label="Hábitos" />
        <MiniRing value={goalScore}   color="#D97706" label="Metas" />
        <MiniRing value={stepsScore}  color="#7C3AED" label="Passos" />
        <MiniRing value={lifeBalance} color="#0EA5E9" label="Vida" size={52} />
      </Animated.View>

      {/* Stats rápidas */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{topStreak?.streak ?? 0}🔥</Text>
          <Text style={styles.statLab}>streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{activeGoals}</Text>
          <Text style={styles.statLab}>metas ativas</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{patterns.positiveCount}</Text>
          <Text style={styles.statLab}>padrões +</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{habitsArr.filter((h: any) => h.completedToday).length}/{habitsArr.length}</Text>
          <Text style={styles.statLab}>hábitos hoje</Text>
        </View>
      </View>

      {/* Ação rápida */}
      <TouchableOpacity onPress={onOpenCopilot} style={styles.copilotBtn} activeOpacity={0.8}>
        <Text style={styles.copilotBtnText}>💬 Perguntar para o orquestrador</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D1117', borderRadius: 20, padding: 18, gap: 14,
    borderWidth: 1, borderColor: '#1F2937',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greetBlock: { gap: 2 },
  greetText: { fontSize: 18, fontWeight: '900', color: '#F9FAFB' },
  dateText: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  xpBadge: { backgroundColor: '#1E0D3B', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', gap: 1, borderWidth: 1, borderColor: '#2D1B69' },
  xpLevel: { fontSize: 11, fontWeight: '900', color: '#A78BFA' },
  xpPts: { fontSize: 10, color: '#6B7280' },
  focusBlock: { gap: 3 },
  focusLabel: { fontSize: 10, color: '#6B7280', fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  focusText: { fontSize: 16, fontWeight: '800', color: '#F9FAFB', lineHeight: 22 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  ringLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1F2937' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 15, fontWeight: '900', color: '#F9FAFB' },
  statLab: { fontSize: 9, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: '#1F2937' },
  copilotBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  copilotBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
