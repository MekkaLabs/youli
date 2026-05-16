/**
 * WeeklyReview — modal de revisão semanal guiada
 * Reflexão + wins + melhorias + foco da próxima semana + mood
 */
import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useWeeklyReview } from '../../hooks/useWeeklyReview';
import { useHabits } from '../../hooks/useHabits';
import { useGoals } from '../../hooks/useGoals';

const MOOD_CONFIG = [
  { rating: 1 as const, emoji: '😞', label: 'Difícil' },
  { rating: 2 as const, emoji: '😐', label: 'Regular' },
  { rating: 3 as const, emoji: '🙂', label: 'Ok' },
  { rating: 4 as const, emoji: '😊', label: 'Boa' },
  { rating: 5 as const, emoji: '🚀', label: 'Incrível' },
];

const STEPS = ['mood', 'wins', 'improvements', 'focus', 'done'] as const;
type Step = typeof STEPS[number];

interface WeeklyReviewProps {
  visible: boolean;
  onClose: () => void;
}

export function WeeklyReview({ visible, onClose }: WeeklyReviewProps) {
  const { saveReview } = useWeeklyReview();
  const habits = useHabits();
  const goals = useGoals();

  const [step, setStep] = useState<Step>('mood');
  const [mood, setMood] = useState<1|2|3|4|5>(3);
  const [wins, setWins] = useState(['', '', '']);
  const [improvements, setImprovements] = useState(['', '']);
  const [focus, setFocus] = useState('');
  const [saving, setSaving] = useState(false);

  // Stats da semana para contexto
  const habitsArr = (habits as any).habits ?? [];
  const goalsArr = (goals as any).goals ?? [];
  const completedHabits = habitsArr.filter((h: any) => h.completedToday).length;
  const activeGoals = goalsArr.filter((g: any) => g.status === 'active').length;

  async function handleFinish() {
    setSaving(true);
    await saveReview({
      reflection: focus,
      wins: wins.filter(Boolean),
      improvements: improvements.filter(Boolean),
      nextWeekFocus: focus,
      moodRating: mood,
    });
    setSaving(false);
    setStep('mood');
    onClose();
  }

  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  function renderStep() {
    switch (step) {
      case 'mood':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Como foi sua semana?</Text>
            <Text style={styles.stepSub}>Selecione o que melhor descreve</Text>
            <View style={styles.moodGrid}>
              {MOOD_CONFIG.map(m => (
                <TouchableOpacity
                  key={m.rating}
                  onPress={() => setMood(m.rating)}
                  style={[styles.moodCard, mood === m.rating && styles.moodCardActive]}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodLabel, mood === m.rating && styles.moodLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Stats da semana */}
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statVal}>{habitsArr.length}</Text>
                <Text style={styles.statLab}>hábitos</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statVal}>{activeGoals}</Text>
                <Text style={styles.statLab}>metas ativas</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statVal}>{Math.round((habitsArr.reduce((s: number, h: any) => s + (h.streak ?? 0), 0) / Math.max(habitsArr.length, 1)))}</Text>
                <Text style={styles.statLab}>streak médio</Text>
              </View>
            </View>
          </View>
        );

      case 'wins':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>🏆 Suas vitórias</Text>
            <Text style={styles.stepSub}>O que você conquistou essa semana?</Text>
            {wins.map((w, i) => (
              <View key={i} style={styles.inputRow}>
                <Text style={styles.inputIndex}>{i + 1}.</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Vitória ${i + 1}...`}
                  placeholderTextColor="#4B5563"
                  value={w}
                  onChangeText={v => { const n = [...wins]; n[i] = v; setWins(n); }}
                  maxLength={100}
                />
              </View>
            ))}
          </View>
        );

      case 'improvements':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>🔧 O que pode melhorar?</Text>
            <Text style={styles.stepSub}>Seja honesto, sem julgamentos</Text>
            {improvements.map((imp, i) => (
              <View key={i} style={styles.inputRow}>
                <Text style={styles.inputIndex}>{i + 1}.</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Melhoria ${i + 1}...`}
                  placeholderTextColor="#4B5563"
                  value={imp}
                  onChangeText={v => { const n = [...improvements]; n[i] = v; setImprovements(n); }}
                  maxLength={100}
                />
              </View>
            ))}
          </View>
        );

      case 'focus':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>🎯 Foco da próxima semana</Text>
            <Text style={styles.stepSub}>Uma intenção clara gera melhores resultados</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Na próxima semana vou priorizar..."
              placeholderTextColor="#4B5563"
              value={focus}
              onChangeText={setFocus}
              multiline
              numberOfLines={4}
              maxLength={300}
              autoFocus
            />
          </View>
        );

      case 'done':
        return (
          <View style={[styles.stepContent, styles.doneStep]}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.stepTitle}>Review completo!</Text>
            <Text style={styles.stepSub}>Você tomou tempo para se conhecer melhor.{'\n'}Semana que vem, mais forte.</Text>
            <View style={styles.doneSummary}>
              <Text style={styles.doneSummaryRow}>Humor: {MOOD_CONFIG.find(m => m.rating === mood)?.emoji} {MOOD_CONFIG.find(m => m.rating === mood)?.label}</Text>
              <Text style={styles.doneSummaryRow}>Vitórias: {wins.filter(Boolean).length} registradas</Text>
              <Text style={styles.doneSummaryRow}>Melhorias: {improvements.filter(Boolean).length} identificadas</Text>
            </View>
          </View>
        );
    }
  }

  function goNext() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function goPrev() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <Animated.View entering={SlideInDown.springify().damping(24).stiffness(220).mass(0.9)} style={styles.sheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>📋 Review Semanal</Text>
              <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>Passo {stepIndex + 1} de {STEPS.length}</Text>

            {/* Step content */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {renderStep()}
            </ScrollView>

            {/* Navigation */}
            <View style={styles.navButtons}>
              {stepIndex > 0 && (
                <TouchableOpacity onPress={goPrev} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>← Voltar</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              {step === 'done' ? (
                <TouchableOpacity onPress={handleFinish} style={styles.finishBtn} disabled={saving}>
                  {saving
                    ? <ActivityIndicator size={16} color="#fff" />
                    : <Text style={styles.nextBtnText}>Finalizar ✓</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={goNext} style={styles.nextBtn}>
                  <Text style={styles.nextBtnText}>
                    {step === 'focus' ? 'Revisar →' : 'Próximo →'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#1F2937', maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#F9FAFB' },
  closeBtn: { fontSize: 18, color: '#6B7280', padding: 4 },
  progressBar: { height: 3, backgroundColor: '#1F2937', marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: '#7C3AED', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 6, marginBottom: 4 },
  scrollContent: { padding: 20 },
  stepContent: { gap: 16 },
  stepTitle: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  stepSub: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginTop: -8 },
  moodGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937', gap: 4 },
  moodCardActive: { backgroundColor: '#1E0D3B', borderColor: '#7C3AED' },
  moodEmoji: { fontSize: 24 },
  moodLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  moodLabelActive: { color: '#A78BFA' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statPill: { flex: 1, backgroundColor: '#111827', borderRadius: 10, padding: 10, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: '#1F2937' },
  statVal: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  statLab: { fontSize: 10, color: '#6B7280', fontWeight: '600', textAlign: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputIndex: { fontSize: 14, color: '#6B7280', fontWeight: '700', width: 20 },
  input: { flex: 1, backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 14, paddingVertical: 10, color: '#F9FAFB', fontSize: 14 },
  inputMulti: { height: 120, textAlignVertical: 'top' },
  doneStep: { alignItems: 'center', paddingVertical: 16 },
  doneEmoji: { fontSize: 48 },
  doneSummary: { backgroundColor: '#111827', borderRadius: 12, padding: 16, gap: 8, alignSelf: 'stretch', borderWidth: 1, borderColor: '#1F2937' },
  doneSummaryRow: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  navButtons: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 12, gap: 10 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  backBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '700' },
  nextBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  finishBtn: { backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
