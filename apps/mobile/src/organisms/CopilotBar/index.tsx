/**
 * CopilotBar (v2 — com agentes especializados)
 * Chat com o orquestrador que roteia para agentes históricos
 * Nome do orquestrador customizável (Youli, Jarvis, Atlas...)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';
import { AgentInsightCard } from '../../molecules/AgentInsightCard';
import { VoiceInput, VoiceActionResult } from '../../molecules/VoiceInput';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  agentResponse?: {
    orchestratorName: string;
    orchestratorEmoji: string;
    primaryAgent: {
      agentName: string;
      agentEmoji: string;
      agentColor: string;
      area: string;
      message: string;
      insights: string[];
      actions: string[];
      urgency: 'low' | 'medium' | 'high';
    };
    synthesis: string;
    suggestedAgents: Array<{ name: string; emoji: string; area: string; reason: string }>;
    nextSteps: string[];
  };
}

interface CopilotBarProps {
  onClose?: () => void;
  orchestratorName?: string;
  orchestratorEmoji?: string;
  userContext?: object;
}

const QUICK_PROMPTS = [
  'Como está meu dia?',
  'O que priorizar agora?',
  'Análise financeira',
  'Status dos hábitos',
  'Metas desta semana',
  'Foco profundo agora',
];

const AREA_AGENTS = [
  { area: 'dashboard', name: 'Leonardo', emoji: '🎨' },
  { area: 'tarefas', name: 'Franklin', emoji: '⚡' },
  { area: 'habitos', name: 'Aristóteles', emoji: '🏛️' },
  { area: 'metas', name: 'Alexandre', emoji: '⚔️' },
  { area: 'financeiro', name: 'Adam', emoji: '💰' },
  { area: 'fitness', name: 'Hipócrates', emoji: '🏃' },
  { area: 'foco', name: 'Tesla', emoji: '🔮' },
  { area: 'insights', name: 'Sócrates', emoji: '🦉' },
];

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export function CopilotBar({
  onClose,
  orchestratorName = 'Youli',
  orchestratorEmoji = '🤖',
  userContext = {},
}: CopilotBarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Saudação inicial
  useEffect(() => {
    const hour = new Date().getHours();
    const greeting =
      hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    setMessages([
      {
        id: '0',
        role: 'assistant',
        text: `${greeting}! Sou ${orchestratorName} ${orchestratorEmoji}, seu assistente pessoal de vida.\n\nTenho 10 especialistas prontos para te ajudar — de finanças a foco profundo. O que você precisa hoje?`,
      },
    ]);
  }, [orchestratorName, orchestratorEmoji]);

  const sendMessage = async (text: string, forceArea?: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setActiveAgent(null);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const endpoint = forceArea
        ? `${API_BASE}/api/copilot/agent/${forceArea}`
        : `${API_BASE}/api/copilot/orchestrate`;

      const body = forceArea
        ? { message: text, context: userContext, orchestratorConfig: { name: orchestratorName, emoji: orchestratorEmoji } }
        : { message: text, context: userContext, orchestratorConfig: { name: orchestratorName, emoji: orchestratorEmoji }, mode: 'chat' };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // Normaliza resposta
      let agentResponse = data.primaryAgent ? data : {
        orchestratorName,
        orchestratorEmoji,
        primaryAgent: data,
        synthesis: data.message,
        suggestedAgents: [],
        nextSteps: data.actions || [],
      };

      setActiveAgent(agentResponse.primaryAgent?.agentName || null);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: agentResponse.synthesis || agentResponse.primaryAgent?.message || 'Processando...',
        agentResponse,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `${orchestratorEmoji} ${orchestratorName} está fora do ar. Verifique a conexão com a API.`,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={20}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>{orchestratorEmoji}</Text>
          <View>
            <Text style={styles.headerName}>{orchestratorName}</Text>
            {activeAgent && (
              <Animated.Text entering={FadeIn} style={styles.headerSub}>
                Consultando {activeAgent}...
              </Animated.Text>
            )}
            {!activeAgent && !loading && (
              <Text style={styles.headerSub}>10 especialistas ativos</Text>
            )}
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Agentes rápidos */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.agentsScroll}
        contentContainerStyle={styles.agentsContent}
      >
        {AREA_AGENTS.map((agent) => (
          <TouchableOpacity
            key={agent.area}
            style={styles.agentChip}
            onPress={() => sendMessage(`${agent.emoji} Análise rápida da área ${agent.area}`, agent.area)}
            activeOpacity={0.7}
          >
            <Text style={styles.agentChipEmoji}>{agent.emoji}</Text>
            <Text style={styles.agentChipName}>{agent.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Mensagens */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, i) => (
          <View key={msg.id}>
            {msg.role === 'user' ? (
              <Animated.View entering={FadeInDown.duration(200)} style={styles.userBubble}>
                <Text style={styles.userText}>{msg.text}</Text>
              </Animated.View>
            ) : msg.agentResponse ? (
              <Animated.View entering={FadeInDown.delay(100).duration(300)}>
                <AgentInsightCard
                  agentName={msg.agentResponse.primaryAgent.agentName}
                  agentEmoji={msg.agentResponse.primaryAgent.agentEmoji}
                  agentColor={msg.agentResponse.primaryAgent.agentColor}
                  orchestratorName={msg.agentResponse.orchestratorName}
                  message={msg.agentResponse.primaryAgent.message}
                  insights={msg.agentResponse.primaryAgent.insights}
                  actions={msg.agentResponse.primaryAgent.actions}
                  urgency={msg.agentResponse.primaryAgent.urgency}
                  synthesis={msg.agentResponse.synthesis}
                  suggestedAgents={msg.agentResponse.suggestedAgents}
                  onActionPress={(action) => sendMessage(`Como executar: ${action}`)}
                  onSuggestedAgentPress={(area) =>
                    sendMessage(`Consulte ${area} para mim`, area)
                  }
                  style={styles.agentCard}
                />
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.assistantBubble}>
                <Text style={styles.assistantText}>{msg.text}</Text>
              </Animated.View>
            )}
          </View>
        ))}

        {loading && (
          <Animated.View entering={FadeIn} style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tokens.colors.primary} />
            <Text style={styles.loadingText}>
              {activeAgent ? `${activeAgent} analisando...` : `${orchestratorName} processando...`}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickScroll}
          contentContainerStyle={styles.quickContent}
        >
          {QUICK_PROMPTS.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              style={styles.quickChip}
              onPress={() => sendMessage(prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        {/* Botão de voz */}
        <VoiceInput
          onResult={(text) => setInput(text)}
          onAction={(result: VoiceActionResult) => {
            // Adiciona transcrição + resposta do agente no histórico do chat
            if (result.success) {
              const userMsg: Message = {
                id: (Date.now() - 1).toString(),
                role: 'user',
                text: `🎤 ${result.intent?.rawText ?? ''}`,
              };
              const assistantMsg: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                text: result.message,
              };
              setMessages((prev: Message[]) => [...prev, userMsg, assistantMsg]);
            }
          }}
          profileId="demo"
        />

        <TextInput
          style={styles.input}
          placeholder={`Pergunte para ${orchestratorName}...`}
          placeholderTextColor={tokens.colors.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  headerEmoji: { fontSize: 28 },
  headerName: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  headerSub: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.surfaceDim || '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: tokens.colors.textSecondary,
  },
  agentsScroll: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  agentsContent: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    gap: tokens.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.radii.full,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  agentChipEmoji: { fontSize: 14 },
  agentChipName: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSecondary,
    fontWeight: tokens.fontWeight.medium,
  },
  messages: { flex: 1 },
  messagesContent: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radii.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    maxWidth: '80%',
  },
  userText: {
    color: '#FFF',
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radii.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    maxWidth: '85%',
  },
  assistantText: {
    color: tokens.colors.text,
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
  },
  agentCard: {
    marginVertical: tokens.spacing.xs,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
  },
  loadingText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
  },
  quickScroll: { maxHeight: 44 },
  quickContent: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    gap: tokens.spacing.xs,
    flexDirection: 'row',
  },
  quickChip: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radii.full,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  quickText: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: tokens.fontWeight.bold,
  },
});
