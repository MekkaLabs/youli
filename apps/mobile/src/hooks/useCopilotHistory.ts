/**
 * useCopilotHistory — persiste histórico do CopilotBar em AsyncStorage
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@youli:copilot_history';
const MAX_MESSAGES = 100;

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  agentName?: string;
  agentEmoji?: string;
  agentColor?: string;
}

export function useCopilotHistory() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) setMessages(JSON.parse(raw));
      setLoaded(true);
    });
  }, []);

  const addMessage = useCallback((msg: Omit<CopilotMessage, 'id' | 'timestamp'>) => {
    const full: CopilotMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => {
      const updated = [...prev, full].slice(-MAX_MESSAGES);
      AsyncStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
    return full;
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    AsyncStorage.removeItem(KEY);
  }, []);

  return { messages, loaded, addMessage, clearHistory };
}
