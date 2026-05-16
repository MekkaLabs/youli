/**
 * useOrchestrator
 * Hook central para comunicação com o orquestrador e agentes especializados
 * Gerencia: estado, mensagens, configuração do nome do orquestrador
 */

import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_ORCH = '@youli:orchestrator';

export interface OrchestratorConfig {
  name: string;
  emoji: string;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  agentColor: string;
  area: string;
  message: string;
  insights: string[];
  actions: string[];
  urgency: 'low' | 'medium' | 'high';
  orchestratorName: string;
}

export interface OrchestratorResponse {
  orchestratorName: string;
  orchestratorEmoji: string;
  primaryAgent: AgentResponse;
  synthesis: string;
  suggestedAgents: Array<{ name: string; emoji: string; area: string; reason: string }>;
  mood: string;
  nextSteps: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  agentResponse?: OrchestratorResponse;
  timestamp: Date;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3002';

export function useOrchestrator(userContext?: object) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [orchestratorConfig, setOrchestratorConfig] = useState<OrchestratorConfig>({
    name: 'Youli',
    emoji: '🤖',
  });

  // Carrega config do orquestrador (AsyncStorage)
  const loadConfig = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ORCH);
      if (stored) {
        const parsed = JSON.parse(stored);
        setOrchestratorConfig(parsed);
      }
    } catch {}
  }, []);

  // Salva nova config do orquestrador
  const updateOrchestratorConfig = useCallback(
    async (name: string, emoji: string) => {
      const config = { name, emoji };
      setOrchestratorConfig(config);
      try {
        await AsyncStorage.setItem(STORAGE_KEY_ORCH, JSON.stringify(config));
        // Sincroniza com API
        await fetch(`${API_BASE}/api/settings/orchestrator`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
      } catch {}
    },
    []
  );

  // Envia mensagem para o orquestrador
  const sendMessage = useCallback(
    async (text: string, forceArea?: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const endpoint = forceArea
          ? `${API_BASE}/api/copilot/agent/${forceArea}`
          : `${API_BASE}/api/copilot/orchestrate`;

        const body = forceArea
          ? {
              message: text,
              context: userContext || {},
              orchestratorConfig,
            }
          : {
              message: text,
              context: userContext || {},
              orchestratorConfig,
              mode: 'chat',
            };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Erro no orquestrador');
        }

        // Normaliza resposta (pode ser OrchestratorResponse ou AgentResponse direta)
        let orchestratorResponse: OrchestratorResponse;
        if (data.primaryAgent) {
          orchestratorResponse = data as OrchestratorResponse;
        } else {
          // Resposta direta de agente — encapsula
          orchestratorResponse = {
            orchestratorName: orchestratorConfig.name,
            orchestratorEmoji: orchestratorConfig.emoji,
            primaryAgent: data as AgentResponse,
            synthesis: data.message,
            suggestedAgents: [],
            mood: 'encouraging',
            nextSteps: data.actions || [],
          };
        }

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: orchestratorResponse.synthesis || orchestratorResponse.primaryAgent.message,
          agentResponse: orchestratorResponse,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : '';
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `${orchestratorConfig.emoji} ${orchestratorConfig.name} indisponível. ${errMsg || 'Verifique sua conexão.'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [loading, userContext, orchestratorConfig]
  );

  // Briefing matinal
  const getMorningBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '',
          context: userContext || {},
          orchestratorConfig,
          mode: 'morning',
        }),
      });

      const data: OrchestratorResponse = await res.json();

      const briefingMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        text: data.synthesis,
        agentResponse: data,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, briefingMsg]);
    } catch {}
    finally {
      setLoading(false);
    }
  }, [userContext, orchestratorConfig]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    messages,
    loading,
    orchestratorConfig,
    sendMessage,
    getMorningBriefing,
    updateOrchestratorConfig,
    loadConfig,
    clearMessages,
  };
}
