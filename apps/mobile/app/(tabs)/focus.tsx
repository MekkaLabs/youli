/**
 * Youli — Focus Screen (Sprint R)
 * Pomodoro / Deep Work timer com:
 *  - Modos: Pomodoro (25+5), Deep Work (90+15), Custom
 *  - Estados: idle → running → paused → break → done
 *  - Vibração + som ao completar sessão
 *  - Registro automático no SWE-CI Evolution Tracker
 *  - Ring progress animado
 *  - Streak de sessões do dia
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Vibration, Platform, AppState, AppStateStatus, TextInput, Keyboard, PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  interpolate, Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../src/hooks/useI18n';
import { useAccessibility } from '../../src/accessibility/AccessibilityProvider';
import { accessibleColors } from '../../src/theme/accessibleTheme';
import { colors, fontSize } from '../../src/theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimerMode = 'pomodoro' | 'deepwork' | 'custom';
type TimerState = 'idle' | 'running' | 'paused' | 'break' | 'done';

interface ModeConfig {
  label: string;
  icon: string;
  workMin: number;
  breakMin: number;
  color: string;
}

const BASE_MODES: Record<TimerMode, ModeConfig> = {
  pomodoro: { label: 'Pomodoro', icon: '🍅', workMin: 25, breakMin: 5, color: '#EF4444' },
  deepwork: { label: 'Deep Work', icon: '🧠', workMin: 90, breakMin: 15, color: '#7C3AED' },
  custom: { label: 'Custom', icon: '⚙️', workMin: 45, breakMin: 10, color: '#0EA5E9' },
};

const CIRCLE_R = 110;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R;

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

// ─── Component ────────────────────────────────────────────────────────────────

export default function FocoScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { reduceMotion, fontMultiplier, highContrast } = useAccessibility();

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  // Custom mode sliders
  const [customWorkMin, setCustomWorkMin] = useState(45);
  const [customBreakMin, setCustomBreakMin] = useState(10);

  // MODES com custom dinâmico
  const MODES: Record<TimerMode, ModeConfig> = {
    ...BASE_MODES,
    custom: { ...BASE_MODES.custom, workMin: customWorkMin, breakMin: customBreakMin },
  };

  const [secondsLeft, setSecondsLeft] = useState(MODES.pomodoro.workMin * 60);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [totalFocusMin, setTotalFocusMin] = useState(0);
  const [sessionLog, setSessionLog] = useState<{ label: string; min: number; at: string; intention?: string }[]>([]);
  const [intention, setIntention] = useState('');
  const [intentionLocked, setIntentionLocked] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Refs para evitar stale closure no tick e handleSessionComplete
  const isBreakRef = useRef(false);
  const modeRef = useRef<TimerMode>('pomodoro');
  const sessionsRef = useRef(0);

  // Keep refs in sync com state
  useEffect(() => { isBreakRef.current = isBreak; }, [isBreak]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { sessionsRef.current = sessionsToday; }, [sessionsToday]);

  // Animated ring progress
  const progress = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  const totalSeconds = isBreak
    ? MODES[mode].breakMin * 60
    : MODES[mode].workMin * 60;

  // ─── Progress ring ──────────────────────────────────────────────────────────

  const strokeDashoffset = useSharedValue(0);

  useEffect(() => {
    const ratio = secondsLeft / totalSeconds;
    const offset = CIRCLE_CIRCUMFERENCE * (1 - ratio);
    if (!reduceMotion) {
      strokeDashoffset.value = withTiming(offset, { duration: 800, easing: Easing.out(Easing.quad) });
    } else {
      strokeDashoffset.value = offset;
    }
  }, [secondsLeft, totalSeconds, reduceMotion]);

  // Animated pulse while running
  useEffect(() => {
    if (timerState === 'running' && !reduceMotion) {
      pulseScale.value = withTiming(1.04, { duration: 600 }, () => {
        pulseScale.value = withTiming(1, { duration: 600 });
      });
    }
  }, [secondsLeft]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // ─── Timer tick ─────────────────────────────────────────────────────────────

  // handleSessionComplete ref — garante que tick sempre chame a versão atual
  const handleSessionCompleteRef = useRef(handleSessionComplete);
  useEffect(() => { handleSessionCompleteRef.current = handleSessionComplete; });

  const tick = useCallback(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        // Chamar na próxima task para não fazer setState dentro de setState updater
        setTimeout(() => handleSessionCompleteRef.current(), 0);
        return 0;
      }
      return prev - 1;
    });
  }, []); // deps vazias — referência estável, sem stale closure

  function startInterval() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);
  }

  function clearTimerInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // ─── App state (background) ─────────────────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextState !== 'active') {
        // App went to background — record start time for drift correction
        startTimeRef.current = Date.now();
      } else if (nextState === 'active' && timerState === 'running') {
        // App came back — correct drift
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSecondsLeft(prev => Math.max(0, prev - elapsed));
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [timerState]);

  // ─── Session complete ───────────────────────────────────────────────────────

  async function handleSessionComplete() {
    clearTimerInterval();
    Vibration.vibrate(Platform.OS === 'ios' ? [0, 400, 200, 400] : [400, 200, 400]);

    // Lê valores via refs — sem stale closure
    const currentIsBreak = isBreakRef.current;
    const currentMode = modeRef.current;

    if (!currentIsBreak) {
      const focusMin = MODES[currentMode].workMin;
      setSessionsToday(s => s + 1);
      setTotalFocusMin(m => m + focusMin);
      setSessionLog(log => [
        { label: MODES[currentMode].label, min: focusMin, at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), intention: intention || undefined },
        ...log,
      ]);

      // Record to SWE-CI Evolution Tracker
      try {
        await fetch(`${API_BASE}/api/evolution/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'default',
            area: 'productivity',
            type: 'focus_session',
            value: focusMin,
            label: `${MODES[currentMode].label} session`,
            ts: new Date().toISOString(),
          }),
        });
      } catch { /* offline — silently fail */ }

      // Start break
      isBreakRef.current = true;
      setIsBreak(true);
      setSecondsLeft(MODES[currentMode].breakMin * 60);
      setTimerState('break');
    } else {
      // Break done → idle
      isBreakRef.current = false;
      setIsBreak(false);
      setSecondsLeft(MODES[currentMode].workMin * 60);
      setTimerState('done');
    }
  }

  // ─── Controls ───────────────────────────────────────────────────────────────

  function handleStart() {
    Keyboard.dismiss();
    if (timerState === 'idle' || timerState === 'done') {
      setIntentionLocked(true);
      setIsBreak(false);
      setSecondsLeft(MODES[mode].workMin * 60);
      setTimerState('running');
      startTimeRef.current = Date.now();
      startInterval();
    } else if (timerState === 'paused') {
      setTimerState('running');
      startTimeRef.current = Date.now();
      startInterval();
    } else if (timerState === 'break') {
      startInterval();
    }
  }

  function handlePause() {
    clearTimerInterval();
    setTimerState('paused');
  }

  function handleReset() {
    clearTimerInterval();
    setIsBreak(false);
    setIntentionLocked(false);
    setSecondsLeft(MODES[mode].workMin * 60);
    setTimerState('idle');
  }

  function handleModeChange(m: TimerMode) {
    if (timerState === 'running' || timerState === 'paused') return;
    setMode(m);
    setIsBreak(false);
    setSecondsLeft(MODES[m].workMin * 60);
    setTimerState('idle');
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => { return () => clearTimerInterval(); }, []);

  // ─── Time format ────────────────────────────────────────────────────────────

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  const cfg = MODES[mode];
  const ringColor = isBreak ? '#059669' : cfg.color;
  const bgColor = highContrast ? accessibleColors.bg : '#030712';
  const phaseLabel = isBreak ? '☕ Pausa' : `${cfg.icon} ${cfg.label}`;
  const stateLabel = timerState === 'running' ? 'Em foco' : timerState === 'paused' ? 'Pausado' : timerState === 'break' ? 'Pausa' : timerState === 'done' ? 'Concluído' : 'Pronto';

  return (
    <View style={[styles.root, { backgroundColor: bgColor, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={[styles.headerTitle, { fontSize: fontSize.xl * fontMultiplier }]} accessibilityRole="header">
          🎯 Foco
        </Text>
        <Text style={styles.headerSub}>
          {stateLabel} · {totalFocusMin}min focado hoje · {sessionsToday} sessões
        </Text>

        {/* Mode selector */}
        <View style={styles.modeRow} accessibilityRole="tablist">
          {(Object.keys(MODES) as TimerMode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => handleModeChange(m)}
              style={[styles.modeBtn, mode === m && { ...styles.modeBtnActive, borderColor: MODES[m].color }]}
              disabled={timerState === 'running' || timerState === 'paused'}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              accessibilityLabel={MODES[m].label}
            >
              <Text style={styles.modeIcon}>{MODES[m].icon}</Text>
              <Text style={[styles.modeLabel, mode === m && styles.modeLabelActive]}>{MODES[m].label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom mode sliders — visível apenas se mode=custom e timer idle */}
        {mode === 'custom' && (timerState === 'idle' || timerState === 'done') && (
          <View style={styles.customSliders}>
            <Text style={styles.customSlidersTitle}>⚙️ Configurar duração</Text>

            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Foco: {customWorkMin} min</Text>
              <View style={styles.sliderTrack}>
                {[10, 20, 30, 45, 60, 75, 90, 120].map(val => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => { setCustomWorkMin(val); setSecondsLeft(val * 60); }}
                    style={[styles.sliderStep, customWorkMin === val && styles.sliderStepActive]}
                  >
                    <Text style={[styles.sliderStepText, customWorkMin === val && styles.sliderStepTextActive]}>
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Pausa: {customBreakMin} min</Text>
              <View style={styles.sliderTrack}>
                {[5, 10, 15, 20, 30].map(val => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setCustomBreakMin(val)}
                    style={[styles.sliderStep, customBreakMin === val && styles.sliderStepActive]}
                  >
                    <Text style={[styles.sliderStepText, customBreakMin === val && styles.sliderStepTextActive]}>
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Phase label */}
        <Text style={[styles.phaseLabel, { color: ringColor }]}>{phaseLabel}</Text>

        {/* Intention input — visível apenas no estado idle/done */}
        {(timerState === 'idle' || timerState === 'done') && (
          <View style={styles.intentionWrap}>
            <Text style={styles.intentionLabel}>🎯 Qual é a sua intenção para esta sessão?</Text>
            <TextInput
              style={styles.intentionInput}
              placeholder="Ex: Finalizar o sprint P1, estudar React Native..."
              placeholderTextColor="#4B5563"
              value={intention}
              onChangeText={setIntention}
              editable={!intentionLocked}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              maxLength={120}
              multiline={false}
              accessibilityLabel="Campo de intenção da sessão"
              accessibilityHint="Digite o que você pretende realizar nesta sessão de foco"
            />
          </View>
        )}
        {/* Intenção bloqueada — exibe como card enquanto timer roda */}
        {intentionLocked && intention.length > 0 && timerState !== 'idle' && timerState !== 'done' && (
          <View style={styles.intentionActive}>
            <Text style={styles.intentionActiveLabel}>🎯 Foco de hoje</Text>
            <Text style={styles.intentionActiveText}>{intention}</Text>
          </View>
        )}

        {/* Timer ring */}
        <Animated.View style={[styles.ringWrap, ringStyle]}
          accessibilityLabel={`Tempo restante: ${formatTime(secondsLeft)}`}
          accessible
        >
          <Svg width={280} height={280} viewBox="0 0 280 280">
            {/* Track */}
            <Circle
              cx={140} cy={140} r={CIRCLE_R}
              stroke="#1F2937"
              strokeWidth={12}
              fill="transparent"
            />
            {/* Progress — drawn via strokeDashoffset directly (no animated style on SVG) */}
            <Circle
              cx={140} cy={140} r={CIRCLE_R}
              stroke={ringColor}
              strokeWidth={12}
              fill="transparent"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={CIRCLE_CIRCUMFERENCE * (1 - secondsLeft / totalSeconds)}
              strokeLinecap="round"
              rotation="-90"
              origin="140, 140"
            />
          </Svg>
          {/* Time display */}
          <View style={styles.ringCenter}>
            <Text style={[styles.timeDisplay, { color: ringColor }]}>
              {formatTime(secondsLeft)}
            </Text>
            <Text style={styles.timeSubLabel}>
              {isBreak ? 'de pausa' : 'de foco'}
            </Text>
          </View>
        </Animated.View>

        {/* Controls */}
        <View style={styles.controls}>
          {timerState !== 'running' && timerState !== 'break' ? (
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: ringColor }]}
              onPress={handleStart}
              accessibilityRole="button"
              accessibilityLabel={timerState === 'paused' ? 'Retomar sessão' : 'Iniciar sessão de foco'}
            >
              <Text style={styles.mainBtnText}>
                {timerState === 'paused' ? '▶ Retomar' : timerState === 'done' ? '🔄 Nova sessão' : '▶ Iniciar'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.mainBtn, styles.pauseBtn]}
              onPress={handlePause}
              accessibilityRole="button"
              accessibilityLabel="Pausar sessão"
            >
              <Text style={styles.mainBtnText}>⏸ Pausar</Text>
            </TouchableOpacity>
          )}

          {timerState !== 'idle' && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
              accessibilityRole="button"
              accessibilityLabel="Cancelar e reiniciar"
            >
              <Text style={styles.resetBtnText}>✕ Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Skip break */}
        {timerState === 'break' && (
          <TouchableOpacity
            onPress={() => { clearTimerInterval(); setIsBreak(false); setSecondsLeft(MODES[mode].workMin * 60); setTimerState('idle'); }}
            style={styles.skipBreak}
            accessibilityRole="button"
            accessibilityLabel="Pular pausa"
          >
            <Text style={styles.skipBreakText}>Pular pausa →</Text>
          </TouchableOpacity>
        )}

        {/* Session log */}
        {sessionLog.length > 0 && (
          <View style={styles.logSection}>
            <Text style={styles.logTitle}>📋 Sessões de hoje</Text>
            {sessionLog.map((s, i) => (
              <View key={i} style={styles.logRow}>
                <Text style={styles.logIcon}>{MODES[mode].icon}</Text>
                <View style={styles.logInfo}>
                  <Text style={styles.logLabel}>{s.label} — {s.min}min</Text>
                  {s.intention ? <Text style={styles.logIntention}>{s.intention}</Text> : null}
                </View>
                <Text style={styles.logTime}>{s.at}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Dica de foco</Text>
          <Text style={styles.tipBody}>
            Coloque o celular virado para baixo, feche abas desnecessárias e defina uma única tarefa principal antes de iniciar o timer.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 120, alignItems: 'center' },
  headerTitle: { fontWeight: '900', color: '#F9FAFB', marginTop: 20, alignSelf: 'flex-start' },
  headerSub: { fontSize: 13, color: '#6B7280', alignSelf: 'flex-start', marginTop: 4, marginBottom: 24 },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 24, alignSelf: 'stretch', justifyContent: 'center' },
  modeBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937' },
  modeBtnActive: { backgroundColor: '#1E0D3B' },
  modeIcon: { fontSize: 20, marginBottom: 2 },
  modeLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  modeLabelActive: { color: '#A78BFA' },

  phaseLabel: { fontSize: 16, fontWeight: '800', marginBottom: 8, letterSpacing: 0.3 },

  ringWrap: { width: 280, height: 280, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  timeDisplay: { fontSize: 60, fontWeight: '900', letterSpacing: -2 },
  timeSubLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginTop: -4 },

  controls: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  mainBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, minWidth: 160, alignItems: 'center' },
  pauseBtn: { backgroundColor: '#374151' },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  resetBtn: { paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' },
  resetBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '700' },

  skipBreak: { marginBottom: 12 },
  skipBreakText: { color: '#6B7280', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

  logSection: { alignSelf: 'stretch', marginTop: 24, gap: 8 },
  logTitle: { fontSize: 13, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111827', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1F2937' },
  logIcon: { fontSize: 16 },
  logInfo: { flex: 1, gap: 2 },
  logLabel: { fontSize: 13, color: '#D1D5DB', fontWeight: '600' },
  logIntention: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
  logTime: { fontSize: 12, color: '#4B5563' },

  customSliders: { alignSelf: 'stretch', backgroundColor: '#0D1A2B', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#0EA5E922', gap: 12, marginBottom: 8 },
  customSlidersTitle: { fontSize: 12, color: '#38BDF8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  sliderRow: { gap: 6 },
  sliderLabel: { fontSize: 13, color: '#D1D5DB', fontWeight: '700' },
  sliderTrack: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sliderStep: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' },
  sliderStepActive: { backgroundColor: '#0D2030', borderColor: '#0EA5E9' },
  sliderStepText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  sliderStepTextActive: { color: '#38BDF8', fontWeight: '800' },

  intentionWrap: { alignSelf: 'stretch', marginBottom: 16, gap: 6 },
  intentionLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  intentionInput: {
    backgroundColor: '#111827', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#F9FAFB', borderWidth: 1, borderColor: '#374151',
  },
  intentionActive: {
    alignSelf: 'stretch', backgroundColor: '#1A1040', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#7C3AED22', marginBottom: 16, gap: 4,
  },
  intentionActiveLabel: { fontSize: 10, color: '#A78BFA', fontWeight: '700', textTransform: 'uppercase' },
  intentionActiveText: { fontSize: 13, color: '#D1D5DB', fontStyle: 'italic', lineHeight: 20 },

  tipCard: { alignSelf: 'stretch', backgroundColor: '#0D1A0D', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#14532D', marginTop: 24 },
  tipTitle: { fontSize: 13, color: '#4ADE80', fontWeight: '800', marginBottom: 6 },
  tipBody: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
});
