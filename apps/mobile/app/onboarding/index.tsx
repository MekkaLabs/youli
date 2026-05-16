/**
 * Onboarding — 3 passos de setup inicial
 * Passo 1: Boas-vindas + nome do orquestrador
 * Passo 2: Áreas de vida prioritárias
 * Passo 3: Primeira meta + hábito
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import Animated, {
  FadeIn, FadeInRight, FadeOutLeft, useSharedValue, withTiming, useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const LIFE_AREAS = [
  { id: 'health', icon: '💪', label: 'Saúde & Fitness' },
  { id: 'finance', icon: '💰', label: 'Finanças' },
  { id: 'productivity', icon: '⚡', label: 'Produtividade' },
  { id: 'relationships', icon: '❤️', label: 'Relacionamentos' },
  { id: 'learning', icon: '📚', label: 'Aprendizado' },
  { id: 'mindset', icon: '🧠', label: 'Mentalidade' },
  { id: 'career', icon: '🚀', label: 'Carreira' },
  { id: 'creativity', icon: '🎨', label: 'Criatividade' },
];

const ORCHESTRATOR_PRESETS = [
  { name: 'Youli', desc: 'O padrão — equilibrado e intuitivo' },
  { name: 'Jarvis', desc: 'Estilo Tony Stark — direto e técnico' },
  { name: 'Atlas', desc: 'Visão estratégica de longo prazo' },
  { name: 'Mentor', desc: 'Conselheiro sábio e paciente' },
];

type Step = 0 | 1 | 2;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(0);
  const [userName, setUserName] = useState('');
  const [orchestratorName, setOrchestratorName] = useState('Youli');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [firstGoal, setFirstGoal] = useState('');
  const [firstHabit, setFirstHabit] = useState('');

  function toggleArea(id: string) {
    setSelectedAreas(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  async function handleFinish() {
    await Promise.all([
      AsyncStorage.setItem('@youli:profile', JSON.stringify({
        name: userName || 'Usuário',
        orchestratorName,
        xp: 0,
        level: 1,
      })),
      AsyncStorage.setItem('@youli:settings', JSON.stringify({
        notifications: { daily_digest: true, habit_reminders: true, goal_alerts: true, finance_alerts: true },
        digestHour: 8,
        theme: 'dark',
        language: 'pt-BR',
        onboardingDone: true,
        priorityAreas: selectedAreas,
      })),
    ]);
    router.replace('/(tabs)/dashboard');
  }

  const steps = [
    // STEP 0 — Boas-vindas
    <Animated.View key="s0" entering={FadeInRight.springify().damping(24).stiffness(220).mass(0.9)} style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>👋</Text>
      <Text style={styles.stepTitle}>Olá! Bem-vindo ao{'\n'}Youli.</Text>
      <Text style={styles.stepSub}>
        Seu Personal Cognitive OS — IA que ajuda você a construir a vida que você quer, uma decisão de cada vez.
      </Text>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Como posso te chamar?</Text>
        <TextInput
          style={styles.input}
          placeholder="Seu nome..."
          placeholderTextColor="#4B5563"
          value={userName}
          onChangeText={setUserName}
          autoFocus
          maxLength={30}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Como quer chamar seu assistente?</Text>
        <View style={styles.presetRow}>
          {ORCHESTRATOR_PRESETS.map(p => (
            <TouchableOpacity
              key={p.name}
              onPress={() => setOrchestratorName(p.name)}
              style={[styles.presetCard, orchestratorName === p.name && styles.presetCardActive]}
            >
              <Text style={[styles.presetName, orchestratorName === p.name && styles.presetNameActive]}>{p.name}</Text>
              <Text style={styles.presetDesc}>{p.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>,

    // STEP 1 — Áreas de vida
    <Animated.View key="s1" entering={FadeInRight.springify().damping(24).stiffness(220).mass(0.9)} style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>🎯</Text>
      <Text style={styles.stepTitle}>Onde você quer{'\n'}focar agora?</Text>
      <Text style={styles.stepSub}>Escolha até 3 áreas prioritárias. Você pode mudar isso depois.</Text>
      <View style={styles.areasGrid}>
        {LIFE_AREAS.map(area => (
          <TouchableOpacity
            key={area.id}
            onPress={() => toggleArea(area.id)}
            style={[
              styles.areaCard,
              selectedAreas.includes(area.id) && styles.areaCardActive,
              !selectedAreas.includes(area.id) && selectedAreas.length >= 3 && styles.areaCardDisabled,
            ]}
          >
            <Text style={styles.areaIcon}>{area.icon}</Text>
            <Text style={[styles.areaLabel, selectedAreas.includes(area.id) && styles.areaLabelActive]}>
              {area.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.areaHint}>{selectedAreas.length}/3 selecionadas</Text>
    </Animated.View>,

    // STEP 2 — Primeira meta e hábito
    <Animated.View key="s2" entering={FadeInRight.springify().damping(24).stiffness(220).mass(0.9)} style={styles.stepWrap}>
      <Text style={styles.stepEmoji}>🚀</Text>
      <Text style={styles.stepTitle}>Vamos começar{'\n'}com pequenos passos</Text>
      <Text style={styles.stepSub}>Uma meta e um hábito são suficientes para começar com força.</Text>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>🎯 Sua primeira meta</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Ler 12 livros este ano..."
          placeholderTextColor="#4B5563"
          value={firstGoal}
          onChangeText={setFirstGoal}
          maxLength={100}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>🔥 Seu primeiro hábito diário</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 30 min de leitura por dia..."
          placeholderTextColor="#4B5563"
          value={firstHabit}
          onChangeText={setFirstHabit}
          maxLength={100}
        />
      </View>

      <View style={styles.readyCard}>
        <Text style={styles.readyText}>
          {userName || 'Você'} + {orchestratorName} = pronto para construir sua melhor vida 💫
        </Text>
      </View>
    </Animated.View>,
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.dot, step === i && styles.dotActive, step > i && styles.dotDone]} />
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {steps[step]}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Navigation */}
      <View style={[styles.navBar, { paddingBottom: insets.bottom + 16 }]}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep((step - 1) as Step)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {step < 2 ? (
          <TouchableOpacity
            onPress={() => setStep((step + 1) as Step)}
            style={[styles.nextBtn, step === 1 && selectedAreas.length === 0 && styles.btnDisabled]}
            disabled={step === 1 && selectedAreas.length === 0}
          >
            <Text style={styles.nextBtnText}>Próximo →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleFinish} style={styles.finishBtn}>
            <Text style={styles.nextBtnText}>Começar 🚀</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1F2937' },
  dotActive: { width: 24, backgroundColor: '#7C3AED' },
  dotDone: { backgroundColor: '#059669' },
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  stepWrap: { gap: 24 },
  stepEmoji: { fontSize: 48 },
  stepTitle: { fontSize: 28, fontWeight: '900', color: '#F9FAFB', lineHeight: 36 },
  stepSub: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginTop: -12 },
  fieldBlock: { gap: 10 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 16, paddingVertical: 14, color: '#F9FAFB', fontSize: 15 },
  presetRow: { gap: 8 },
  presetCard: { backgroundColor: '#111827', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1F2937', flexDirection: 'row', gap: 12, alignItems: 'center' },
  presetCardActive: { backgroundColor: '#1E0D3B', borderColor: '#7C3AED' },
  presetName: { fontSize: 15, fontWeight: '800', color: '#9CA3AF', minWidth: 60 },
  presetNameActive: { color: '#A78BFA' },
  presetDesc: { flex: 1, fontSize: 12, color: '#4B5563' },
  areasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  areaCard: { width: '47%', backgroundColor: '#111827', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1F2937', gap: 6, alignItems: 'center' },
  areaCardActive: { backgroundColor: '#1E0D3B', borderColor: '#7C3AED' },
  areaCardDisabled: { opacity: 0.35 },
  areaIcon: { fontSize: 28 },
  areaLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
  areaLabelActive: { color: '#A78BFA' },
  areaHint: { fontSize: 12, color: '#6B7280', textAlign: 'center', fontWeight: '600' },
  readyCard: { backgroundColor: '#0D1F17', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#0F2E1F' },
  readyText: { fontSize: 15, color: '#34D399', fontWeight: '700', lineHeight: 22, textAlign: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#111827' },
  backBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  backBtnText: { fontSize: 15, color: '#6B7280', fontWeight: '700' },
  nextBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  finishBtn: { backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnDisabled: { opacity: 0.35 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
