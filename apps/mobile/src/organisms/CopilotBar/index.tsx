/**
 * CopilotBar v3 — histórico persistido + SimpleMarkdown + contexto real
 * Chat com orquestrador que roteia para 10 agentes históricos
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';
import { AgentInsightCard } from '../../molecules/AgentInsightCard';
import { VoiceInput, VoiceActionResult } from '../../molecules/VoiceInput';
import { SimpleMarkdown } from '../../atoms/SimpleMarkdown';
import { useCopilotHistory } from '../../hooks/useCopilotHistory';

interface AgentResponse {
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
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  agentResponse?: AgentResponse;
  timestamp?: string;
}

interface CopilotBarProps {
  onClose?: () => void;
  orchestratorName?: string;
  orchestratorEmoji?: string;
  userContext?: object;
  currentSection?: string;
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
  { area: 'dashboard', name: 'Leonardo', emoji: '🎨', color: '#7C3AED' },
  { area: 'tarefas',   name: 'Franklin',  emoji: '⚡', color: '#D97706' },
  { area: 'habitos',   name: 'Aristóteles', emoji: '🏛️', color: '#059669' },
  { area: 'metas',     name: 'Alexandre', emoji: '⚔️', color: '#DC2626' },
  { area: 'financeiro',name: 'Adam',      emoji: '💰', color: '#0891B2' },
  { area: 'fitness',   name: 'Hipócrates',emoji: '🏃', color: '#7C3AED' },
  { area: 'foco',      name: 'Tesla',     emoji: '🔮', color: '#6366F1' },
  { area: 'insights',  name: 'Sócrates',  emoji: '🦉', color: '#0EA5E9' },
];

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export function CopilotBar({
  onClose,
  orchestratorName = 'Youli',
  orchestratorEmoji = '🤖',
  userContext = {},
  currentSection = 'dashboard',
}: CopilotBarProps) {
  const { messages: savedMessages, loaded, addMessage, clearHistory } = useCopilotHistory();
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [showClear, setShowClear] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Inicializa mensagens: histórico salvo ou saudação
  useEffect(() => {
    if (!loaded) return;
    if (savedMessages.length > 0) {
      // Converte histórico para formato Message
      const restored: Message[] = savedMessages.slice(-40).map(m => ({
        id: m.id,
        role: m.role,
        text: m.text,
        timestamp: m.timestamp,
      }));
      setSessionMessages(restored);
    } else {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
      const welcome: Message = {
        id: 'welcome',
        role: 'assistant',
        text: `${greeting}! Sou ${orchestratorName} ${orchestratorEmoji}, seu assistente pessoal.\n\n**10 especialistas prontos** — de finanças a foco profundo. O que você precisa hoje?`,
      };
      setSessionMessages([welcome]);
    }
  }, [loaded]);

  // Auto-scroll
  useEffect(() => {
    if (sessionMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [sessionMessages.length, loading]);

  const sendMessage = useCallback(async (text: string, forceArea?: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setSessionMessages(prev => [...prev, userMsg]);
    addMessage({ role: 'user', text });
    setInput('');
    setLoading(true);
    setActiveAgent(null);

    try {
      const endpoint = forceArea
        ? `${API_BASE}/api/copilot/agent/${forceArea}`
        : `${API_BASE}/api/copilot/orchestrate`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: userContext,
          orchestratorConfig: { name: orchestratorName, emoji: orchestratorEmoji },
          mode: 'chat',
          section: currentSection,
        }),
      });

      const data = await res.json();

      const agentResponse: AgentResponse = data.primaryAgent ? data : {
        orchestratorName,
        orchestratorEmoji,
        primaryAgent: data,
        synthesis: data.message,
        suggestedAgents: [],
        nextSteps: data.actions || [],
      };

      setActiveAgent(agentResponse.primaryAgent?.agentName || null);

      const responseText = agentResponse.synthesis || agentResponse.primaryAgent?.message || 'Processando...';
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: responseText,
        agentResponse,
      };

      setSessionMessages(prev => [...prev, assistantMsg]);
      addMessage({
        role: 'assistant',
        text: responseText,
        agentName: agentResponse.primaryAgent?.agentName,
        agentEmoji: agentResponse.primaryAgent?.agentEmoji,
        agentColor: agentResponse.primaryAgent?.agentColor,
      });
    } catch {
      const errText = `${orchestratorEmoji} ${orchestratorName} está offline. Verifique a API.`;
      setSessionMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: errText }]);
      addMessage({ role: 'assistant', text: errText });
    } finally {
      setLoading(false);
      setActiveAgent(null);
    }
  }, [loading, userContext, orchestratorName, orchestratorEmoji, currentSection, addMessage]);

  function handleClear() {
    clearHistory();
    const welcome: Message = {
      id: 'welcome-new',
      role: 'assistant',
      text: `Histórico limpo! Como posso ajudar, ${orchestratorEmoji}?`,
    };
    setSessionMessages([welcome]);
    setShowClear(false);
  }

  function timeLabel(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

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
            <Text style={styles.headerSub}>
              {loading
                ? activeAgent ? `${activeAgent} analisando...` : 'Processando...'
                : `${savedMessages.length} msgs · ${AREA_AGENTS.length} agentes`}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowClear(!showClear)} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>⋯</Text>
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Clear menu */}
      {showClear && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.clearMenu}>
          <TouchableOpacity onPress={handleClear} style={styles.clearMenuItem}>
            <Text style={styles.clearMenuText}>🗑️ Limpar histórico</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Agentes rápidos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.agentsScroll} contentContainerStyle={styles.agentsContent}>
        {AREA_AGENTS.map(agent => (
          <TouchableOpacity
            key={agent.area}
            style={[styles.agentChip, { borderColor: agent.color + '44' }]}
            onPress={() => sendMessage(`${agent.emoji} Análise rápida da área ${agent.area}`, agent.area)}
          >
            <Text style={styles.agentChipEmoji}>{agent.emoji}</Text>
            <Text style={styles.agentChipName}>{agent.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Mensagens */}
      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
        {sessionMessages.map(msg => (
          <View key={msg.id}>
            {msg.role === 'user' ? (
              <Animated.View entering={FadeInDown.duration(200)}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{msg.text}</Text>
                </View>
                {msg.timestamp && <Text style={styles.timeLabel}>{timeLabel(msg.timestamp)}</Text>}
              </Animated.View>
            ) : msg.agentResponse ? (
              <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.agentCard}>
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
                  onActionPress={action => sendMessage(`Como executar: ${action}`)}
                  onSuggestedAgentPress={area => sendMessage(`Consulte ${area} para mim`, area)}
                />
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.assistantBubble}>
                <SimpleMarkdown text={msg.text} textStyle={styles.assistantText} />
                {msg.timestamp && <Text style={[styles.timeLabel, { alignSelf: 'flex-start', marginTop: 4 }]}>{timeLabel(msg.timestamp)}</Text>}
              </Animated.View>
            )}
          </View>
        ))}

        {loading && (
          <Animated.View entering={FadeIn} style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tokens.colors.primary} />
            <Text style={styles.loadingText}>{activeAgent ? `${activeAgent} analisando...` : `${orchestratorName} pensando...`}</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Quick prompts — só na primeira mensagem */}
      {sessionMessages.length <= 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={styles.quickContent}>
          {QUICK_PROMPTS.map(prompt => (
            <TouchableOpacity key={prompt} style={styles.quickChip} onPress={() => sendMessage(prompt)}>
              <Text style={styles.quickText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <VoiceInput
          onResult={text => setInput(text)}
          onAction={(result: VoiceActionResult) => {
            if (result.success) {
              const rawVoiceText = (result.intent as any)?.rawText ?? '';
              const userMsg: Message = { id: (Date.now() - 1).toString(), role: 'user', text: `🎤 ${rawVoiceText}` };
              const assistantMsg: Message = { id: Date.now().toString(), role: 'assistant', text: result.message };
              setSessionMessages(prev => [...prev, userMsg, assistantMsg]);
              addMessage({ role: 'user', text: `🎤 ${rawVoiceText}` });
              addMessage({ role: 'assistant', text: result.message });
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
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerEmoji: { fontSize: 28 },
  headerName: { fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: tokens.colors.text },
  headerSub: { fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted },
  clearBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: tokens.colors.surface, alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { fontSize: 18, color: tokens.colors.textSecondary, lineHeight: 22 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: tokens.colors.surface, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: tokens.colors.textSecondary },
  clearMenu: { position: 'absolute', top: 56, right: 16, backgroundColor: '#1F2937', borderRadius: 12, zIndex: 99, borderWidth: 1, borderColor: '#374151', overflow: 'hidden' },
  clearMenuItem: { paddingHorizontal: 16, paddingVertical: 12 },
  clearMenuText: { fontSize: 14, color: '#F9FAFB', fontWeight: '600' },
  agentsScroll: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: tokens.colors.border },
  agentsContent: { paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.xs, gap: tokens.spacing.xs, flexDirection: 'row', alignItems: 'center' },
  agentChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: tokens.spacing.sm, paddingVertical: 4, borderRadius: tokens.radii.full, backgroundColor: tokens.colors.surface, borderWidth: 1 },
  agentChipEmoji: { fontSize: 14 },
  agentChipName: { fontSize: tokens.fontSize.xs, color: tokens.colors.textSecondary, fontWeight: tokens.fontWeight.medium },
  messages: { flex: 1 },
  messagesContent: { padding: tokens.spacing.md, gap: tokens.spacing.sm, paddingBottom: 16 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: tokens.colors.primary, borderRadius: tokens.radii.lg, borderBottomRightRadius: 4, paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm, maxWidth: '80%' },
  userText: { color: '#FFF', fontSize: tokens.fontSize.sm, lineHeight: 20 },
  timeLabel: { fontSize: 10, color: tokens.colors.textMuted, alignSelf: 'flex-end', marginTop: 2, marginHorizontal: 4 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: tokens.colors.surface, borderRadius: tokens.radii.lg, borderBottomLeftRadius: 4, paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm, maxWidth: '88%' },
  assistantText: { color: tokens.colors.text, fontSize: tokens.fontSize.sm },
  agentCard: { marginVertical: tokens.spacing.xs },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, paddingVertical: tokens.spacing.sm },
  loadingText: { fontSize: tokens.fontSize.sm, color: tokens.colors.textMuted, fontStyle: 'italic' },
  quickScroll: { maxHeight: 44 },
  quickContent: { paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.xs, gap: tokens.spacing.xs, flexDirection: 'row' },
  quickChip: { paddingHorizontal: tokens.spacing.sm, paddingVertical: tokens.spacing.xs, borderRadius: tokens.radii.full, backgroundColor: tokens.colors.surface, borderWidth: 1, borderColor: tokens.colors.border },
  quickText: { fontSize: tokens.fontSize.xs, color: tokens.colors.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm, borderTopWidth: 1, borderTopColor: tokens.colors.border },
  input: { flex: 1, backgroundColor: tokens.colors.surface, borderRadius: tokens.radii.lg, borderWidth: 1, borderColor: tokens.colors.border, paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm, fontSize: tokens.fontSize.sm, color: tokens.colors.text, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: tokens.colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#FFF', fontSize: 18, fontWeight: tokens.fontWeight.bold },
});
