/**
 * DailyCheckIn — modal de check-in diário
 * Abre automaticamente 1x por dia no dashboard
 * Humor + intenção do dia + 3 prioridades
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@youli:daily_checkin';

const MOODS = [
  { val: 1, emoji: '😴', label: 'Cansado' },
  { val: 2, emoji: '😟', label: 'Difícil' },
  { val: 3, emoji: '😐', label: 'Normal' },
  { val: 4, emoji: '😊', label: 'Bem' },
  { val: 5, emoji: '🚀', label: 'Incrível' },
];

interface CheckInData {
  date: string;       // YYYY-MM-DD
  mood: number;
  intention: string;
  priorities: [string, string, string];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Hook público para usar no dashboard
export function useDailyCheckIn() {
  const [show, setShow] = useState(false);
  const [todayData, setTodayData] = useState<CheckInData | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const data: CheckInData = JSON.parse(raw);
        setTodayData(data.date === todayStr() ? data : null);
        // Abre se ainda não fez hoje e é entre 6h e 11h
        const hour = new Date().getHours();
        if (data.date !== todayStr() && hour >= 6 && hour <= 11) {
          setShow(true);
        }
      } else {
        const hour = new Date().getHours();
        if (hour >= 6 && hour <= 11) setShow(true);
      }
    })();
  }, []);

  const dismiss = useCallback(() => setShow(false), []);
  const openManually = useCallback(() => setShow(true), []);

  return { show, todayData, dismiss, openManually };
}

interface DailyCheckInProps {
  visible: boolean;
  onClose: () => void;
}

export function DailyCheckIn({ visible, onClose }: DailyCheckInProps) {
  const [mood, setMood] = useState(3);
  const [intention, setIntention] = useState('');
  const [priorities, setPriorities] = useState<[string, string, string]>(['', '', '']);
  const [step, setStep] = useState<'mood' | 'focus'>('mood');

  async function handleSave() {
    const data: CheckInData = { date: todayStr(), mood, intention, priorities };
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
    onClose();
    setStep('mood');
    setMood(3);
    setIntention('');
    setPriorities(['', '', '']);
  }

  const moodCfg = MOODS.find(m => m.val === mood)!;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <Animated.View entering={SlideInDown.springify().damping(24).stiffness(220).mass(0.9)} style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>
                  {new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde'} ☀️
                </Text>
                <Text style={styles.subTitle}>Check-in diário</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
                <Text style={styles.skipText}>Pular</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 'mood' ? (
                <>
                  <Text style={styles.question}>Como você está chegando hoje?</Text>
                  <View style={styles.moodRow}>
                    {MOODS.map(m => (
                      <TouchableOpacity
                        key={m.val}
                        onPress={() => setMood(m.val)}
                        style={[styles.moodBtn, mood === m.val && styles.moodBtnActive]}
                      >
                        <Text style={styles.moodEmoji}>{m.emoji}</Text>
                        <Text style={[styles.moodLabel, mood === m.val && styles.moodLabelActive]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Contexto do humor selecionado */}
                  <View style={styles.moodContext}>
                    <Text style={styles.moodContextText}>
                      {mood <= 2
                        ? `${moodCfg.emoji} Dias difíceis também fazem parte. Vamos com calma.`
                        : mood === 3
                        ? '💡 Ótimo ponto de partida. Um dia de cada vez.'
                        : `${moodCfg.emoji} Ótima energia! Capitalize isso hoje.`}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => setStep('focus')} style={styles.nextBtn}>
                    <Text style={styles.nextBtnText}>Definir foco do dia →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.question}>Qual é a sua intenção para hoje?</Text>
                  <TextInput
                    style={styles.intentionInput}
                    placeholder="Hoje vou..."
                    placeholderTextColor="#4B5563"
                    value={intention}
                    onChangeText={setIntention}
                    multiline
                    numberOfLines={2}
                    maxLength={150}
                    autoFocus
                  />

                  <Text style={[styles.question, { marginTop: 8 }]}>Suas 3 prioridades</Text>
                  {([0, 1, 2] as const).map(i => (
                    <View key={i} style={styles.priorityRow}>
                      <View style={[styles.priorityNum, i === 0 && styles.priorityNum1]}>
                        <Text style={[styles.priorityNumText, i === 0 && styles.priorityNum1Text]}>{i + 1}</Text>
                      </View>
                      <TextInput
                        style={styles.priorityInput}
                        placeholder={i === 0 ? 'Tarefa mais importante...' : `Prioridade ${i + 1}...`}
                        placeholderTextColor="#4B5563"
                        value={priorities[i]}
                        onChangeText={v => { const n = [...priorities] as [string, string, string]; n[i] = v; setPriorities(n); }}
                        maxLength={80}
                      />
                    </View>
                  ))}

                  <View style={styles.footerBtns}>
                    <TouchableOpacity onPress={() => setStep('mood')} style={styles.backBtn}>
                      <Text style={styles.backBtnText}>← Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                      <Text style={styles.saveBtnText}>Começar o dia ✓</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#1F2937', maxHeight: '85%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: '900', color: '#F9FAFB' },
  subTitle: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1F2937', borderRadius: 8 },
  skipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  content: { padding: 20, paddingTop: 4, gap: 16 },
  question: { fontSize: 17, fontWeight: '800', color: '#F9FAFB' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, gap: 4, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937', marginHorizontal: 3 },
  moodBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  moodEmoji: { fontSize: 22 },
  moodLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  moodLabelActive: { color: '#60A5FA' },
  moodContext: { backgroundColor: '#111827', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  moodContextText: { fontSize: 14, color: '#9CA3AF', lineHeight: 20 },
  nextBtn: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  intentionInput: {
    backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1F2937',
    padding: 14, color: '#F9FAFB', fontSize: 15, textAlignVertical: 'top', minHeight: 70,
  },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priorityNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  priorityNum1: { backgroundColor: '#3B82F6' },
  priorityNumText: { fontSize: 13, fontWeight: '900', color: '#6B7280' },
  priorityNum1Text: { color: '#fff' },
  priorityInput: {
    flex: 1, backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937',
    paddingHorizontal: 12, paddingVertical: 10, color: '#F9FAFB', fontSize: 14,
  },
  footerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  backBtnText: { fontSize: 14, color: '#6B7280', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
