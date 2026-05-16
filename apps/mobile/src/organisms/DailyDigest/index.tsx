/**
 * DailyDigest — modal de briefing matinal
 * Abre automaticamente quando o app inicia no dia (se ainda não foi exibido)
 * ou quando o usuário clica na notificação push das 8h
 *
 * Conteúdo gerado pelo orquestrador com dados reais:
 * - Saudação personalizada (orquestrador + nome do usuário)
 * - Hábitos pendentes do dia
 * - Metas em risco
 * - Resumo financeiro do mês
 * - Prioridade do dia (top 3 tarefas)
 * - Insight do Aristóteles/Alexandre/Adam conforme contexto
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDailyDigest } from '../../hooks/useDailyDigest';
import { useHabits } from '../../hooks/useHabits';
import { useGoals } from '../../hooks/useGoals';
import { useFinance } from '../../hooks/useFinance';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

interface DigestSection {
  icon: string;
  title: string;
  content: string;
  color: string;
  agent: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getMotivationalPhrase(completedHabits: number, total: number): string {
  if (total === 0) return 'Um novo dia, novas possibilidades.';
  if (completedHabits === total) return 'Você começou o dia no modo campeão! 🏆';
  if (completedHabits === 0) return 'Cada grande jornada começa com um único passo.';
  return `${completedHabits} de ${total} hábitos concluídos. Continue!`;
}

interface DailyDigestProps {
  /** Se true, abre automaticamente quando shouldShowDigestToday() for true */
  autoOpen?: boolean;
  /** Chamado quando fecha o digest */
  onClose?: () => void;
}

export function DailyDigest({ autoOpen = true, onClose }: DailyDigestProps) {
  const { shouldShowDigestToday, markDigestShown } = useDailyDigest();
  const { habits, stats: habitStats, isCompletedToday } = useHabits();
  const { goals, goalStatus, progressPercent } = useGoals();
  const { monthlySummary, adamInsight } = useFinance();

  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<DigestSection[]>([]);
  const [orchestratorName, setOrchestratorName] = useState('Youli');
  const [orchestratorEmoji, setOrchestratorEmoji] = useState('🤖');

  // Carrega config do orquestrador
  useEffect(() => {
    AsyncStorage.getItem('@youli:orchestrator').then((raw) => {
      if (raw) {
        const cfg = JSON.parse(raw);
        setOrchestratorName(cfg.name ?? 'Youli');
        setOrchestratorEmoji(cfg.emoji ?? '🤖');
      }
    });
  }, []);

  // Abre automaticamente se deve mostrar hoje
  useEffect(() => {
    if (autoOpen && shouldShowDigestToday()) {
      // Pequeno delay para o app carregar
      const timer = setTimeout(() => {
        setVisible(true);
        buildDigest();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [autoOpen]);

  const buildDigest = useCallback(async () => {
    setLoading(true);
    try {
      // Tenta buscar do orquestrador via API
      const context = {
        habits: habits.map(h => ({ title: h.title, streak: h.streak, doneToday: isCompletedToday(h) })),
        goals: goals.map(g => ({ title: g.title, progress: progressPercent(g.currentValue, g.targetValue), status: goalStatus(g) })),
        finance: { income: monthlySummary.income, expenses: monthlySummary.expenses, savingsRate: monthlySummary.savingsRate },
      };

      const res = await fetch(`${API_BASE}/api/copilot/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Bom dia', context, mode: 'morning' }),
      }).catch(() => null);

      if (res?.ok) {
        const data = await res.json();
        // Usa resposta da API
        setSections(buildSectionsFromData(data, habits, goals, monthlySummary, adamInsight, isCompletedToday));
      } else {
        // Fallback: gera localmente
        setSections(buildSectionsLocal(habits, goals, monthlySummary, adamInsight, isCompletedToday));
      }
    } catch {
      setSections(buildSectionsLocal(habits, goals, monthlySummary, adamInsight, isCompletedToday));
    }
    setLoading(false);
  }, [habits, goals, monthlySummary, adamInsight, isCompletedToday, progressPercent, goalStatus]);

  const handleClose = useCallback(async () => {
    setVisible(false);
    await markDigestShown();
    onClose?.();
  }, [markDigestShown, onClose]);

  // Expõe método para abrir manualmente
  const open = useCallback(() => {
    setVisible(true);
    buildDigest();
  }, [buildDigest]);

  const pendingHabits = habits.filter(h => !isCompletedToday(h));
  const atRiskGoals = goals.filter(g => goalStatus(g) === 'at_risk');

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.overlay}>
        <Animated.View
          entering={SlideInDown.springify().damping(24).stiffness(220).mass(0.9)}
          exiting={SlideOutDown.springify().damping(24).stiffness(220).mass(0.9)}
          style={styles.sheet}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.orchEmoji}>{orchestratorEmoji}</Text>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{getGreeting()}!</Text>
              <Text style={styles.orchName}>{orchestratorName} está aqui</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Data */}
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>

          {/* Frase motivacional */}
          <View style={styles.motivCard}>
            <Text style={styles.motivText}>
              {getMotivationalPhrase(habitStats.completedToday, habitStats.total)}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#7C3AED" />
                <Text style={styles.loadingText}>{orchestratorName} está preparando seu dia...</Text>
              </View>
            ) : (
              <View style={styles.sections}>
                {sections.map((sec, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeIn.delay(i * 80)}
                    style={[styles.sectionCard, { borderLeftColor: sec.color }]}
                  >
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionIcon}>{sec.icon}</Text>
                      <Text style={[styles.sectionTitle, { color: sec.color }]}>{sec.title}</Text>
                      <Text style={styles.sectionAgent}>{sec.agent}</Text>
                    </View>
                    <Text style={styles.sectionContent}>{sec.content}</Text>
                  </Animated.View>
                ))}

                {/* Hábitos pendentes */}
                {pendingHabits.length > 0 && (
                  <Animated.View entering={FadeIn.delay(sections.length * 80)} style={[styles.sectionCard, { borderLeftColor: '#059669' }]}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionIcon}>🏛️</Text>
                      <Text style={[styles.sectionTitle, { color: '#059669' }]}>Hábitos pendentes hoje</Text>
                      <Text style={styles.sectionAgent}>Aristóteles</Text>
                    </View>
                    {pendingHabits.slice(0, 4).map(h => (
                      <View key={h.id} style={styles.habitRow}>
                        <Text style={styles.habitEmoji}>{h.emoji}</Text>
                        <Text style={styles.habitTitle}>{h.title}</Text>
                        <Text style={styles.habitStreak}>🔥 {h.streak}d</Text>
                      </View>
                    ))}
                  </Animated.View>
                )}

                {/* Metas em risco */}
                {atRiskGoals.length > 0 && (
                  <Animated.View entering={FadeIn.delay((sections.length + 1) * 80)} style={[styles.sectionCard, { borderLeftColor: '#DC2626' }]}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionIcon}>⚔️</Text>
                      <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>Metas em risco</Text>
                      <Text style={styles.sectionAgent}>Alexandre</Text>
                    </View>
                    {atRiskGoals.slice(0, 3).map(g => (
                      <View key={g.id} style={styles.habitRow}>
                        <Text style={styles.habitEmoji}>{g.emoji}</Text>
                        <Text style={styles.habitTitle}>{g.title}</Text>
                        <Text style={[styles.habitStreak, { color: '#DC2626' }]}>⚠️</Text>
                      </View>
                    ))}
                  </Animated.View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Botão fechar */}
          <TouchableOpacity style={styles.startBtn} onPress={handleClose}>
            <Text style={styles.startBtnText}>🚀 Começar o dia</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Builders de seções ────────────────────────────────────────────────────

function buildSectionsLocal(habits: any[], goals: any[], finance: any, adamInsight: string, isCompletedToday: any): DigestSection[] {
  const sections: DigestSection[] = [];
  const completedHabits = habits.filter(h => isCompletedToday(h)).length;

  // Hábitos
  sections.push({
    icon: '🏛️',
    title: 'Hábitos',
    content: completedHabits === habits.length && habits.length > 0
      ? `Todos os ${habits.length} hábitos já foram concluídos hoje! Excelência em ação.`
      : `${habits.length - completedHabits} hábito${habits.length - completedHabits !== 1 ? 's' : ''} para completar hoje. A consistência constrói o caráter.`,
    color: '#059669',
    agent: 'Aristóteles',
  });

  // Metas
  const activeGoals = goals.filter((g: any) => g.status !== 'completed');
  if (activeGoals.length > 0) {
    sections.push({
      icon: '⚔️',
      title: 'Metas',
      content: `${activeGoals.length} meta${activeGoals.length !== 1 ? 's' : ''} ativa${activeGoals.length !== 1 ? 's' : ''}. ${goals.filter((g: any) => g.status === 'at_risk').length > 0 ? 'Algumas precisam de atenção urgente.' : 'Continue no ritmo!'}`,
      color: '#DC2626',
      agent: 'Alexandre',
    });
  }

  // Finanças
  sections.push({
    icon: '💰',
    title: 'Financeiro',
    content: adamInsight,
    color: '#0891B2',
    agent: 'Adam Smith',
  });

  return sections;
}

function buildSectionsFromData(data: any, habits: any[], goals: any[], finance: any, adamInsight: string, isCompletedToday: any): DigestSection[] {
  // Se a API retornou uma resposta estruturada, usa ela
  if (data?.primaryAgent?.insights?.length > 0) {
    return data.primaryAgent.insights.slice(0, 3).map((insight: string, i: number) => ({
      icon: ['🌅', '⚡', '🎯'][i] ?? '📌',
      title: ['Prioridade do dia', 'Ação imediata', 'Foco'][i] ?? 'Insight',
      content: insight,
      color: ['#7C3AED', '#D97706', '#059669'][i] ?? '#6B7280',
      agent: data.primaryAgent?.agentName ?? 'Youli',
    }));
  }
  return buildSectionsLocal(habits, goals, finance, adamInsight, isCompletedToday);
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0B1120',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#374151', alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  orchEmoji: { fontSize: 42 },
  headerText: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '900', color: '#F9FAFB' },
  orchName: { fontSize: 13, color: '#6B7280' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#9CA3AF', fontSize: 14 },
  dateText: { fontSize: 13, color: '#4B5563', marginBottom: 14, textTransform: 'capitalize' },
  motivCard: { backgroundColor: '#1A1040', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#2D1B6E' },
  motivText: { fontSize: 14, color: '#C4B5FD', fontWeight: '600', lineHeight: 20 },
  scroll: { maxHeight: 420 },
  sections: { gap: 10, paddingBottom: 16 },
  loadingBox: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  loadingText: { color: '#6B7280', fontSize: 13 },
  sectionCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, gap: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '700' },
  sectionAgent: { fontSize: 10, color: '#4B5563', fontWeight: '600' },
  sectionContent: { fontSize: 13, color: '#9CA3AF', lineHeight: 20 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  habitEmoji: { fontSize: 16 },
  habitTitle: { flex: 1, fontSize: 13, color: '#E5E7EB' },
  habitStreak: { fontSize: 12, color: '#6B7280' },
  startBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
