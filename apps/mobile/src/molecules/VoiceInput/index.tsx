/**
 * VoiceInput — molécula de entrada por voz
 *
 * Usa expo-av (Audio) para capturar áudio no mobile.
 * Envia o áudio para a API e recebe o texto transcrito via /api/voice/command.
 *
 * Uso:
 *   <VoiceInput onResult={(text) => setInputText(text)} onAction={(result) => handleVoiceAction(result)} />
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { VoiceButton, VoiceState } from '../../atoms/VoiceButton';
import { motionEnter } from '../../theme/motion';

// ─── Constantes ───────────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

// Dicas de comando exibidas enquanto escuta
const VOICE_HINTS = [
  'Diga: "Franklin, adicionar tarefa..."',
  'Diga: "Aristóteles, novo hábito..."',
  'Diga: "Alexandre, criar meta..."',
  'Diga: "Gastei R$50 em alimentação"',
  'Diga: "Bom dia" para o briefing',
  'Diga: "E se eu dormisse 8h por dia?"',
  'Diga: "Como estão minhas metas?"',
];

const QUICK_FALLBACK_COMMANDS = [
  'Como está meu dia hoje?',
  'Franklin, adicionar tarefa: revisar backlog',
  'Aristóteles, novo hábito: meditar 10 minutos',
  'Alexandre, criar meta: faturar R$ 10.000 este mês',
  'Adam, registrar gasto de R$ 50 em alimentação',
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface VoiceActionResult {
  intent: {
    type: string;
    area: string;
    agentName: string;
    entities: Record<string, unknown>;
    confidence: number;
  };
  action: string;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  redirectTo?: string;
}

interface VoiceInputProps {
  /** Callback com o texto transcrito (preenche campo de texto) */
  onResult?: (text: string) => void;
  /** Callback quando uma ação é executada pela API */
  onAction?: (result: VoiceActionResult) => void;
  /** ID do perfil do usuário */
  profileId?: string;
  /** Contexto atual do app (hábitos, tarefas, etc.) */
  context?: Record<string, unknown>;
  /** Se true, abre automaticamente ao montar */
  autoOpen?: boolean;
}

// ─── Hooks de Audio (Expo AV) ─────────────────────────────────────────────────

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { Audio } = await import('expo-av');
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function VoiceInput({
  onResult,
  onAction,
  profileId = 'demo',
  context = {},
  autoOpen = false,
}: VoiceInputProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionResult, setActionResult] = useState<VoiceActionResult | null>(null);

  const recordingRef = useRef<unknown>(null);
  const hintTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rotaciona dicas
  const startHintRotation = useCallback(() => {
    hintTimerRef.current = setInterval(() => {
      setHintIndex((i) => (i + 1) % VOICE_HINTS.length);
    }, 2500);
  }, []);

  const stopHintRotation = useCallback(() => {
    if (hintTimerRef.current) {
      clearInterval(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }, []);

  const executeVoiceCommand = useCallback(async (text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    setTranscript(normalized);
    onResult?.(normalized);

    const res = await fetch(`${API_BASE}/api/voice/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: normalized, profileId, context }),
    });

    if (res.ok) {
      const data: VoiceActionResult = await res.json();
      setActionResult(data);
      onAction?.(data);
      setErrorMsg('');
      return;
    }
    setErrorMsg('Não consegui interpretar o comando agora.');
  }, [context, onAction, onResult, profileId]);

  // Inicia gravação
  const startListening = useCallback(async () => {
    setErrorMsg('');
    setTranscript('');
    setActionResult(null);

    const granted = await requestMicPermission();
    if (!granted) {
      setErrorMsg('Permissão de microfone negada.');
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        const { Audio } = await import('expo-av');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );
        recordingRef.current = recording;
      }

      setVoiceState('listening');
      startHintRotation();
    } catch (err) {
      setErrorMsg('Erro ao iniciar gravação.');
      console.error('[VoiceInput] start error:', err);
    }
  }, [startHintRotation]);

  // Para gravação e processa
  const stopListening = useCallback(async () => {
    stopHintRotation();
    setVoiceState('processing');

    try {
      let audioUri: string | null = null;

      if (recordingRef.current && Platform.OS !== 'web') {
        const { Audio } = await import('expo-av');
        const rec = recordingRef.current as InstanceType<typeof Audio.Recording>;
        await rec.stopAndUnloadAsync();
        audioUri = rec.getURI() ?? null;
        recordingRef.current = null;
      }

      // Se temos áudio, enviamos para a API de transcrição
      // (Futura integração com Whisper/Parakeet via endpoint próprio)
      // Por agora, usamos Speech Recognition nativa via expo-speech ou simulamos
      let transcribedText = '';

      if (audioUri) {
        // TODO: POST audioUri para /api/voice/transcribe quando backend Whisper estiver disponível
        // Por enquanto, fallback para SpeechRecognition (só iOS com permissão)
        transcribedText = await transcribeWithNative();
      } else {
        transcribedText = await transcribeWithNative();
      }

      if (!transcribedText.trim()) {
        setVoiceState('idle');
        setErrorMsg('Reconhecimento por voz nativo indisponível neste ambiente. Use os comandos rápidos abaixo.');
        return;
      }

      await executeVoiceCommand(transcribedText);

      setVoiceState('idle');
    } catch (err) {
      console.error('[VoiceInput] stop error:', err);
      setVoiceState('idle');
      setErrorMsg('Erro ao processar áudio.');
    }
  }, [stopHintRotation, executeVoiceCommand]);

  const handlePress = useCallback(() => {
    if (voiceState === 'idle') {
      startListening();
    } else if (voiceState === 'listening') {
      stopListening();
    }
  }, [voiceState, startListening, stopListening]);

  const handleClose = useCallback(() => {
    stopHintRotation();
    if (recordingRef.current) {
      // tenta parar gravação se aberta
      (recordingRef.current as { stopAndUnloadAsync?: () => Promise<void> })
        .stopAndUnloadAsync?.()
        .catch(() => {});
      recordingRef.current = null;
    }
    setVoiceState('idle');
    setIsOpen(false);
    setTranscript('');
    setActionResult(null);
    setErrorMsg('');
  }, [stopHintRotation]);

  return (
    <>
      {/* Botão de abertura — normalmente embutido no CopilotBar */}
      <VoiceButton
        state={voiceState}
        onPress={() => (isOpen ? handleClose() : setIsOpen(true))}
        size={40}
      />

      {/* Modal de escuta */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
          <Animated.View
            entering={motionEnter.sheetUp()}
            style={styles.sheet}
          >
            <TouchableOpacity activeOpacity={1}>

              {/* Handle */}
              <View style={styles.handle} />

              {/* Título */}
              <Text style={styles.title}>
                {voiceState === 'idle' && '🎤 Diga algo...'}
                {voiceState === 'listening' && '🔴 Ouvindo...'}
                {voiceState === 'processing' && '⚙️ Processando...'}
              </Text>
              <TouchableOpacity style={styles.closeSheetBtn} onPress={handleClose}>
                <Text style={styles.closeSheetText}>Fechar</Text>
              </TouchableOpacity>

              {/* Botão central */}
              <View style={styles.micContainer}>
                <VoiceButton
                  state={voiceState}
                  size={80}
                  onPress={handlePress}
                />
                <Text style={styles.micLabel}>
                  {voiceState === 'idle' ? 'Toque para falar' :
                   voiceState === 'listening' ? 'Toque para parar' : 'Aguarde...'}
                </Text>
              </View>

              {/* Dica rotativa */}
              {voiceState === 'listening' && (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.hintBox}>
                  <Text style={styles.hintText}>{VOICE_HINTS[hintIndex]}</Text>
                </Animated.View>
              )}

              {/* Transcrição */}
              {transcript !== '' && voiceState !== 'listening' && (
                <Animated.View entering={FadeIn} style={styles.transcriptBox}>
                  <Text style={styles.transcriptLabel}>Você disse:</Text>
                  <Text style={styles.transcriptText}>"{transcript}"</Text>
                </Animated.View>
              )}

              {/* Resultado da ação */}
              {actionResult && (
                <Animated.View entering={FadeIn} style={[
                  styles.actionBox,
                  { borderColor: actionResult.success ? '#10B981' : '#EF4444' },
                ]}>
                  <Text style={styles.actionMessage}>{actionResult.message}</Text>
                  <Text style={styles.actionAgent}>
                    via {actionResult.intent?.agentName ?? 'Youli'} →{' '}
                    {actionResult.intent?.area ?? 'dashboard'}
                    {' '}({Math.round((actionResult.intent?.confidence ?? 0) * 100)}% certeza)
                  </Text>
                </Animated.View>
              )}

              {/* Erro */}
              {errorMsg !== '' && (
                <Animated.View entering={FadeIn} style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </Animated.View>
              )}

              {/* Loader */}
              {voiceState === 'processing' && (
                <ActivityIndicator color="#7C3AED" style={{ marginTop: 16 }} />
              )}

              {/* Exemplos rápidos */}
              {voiceState === 'idle' && !transcript && (
                <View style={styles.examplesSection}>
                  <Text style={styles.examplesTitle}>Exemplos de comandos</Text>
                  {[
                    '☀️ "Bom dia" — briefing matinal',
                    '✅ "Franklin, tarefa: reunião às 15h"',
                    '🏛️ "Hábito: meditar 10 minutos"',
                    '💰 "Gastei R$40 em almoço"',
                    '🔮 "E se eu acordasse às 6h?"',
                  ].map((ex) => (
                    <Text key={ex} style={styles.exampleItem}>{ex}</Text>
                  ))}
                  <View style={styles.quickCommandsRow}>
                    {QUICK_FALLBACK_COMMANDS.map((command) => (
                      <TouchableOpacity
                        key={command}
                        style={styles.quickCommandChip}
                        onPress={() => executeVoiceCommand(command)}
                      >
                        <Text style={styles.quickCommandText}>{command}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Fallback: SpeechRecognition nativa ──────────────────────────────────────

async function transcribeWithNative(): Promise<string> {
  // Em iOS/Android, expo-speech só faz TTS (text-to-speech).
  // Para STT nativo, usamos @react-native-voice/voice quando disponível.
  // Aqui retornamos string vazia — integração real com Whisper será via /api/voice/transcribe
  // O fluxo completo com Handy (desktop) não precisa desta função.
  try {
    const Voice = await import('@react-native-voice/voice').catch(() => null);
    if (!Voice) return '';

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(''), 10000);

      Voice.default.onSpeechResults = (event: { value?: string[] }) => {
        clearTimeout(timeout);
        resolve(event.value?.[0] ?? '');
        Voice.default.destroy().catch(() => {});
      };

      Voice.default.onSpeechError = () => {
        clearTimeout(timeout);
        resolve('');
      };

      Voice.default.start('pt-BR').catch(() => {
        clearTimeout(timeout);
        resolve('');
      });
    });
  } catch {
    return '';
  }
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#374151',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  closeSheetBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  closeSheetText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '700',
  },
  micContainer: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  micLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  hintBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  hintText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontStyle: 'italic',
  },
  transcriptBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  transcriptLabel: {
    color: '#6B7280',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    color: '#E5E7EB',
    fontSize: 15,
    fontStyle: 'italic',
  },
  actionBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(16,185,129,0.08)',
  },
  actionMessage: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionAgent: {
    color: '#6B7280',
    fontSize: 12,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },
  examplesSection: {
    marginTop: 8,
    gap: 6,
  },
  quickCommandsRow: {
    marginTop: 10,
    gap: 8,
  },
  quickCommandChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quickCommandText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  examplesTitle: {
    color: '#4B5563',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  exampleItem: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
  },
});
