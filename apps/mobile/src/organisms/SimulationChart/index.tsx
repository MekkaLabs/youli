/**
 * SimulationChart — visualização SVG da projeção de vida 30/60/90 dias
 * Linha do tempo interativa com cenários what-if e trajetória real vs projetada
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Polyline, Line, Text as SvgText, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useHabits } from '../../hooks/useHabits';
import { useGoals } from '../../hooks/useGoals';
import { useFinance } from '../../hooks/useFinance';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface TrajectoryPoint {
  day: number;
  label: string;
  habitScore: number;    // 0-100
  goalProgress: number;  // 0-100
  financialScore: number;// 0-100
  overallScore: number;  // 0-100
}

interface SimulationResult {
  trajectory: TrajectoryPoint[];
  scenarios: Array<{
    id: string;
    label: string;
    color: string;
    points: number[]; // overallScore por ponto
    description: string;
  }>;
  summary: string;
  risks: string[];
  opportunities: string[];
}

function buildLocalProjection(
  habitCompletionRate: number,
  goalAvgProgress: number,
  savingsRate: number,
): SimulationResult {
  const days = [0, 7, 14, 21, 30, 45, 60, 90];
  const habitMomentum = habitCompletionRate / 100;
  const goalBase = goalAvgProgress;
  const finBase = Math.min(100, savingsRate * 3.5);

  const trajectory: TrajectoryPoint[] = days.map((d, i) => {
    const growth = 1 + (habitMomentum * 0.3 * (i / days.length));
    const habitScore = Math.min(100, habitCompletionRate * growth);
    const goalProgress = Math.min(100, goalBase + (habitMomentum * d * 0.4));
    const financialScore = Math.min(100, finBase + (savingsRate > 10 ? d * 0.15 : -d * 0.1));
    return {
      day: d,
      label: d === 0 ? 'Hoje' : d === 90 ? '90d' : `${d}d`,
      habitScore: Math.round(habitScore),
      goalProgress: Math.round(goalProgress),
      financialScore: Math.round(financialScore),
      overallScore: Math.round((habitScore * 0.35 + goalProgress * 0.35 + financialScore * 0.3)),
    };
  });

  const basePoints = trajectory.map(t => t.overallScore);
  const optimistPoints = basePoints.map((v, i) => Math.min(100, v + i * 1.5));
  const pessimistPoints = basePoints.map((v, i) => Math.max(0, v - i * 1.2));

  const overallNow = trajectory[0].overallScore;
  const overall90 = trajectory[trajectory.length - 1].overallScore;
  const delta = overall90 - overallNow;

  return {
    trajectory,
    scenarios: [
      { id: 'otimista', label: 'Otimista', color: '#059669', points: optimistPoints, description: 'Mantém todos os hábitos e acelera metas' },
      { id: 'realista', label: 'Realista', color: '#7C3AED', points: basePoints, description: 'Trajetória atual projetada' },
      { id: 'pessimista', label: 'Pessimista', color: '#DC2626', points: pessimistPoints, description: 'Se abandonar hábitos por 2+ semanas' },
    ],
    summary: `Em 90 dias, sua trajetória atual projeta ${delta >= 0 ? '+' : ''}${delta} pontos de progresso geral. ${delta >= 10 ? 'Você está no caminho certo!' : delta >= 0 ? 'Progresso moderado — há espaço para acelerar.' : 'Atenção: tendência de queda detectada.'}`,
    risks: [
      ...(savingsRate < 10 ? ['Taxa de poupança baixa pode comprometer metas financeiras'] : []),
      ...(habitCompletionRate < 50 ? ['Baixa consistência de hábitos freia o progresso das metas'] : []),
    ],
    opportunities: [
      ...(habitCompletionRate >= 70 ? ['Forte momentum de hábitos — aumente a dificuldade das metas'] : ['Melhorar consistência de hábitos aceleraria todo o sistema']),
      ...(savingsRate >= 20 ? ['Poupança excelente — considere investimentos de longo prazo'] : []),
    ],
  };
}

// ── Gráfico SVG ───────────────────────────────────────────────────────────
interface ChartProps {
  result: SimulationResult;
  activeScenario: string;
  width: number;
  height?: number;
}

function TrajectoryChart({ result, activeScenario, width, height = 180 }: ChartProps) {
  const padL = 28, padR = 12, padT = 12, padB = 28;
  const W = width - padL - padR;
  const H = height - padT - padB;
  const pts = result.trajectory;
  const n = pts.length;

  const toX = (i: number) => padL + (i / (n - 1)) * W;
  const toY = (v: number) => padT + H - (v / 100) * H;

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <Svg width={width} height={height}>
      <Defs>
        {result.scenarios.map(s => (
          <LinearGradient key={s.id} id={`grad_${s.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={s.color} stopOpacity={0.2} />
            <Stop offset="1" stopColor={s.color} stopOpacity={0} />
          </LinearGradient>
        ))}
      </Defs>

      {/* Grid */}
      {gridLines.map(g => (
        <React.Fragment key={g}>
          <Line
            x1={padL} y1={toY(g)} x2={padL + W} y2={toY(g)}
            stroke="#1F2937" strokeWidth={1}
          />
          <SvgText x={padL - 4} y={toY(g) + 4} fontSize={8} fill="#4B5563" textAnchor="end">{g}</SvgText>
        </React.Fragment>
      ))}

      {/* Linhas de cenário */}
      {result.scenarios.map(s => {
        const isActive = s.id === activeScenario;
        const polyPts = s.points.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
        return (
          <Polyline
            key={s.id}
            points={polyPts}
            fill="none"
            stroke={s.color}
            strokeWidth={isActive ? 2.5 : 1}
            strokeOpacity={isActive ? 1 : 0.3}
            strokeDasharray={s.id === 'otimista' ? '4,3' : s.id === 'pessimista' ? '2,3' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Pontos do cenário ativo */}
      {result.trajectory.map((pt, i) => (
        <Circle key={i} cx={toX(i)} cy={toY(pt.overallScore)} r={3} fill="#7C3AED" />
      ))}

      {/* Labels eixo X */}
      {pts.map((pt, i) => (
        <SvgText key={i} x={toX(i)} y={height - 4} fontSize={8} fill="#4B5563" textAnchor="middle">{pt.label}</SvgText>
      ))}
    </Svg>
  );
}

// ── Principal ─────────────────────────────────────────────────────────────
export function SimulationChart() {
  const { stats: habitStats } = useHabits();
  const { goals, goalStatus, progressPercent } = useGoals();
  const { monthlySummary } = useFinance();

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState('realista');
  const [whatIfInput, setWhatIfInput] = useState('');
  const [whatIfResult, setWhatIfResult] = useState('');
  const [chartWidth] = useState(320);

  const habitRate = habitStats.total > 0
    ? Math.round((habitStats.completedToday / habitStats.total) * 100)
    : 50;

  const avgGoalProgress = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + progressPercent(g.currentValue, g.targetValue), 0) / goals.length)
    : 40;

  const simulate = useCallback(async () => {
    setLoading(true);
    try {
      // Tenta API
      const res = await fetch(`${API_BASE}/api/simulate/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitCompletionRate: habitRate,
          goalProgress: avgGoalProgress,
          savingsRate: monthlySummary.savingsRate,
          horizon: 90,
        }),
      }).catch(() => null);

      if (res?.ok) {
        const data = await res.json();
        if (data?.trajectory) { setResult(data); return; }
      }

      // Fallback local
      setResult(buildLocalProjection(habitRate, avgGoalProgress, monthlySummary.savingsRate));
    } finally {
      setLoading(false);
    }
  }, [habitRate, avgGoalProgress, monthlySummary.savingsRate]);

  const runWhatIf = useCallback(async () => {
    if (!whatIfInput.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/simulate/what-if`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: whatIfInput, context: { habitRate, avgGoalProgress, savingsRate: monthlySummary.savingsRate } }),
      }).catch(() => null);

      if (res?.ok) {
        const data = await res.json();
        setWhatIfResult(data?.analysis ?? 'Análise indisponível.');
      } else {
        setWhatIfResult('Conecte sua API para análises what-if com IA.');
      }
    } finally {
      setLoading(false);
    }
  }, [whatIfInput, habitRate, avgGoalProgress, monthlySummary.savingsRate]);

  // Gera ao montar
  React.useEffect(() => { simulate(); }, []);

  if (!result && loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#7C3AED" />
        <Text style={styles.loadingText}>Calculando sua trajetória...</Text>
      </View>
    );
  }

  if (!result) return null;

  const activeScen = result.scenarios.find(s => s.id === activeScenario);

  return (
    <View style={styles.root}>
      {/* Resumo */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>🔮 Projeção de 90 dias</Text>
        <Text style={styles.summaryText}>{result.summary}</Text>
      </Animated.View>

      {/* Gráfico */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Trajetória geral</Text>
          <TouchableOpacity onPress={simulate} style={styles.refreshBtn}>
            {loading ? <ActivityIndicator size={12} color="#7C3AED" /> : <Text style={styles.refreshText}>↻</Text>}
          </TouchableOpacity>
        </View>

        <TrajectoryChart result={result} activeScenario={activeScenario} width={chartWidth} />

        {/* Selector de cenário */}
        <View style={styles.scenarioRow}>
          {result.scenarios.map(s => (
            <TouchableOpacity
              key={s.id}
              onPress={() => setActiveScenario(s.id)}
              style={[styles.scenarioChip, activeScenario === s.id && { borderColor: s.color, backgroundColor: s.color + '22' }]}
            >
              <View style={[styles.scenarioDot, { backgroundColor: s.color }]} />
              <Text style={[styles.scenarioLabel, activeScenario === s.id && { color: s.color }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {activeScen && (
          <Text style={styles.scenarioDesc}>{activeScen.description}</Text>
        )}
      </Animated.View>

      {/* Métricas por área */}
      <Animated.View entering={FadeInDown.delay(150)} style={styles.metricsRow}>
        {[
          { label: '🏛️ Hábitos', value: result.trajectory[result.trajectory.length - 1].habitScore, color: '#059669' },
          { label: '⚔️ Metas', value: result.trajectory[result.trajectory.length - 1].goalProgress, color: '#DC2626' },
          { label: '💰 Finanças', value: result.trajectory[result.trajectory.length - 1].financialScore, color: '#0891B2' },
        ].map(m => (
          <View key={m.label} style={styles.metricBox}>
            <Text style={styles.metricBoxLabel}>{m.label}</Text>
            <Text style={[styles.metricBoxValue, { color: m.color }]}>{m.value}</Text>
            <Text style={styles.metricBoxSub}>em 90d</Text>
          </View>
        ))}
      </Animated.View>

      {/* Riscos e Oportunidades */}
      {(result.risks.length > 0 || result.opportunities.length > 0) && (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.insightsCard}>
          {result.risks.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={styles.insightTitle}>⚠️ Riscos</Text>
              {result.risks.map((r, i) => <Text key={i} style={[styles.insightItem, { color: '#FCA5A5' }]}>• {r}</Text>)}
            </View>
          )}
          {result.opportunities.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={styles.insightTitle}>🚀 Oportunidades</Text>
              {result.opportunities.map((o, i) => <Text key={i} style={[styles.insightItem, { color: '#6EE7B7' }]}>• {o}</Text>)}
            </View>
          )}
        </Animated.View>
      )}

      {/* What-if */}
      <Animated.View entering={FadeInDown.delay(250)} style={styles.whatIfCard}>
        <Text style={styles.whatIfTitle}>🤔 E se...</Text>
        <Text style={styles.whatIfSub}>Simule um cenário com IA</Text>
        <TextInput
          style={styles.whatIfInput}
          value={whatIfInput}
          onChangeText={setWhatIfInput}
          placeholder="Ex: e se eu economizar 30% ao mês?"
          placeholderTextColor="#4B5563"
          multiline
        />
        <TouchableOpacity
          style={[styles.whatIfBtn, !whatIfInput.trim() && styles.whatIfBtnDisabled]}
          onPress={runWhatIf}
          disabled={!whatIfInput.trim() || loading}
        >
          {loading ? <ActivityIndicator size={14} color="#FFF" /> : <Text style={styles.whatIfBtnText}>Simular com Leonardo</Text>}
        </TouchableOpacity>
        {whatIfResult ? (
          <Animated.View entering={FadeIn} style={styles.whatIfResult}>
            <Text style={styles.whatIfResultText}>{whatIfResult}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  summaryCard: {
    backgroundColor: '#1A1040', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2D1B6E', gap: 6,
  },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  summaryText: { fontSize: 13, color: '#A78BFA', lineHeight: 20 },
  chartCard: {
    backgroundColor: '#111827', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#1F2937', gap: 12,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB' },
  refreshBtn: { padding: 4 },
  refreshText: { fontSize: 16, color: '#7C3AED', fontWeight: '900' },
  scenarioRow: { flexDirection: 'row', gap: 8 },
  scenarioChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1.5, borderColor: '#374151',
  },
  scenarioDot: { width: 7, height: 7, borderRadius: 99 },
  scenarioLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  scenarioDesc: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metricBox: {
    flex: 1, backgroundColor: '#111827', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#1F2937', alignItems: 'center', gap: 2,
  },
  metricBoxLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  metricBoxValue: { fontSize: 24, fontWeight: '900' },
  metricBoxSub: { fontSize: 10, color: '#4B5563' },
  insightsCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1F2937', gap: 12,
  },
  insightSection: { gap: 6 },
  insightTitle: { fontSize: 13, fontWeight: '800', color: '#F9FAFB' },
  insightItem: { fontSize: 12, lineHeight: 18 },
  whatIfCard: {
    backgroundColor: '#0D1520', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1E3A5F', gap: 10,
  },
  whatIfTitle: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  whatIfSub: { fontSize: 12, color: '#6B7280', marginTop: -4 },
  whatIfInput: {
    backgroundColor: '#111827', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#F9FAFB', borderWidth: 1, borderColor: '#1F2937', minHeight: 56,
  },
  whatIfBtn: {
    backgroundColor: '#7C3AED', borderRadius: 10, padding: 12,
    alignItems: 'center',
  },
  whatIfBtnDisabled: { backgroundColor: '#374151' },
  whatIfBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  whatIfResult: {
    backgroundColor: '#1A1040', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#2D1B6E',
  },
  whatIfResultText: { fontSize: 13, color: '#A78BFA', lineHeight: 20 },
});
