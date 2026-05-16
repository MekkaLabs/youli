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
import { ActionCard, ActionCardData } from '../../molecules/ActionCard';
import { VoiceInput, VoiceActionResult } from '../../molecules/VoiceInput';
import { SimpleMarkdown } from '../../atoms/SimpleMarkdown';
import { useCopilotHistory } from '../../hooks/useCopilotHistory';
import { streamCopilot, SSEResponseData } from '../../services/api';

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
  graph?: {
    threadId: string;
    area: string;
    events: string[];
    checkpointStatus: 'completed' | 'interrupted';
  };
  interrupted?: {
    reason: string;
  };
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
  prefillMessage?: string;
  useStreaming?: boolean;
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

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

export function CopilotBar({
  onClose,
  orchestratorName = 'Youli',
  orchestratorEmoji = '🤖',
  userContext = {},
  currentSection = 'dashboard',
  prefillMessage,
  useStreaming = false,
}: CopilotBarProps) {
  const { messages: savedMessages, loaded, addMessage, clearHistory } = useCopilotHistory();
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId] = useState(() => `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [showClear, setShowClear] = useState(false);
  const [pendingActions, setPendingActions] = useState<ActionCardData[]>([]);
  // Streaming SSE state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const abortStreamRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!prefillMessage) return;
    setInput((current) => (current.trim().length > 0 ? current : prefillMessage));
  }, [prefillMessage]);

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
  }, [sessionMessages.length, loading, pendingActions.length]);

  // ─── Human-in-the-Loop ──────────────────────────────────────────────────

  function detectHighRiskAction(message: string): ActionCardData | null {
    const lower = message.toLowerCase();
    const metaMatch = lower.match(/criar\s+meta/);
    const valueMatch = message.match(/R\$\s*([\d.,]+)/i);
    if (metaMatch && valueMatch) {
      return {
        id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: 'Criar meta financeira',
        description: `Salvar uma nova meta de R$ ${valueMatch[1]} com base na sua solicitação.`,
        impact: `Impacto esperado: economia de R$ ${valueMatch[1]} no período definido.`,
        agentName: 'Adam Smith',
        agentEmoji: '💰',
        agentColor: '#0891B2',
      };
    }
    if (/marcar\s+(todos|tudo)/.test(lower)) {
      return {
        id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: 'Marcar todos como concluído',
        description: 'Esta ação marcará todos os itens da lista como concluídos de uma só vez.',
        impact: 'Impacto: progresso de 100% em todas as tarefas do período.',
        agentName: 'Franklin',
        agentEmoji: '⚡',
        agentColor: '#D97706',
      };
    }
    if (/reorganizar/.test(lower) && /prioridade/.test(lower)) {
      return {
        id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: 'Reorganizar prioridades',
        description: 'Os itens serão reordenados automaticamente com base nas prioridades sugeridas pelo agente.',
        impact: 'Impacto: nova ordem de execução para suas tarefas e metas.',
        agentName: 'Alexandre',
        agentEmoji: '⚔️',
        agentColor: '#DC2626',
      };
    }
    if (/\b(cancelar|excluir|deletar|apagar|remover)\b/.test(lower)) {
      return {
        id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: 'Excluir registro',
        description: 'Esta ação removerá permanentemente o item selecionado. A operação não pode ser desfeita.',
        impact: 'Impacto: perda permanente dos dados associados ao item.',
        agentName: 'Franklin',
        agentEmoji: '⚡',
        agentColor: '#D97706',
      };
    }
    return null;
  }

  const handleApproveAction = useCallback(async (actionId: string) => {
    try {
      await fetch(`${API_BASE}/api/copilot/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: actionId, status: 'approved' }),
      });
    } catch {
      // Falha silenciosa — ação removida da lista mesmo assim
    }
    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    const msg: Message = { id: `approved_${actionId}`, role: 'assistant', text: 'Acao aprovada e enviada para execucao.' };
    setSessionMessages(prev => [...prev, msg]);
    addMessage({ role: 'assistant', text: msg.text });
  }, [addMessage]);

  const handleRejectAction = useCallback((actionId: string) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    const msg: Message = { id: `rejected_${actionId}`, role: 'assistant', text: 'Acao cancelada.' };
    setSessionMessages(prev => [...prev, msg]);
    addMessage({ role: 'assistant', text: msg.text });
  }, [addMessage]);

  // ─────────────────────────────────────────────────────────────────────────

  // Cancela stream SSE em andamento
  const cancelStream = useCallback(() => {
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessage('');
    setLoading(false);
    setActiveAgent(null);
  }, []);

  useEffect(() => {
    return () => {
      if (abortStreamRef.current) {
        abortStreamRef.current();
        abortStreamRef.current = null;
      }
    };
  }, []);

  const handleCloseCopilot = useCallback(() => {
    cancelStream();
    setShowClear(false);
    onClose?.();
  }, [cancelStream, onClose]);

  const sendMessage = useCallback(async (text: string, forceArea?: string) => {
    if (!text.trim() || loading || isStreaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setSessionMessages(prev => [...prev, userMsg]);
    addMessage({ role: 'user', text });
    setInput('');
    setLoading(true);
    setActiveAgent(null);

    // ── Streaming SSE branch (somente para orchestrate sem forceArea) ──────────
    if (useStreaming && !forceArea) {
      setIsStreaming(true);
      setStreamingMessage('');

      const assistantMsgId = (Date.now() + 1).toString();
      // Insere placeholder vazio que vai ser atualizado via streaming
      setSessionMessages(prev => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', text: '' } as Message,
      ]);

      let accumulatedText = '';
      let finalResponse: SSEResponseData | null = null;

      const abort = streamCopilot(
        text,
        userContext as Record<string, unknown>,
        (event, data) => {
          if (event === 'start') {
            const startData = data as { agent?: string };
            if (startData?.agent) setActiveAgent(startData.agent);
          } else if (event === 'thinking') {
            const thinkData = data as { step?: string };
            if (thinkData?.step) {
              setActiveAgent(thinkData.step);
            }
          } else if (event === 'response') {
            finalResponse = data as SSEResponseData;
            accumulatedText = finalResponse.synthesis || finalResponse.message || '';
            setStreamingMessage(accumulatedText);
            // Atualiza a mensagem placeholder em tempo real
            setSessionMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId ? { ...m, text: accumulatedText } : m,
              ),
            );
          } else if (event === 'error') {
            const errData = data as { error?: string };
            const errText = `${orchestratorEmoji} ${orchestratorName} está indisponível agora. ${errData?.error || 'Verifique a API.'}`;
            setSessionMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId ? { ...m, text: errText } : m,
              ),
            );
            addMessage({ role: 'assistant', text: errText });
            setIsStreaming(false);
            setStreamingMessage('');
            setLoading(false);
            setActiveAgent(null);
          }
        },
        (_doneData) => {
          // Finaliza o stream: consolida mensagem final
          const finalText = accumulatedText || 'Resposta recebida.';

          // Constrói AgentResponse a partir do que veio no evento response
          let agentResp: AgentResponse | undefined;
          if (finalResponse?.primaryAgent) {
            const pa = finalResponse.primaryAgent as AgentResponse['primaryAgent'];
            agentResp = {
              orchestratorName,
              orchestratorEmoji,
              primaryAgent: pa,
              synthesis: finalResponse.synthesis ?? finalText,
              suggestedAgents: (finalResponse.suggestedAgents ?? []) as AgentResponse['suggestedAgents'],
              nextSteps: finalResponse.nextSteps ?? [],
            };
          }

          setSessionMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, text: finalText, agentResponse: agentResp }
                : m,
            ),
          );
          addMessage({
            role: 'assistant',
            text: finalText,
            agentName: agentResp?.primaryAgent?.agentName,
            agentEmoji: agentResp?.primaryAgent?.agentEmoji,
            agentColor: agentResp?.primaryAgent?.agentColor,
          });

          // Human-in-the-Loop: detecta ação de alto risco na resposta
          const detected = detectHighRiskAction(finalText);
          if (detected) {
            setPendingActions(prev => [...prev, detected]);
          }

          abortStreamRef.current = null;
          setIsStreaming(false);
          setStreamingMessage('');
          setLoading(false);
          setActiveAgent(null);
        },
        { name: orchestratorName, emoji: orchestratorEmoji },
        threadId,
      );

      abortStreamRef.current = abort;
      return;
    }

    // ── JSON branch (comportamento original inalterado) ───────────────────────
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
          threadId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'Erro no orquestrador';
        throw new Error(message);
      }

      if (!data?.primaryAgent && !data?.agentName) {
        const safeText = typeof data?.synthesis === 'string'
          ? data.synthesis
          : typeof data?.message === 'string'
            ? data.message
            : 'Resposta inválida do orquestrador.';
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: safeText,
        };
        setSessionMessages(prev => [...prev, assistantMsg]);
        addMessage({ role: 'assistant', text: safeText });

        // Human-in-the-Loop: detecta ação de alto risco
        const detected = detectHighRiskAction(safeText);
        if (detected) setPendingActions(prev => [...prev, detected]);

        setLoading(false);
        return;
      }

      const agentResponse: AgentResponse = data.primaryAgent ? data : {
        orchestratorName,
        orchestratorEmoji,
        primaryAgent: data,
        synthesis: data.message,
        suggestedAgents: [],
        nextSteps: data.actions || [],
      };

      setActiveAgent(agentResponse.primaryAgent?.agentName || null);

      const interruptBanner = agentResponse.interrupted?.reason
        ? `\n\n⚠️ Confirmação necessária: ${agentResponse.interrupted.reason}`
        : '';
      const responseText = (agentResponse.synthesis || agentResponse.primaryAgent?.message || 'Processando...') + interruptBanner;
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

      // Human-in-the-Loop: detecta ação de alto risco na resposta
      const detected = detectHighRiskAction(responseText);
      if (detected) setPendingActions(prev => [...prev, detected]);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      const errText = `${orchestratorEmoji} ${orchestratorName} está indisponível agora. ${errMsg || 'Verifique a API.'}`;
      setSessionMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: errText }]);
      addMessage({ role: 'assistant', text: errText });
    } finally {
      setLoading(false);
      setActiveAgent(null);
    }
  }, [loading, isStreaming, useStreaming, userContext, orchestratorName, orchestratorEmoji, currentSection, addMessage, threadId]);

  const confirmInterruptedAction = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/orchestrate/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          message: 'Confirmo a execução',
          context: userContext,
          orchestratorConfig: { name: orchestratorName, emoji: orchestratorEmoji },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.primaryAgent) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Falha ao confirmar');
      }
      const responseText = data.synthesis || data.primaryAgent?.message || 'Confirmação executada.';
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: responseText,
        agentResponse: data as AgentResponse,
      };
      setSessionMessages(prev => [...prev, assistantMsg]);
      addMessage({ role: 'assistant', text: responseText });
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Falha ao confirmar';
      setSessionMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: `Não consegui confirmar: ${errText}` }]);
      addMessage({ role: 'assistant', text: `Não consegui confirmar: ${errText}` });
    } finally {
      setLoading(false);
    }
  }, [loading, threadId, userContext, orchestratorName, orchestratorEmoji, addMessage]);

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
              {isStreaming
                ? activeAgent ? `${activeAgent}...` : 'Recebendo resposta...'
                : loading
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
            <TouchableOpacity onPress={handleCloseCopilot} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
                {msg.agentResponse?.interrupted?.reason ? (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmText}>Ação sensível pausada: {msg.agentResponse.interrupted.reason}</Text>
                    <TouchableOpacity style={styles.confirmBtn} onPress={confirmInterruptedAction} disabled={loading}>
                      <Text style={styles.confirmBtnText}>{loading ? 'Confirmando...' : 'Confirmar execução'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.assistantBubble}>
                <SimpleMarkdown
                  text={isStreaming && !msg.timestamp && msg.text === streamingMessage && streamingMessage
                    ? `${msg.text}|`
                    : msg.text}
                  textStyle={styles.assistantText}
                />
                {msg.timestamp && <Text style={[styles.timeLabel, { alignSelf: 'flex-start', marginTop: 4 }]}>{timeLabel(msg.timestamp)}</Text>}
              </Animated.View>
            )}
          </View>
        ))}

        {/* ActionCards — Human-in-the-Loop */}
        {pendingActions.map(action => (
          <ActionCard
            key={action.id}
            {...action}
            onApprove={handleApproveAction}
            onReject={handleRejectAction}
          />
        ))}

        {loading && !isStreaming && (
          <Animated.View entering={FadeIn} style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tokens.colors.primary} />
            <Text style={styles.loadingText}>{activeAgent ? `${activeAgent} analisando...` : `${orchestratorName} pensando...`}</Text>
          </Animated.View>
        )}
        {isStreaming && !streamingMessage && (
          <Animated.View entering={FadeIn} style={styles.loadingRow}>
            <ActivityIndicator size="small" color={tokens.colors.primary} />
            <Text style={styles.loadingText}>{activeAgent ? `${activeAgent}...` : 'Recebendo resposta...'}</Text>
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
        {!isStreaming && (
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
        )}
        <TextInput
          style={styles.input}
          placeholder={isStreaming ? 'Recebendo resposta...' : `Pergunte para ${orchestratorName}...`}
          placeholderTextColor={tokens.colors.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          multiline
          maxLength={500}
          editable={!isStreaming}
        />
        {isStreaming ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelStream}>
            <Text style={styles.cancelBtnText}>■</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        )}
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
  confirmBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#7C2D12',
    backgroundColor: '#1F110A',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  confirmText: { color: '#FDBA74', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  confirmBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#B45309',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
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
  cancelBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
