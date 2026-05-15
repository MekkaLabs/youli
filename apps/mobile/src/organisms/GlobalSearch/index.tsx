/**
 * GlobalSearch — busca universal em tarefas, hábitos e metas
 * Abre como modal overlay ao tocar a lupa no dashboard
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, StyleSheet, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useTasks } from '../../hooks/useTasks';
import { useHabits } from '../../hooks/useHabits';
import { useGoals } from '../../hooks/useGoals';

type ResultType = 'task' | 'habit' | 'goal';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  meta?: string;
}

const TYPE_CONFIG: Record<ResultType, { color: string; label: string }> = {
  task:  { color: '#D97706', label: 'Tarefa' },
  habit: { color: '#059669', label: 'Hábito' },
  goal:  { color: '#7C3AED', label: 'Meta' },
};

interface GlobalSearchProps {
  visible: boolean;
  onClose: () => void;
}

export function GlobalSearch({ visible, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const { tasks } = useTasks();
  const habits = useHabits();
  const goals = useGoals();

  const habitsArr = (habits as any).habits ?? [];
  const goalsArr = (goals as any).goals ?? [];

  const results = useMemo((): SearchResult[] => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();

    const taskResults: SearchResult[] = tasks
      .filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 5)
      .map(t => ({
        id: t.id, type: 'task', title: t.title,
        subtitle: `${t.status === 'done' ? '✓ Concluída' : t.status === 'doing' ? '◑ Em progresso' : '○ A fazer'}`,
        icon: '⚡', color: '#D97706',
        meta: t.priority,
      }));

    const habitResults: SearchResult[] = habitsArr
      .filter((h: any) => h.title.toLowerCase().includes(q) || h.category?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((h: any) => ({
        id: h.id, type: 'habit', title: h.title,
        subtitle: `${h.streak} dias de streak · ${h.category}`,
        icon: h.emoji ?? '🔥', color: '#059669',
        meta: `${h.streak}🔥`,
      }));

    const goalResults: SearchResult[] = goalsArr
      .filter((g: any) => g.title.toLowerCase().includes(q) || g.category?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((g: any) => ({
        id: g.id, type: 'goal', title: g.title,
        subtitle: `${g.progress ?? Math.round((g.currentValue / g.targetValue) * 100)}% · ${g.category}`,
        icon: g.emoji ?? '🎯', color: '#7C3AED',
        meta: `${g.progress ?? Math.round((g.currentValue / g.targetValue) * 100)}%`,
      }));

    return [...taskResults, ...habitResults, ...goalResults].slice(0, 12);
  }, [query, tasks, habitsArr, goalsArr]);

  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  function renderItem({ item, index }: { item: SearchResult; index: number }) {
    const cfg = TYPE_CONFIG[item.type];
    return (
      <TouchableOpacity style={styles.resultItem} onPress={handleClose}>
        <Text style={styles.resultIcon}>{item.icon}</Text>
        <View style={styles.resultBody}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.resultSub} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: cfg.color + '22' }]}>
          <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View entering={FadeIn.duration(150)} style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <Animated.View entering={SlideInDown.springify()} style={styles.sheet}>
            {/* Search input */}
            <View style={styles.searchRow}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar tarefas, hábitos, metas..."
                placeholderTextColor="#4B5563"
                value={query}
                onChangeText={setQuery}
                autoFocus
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>

            {/* Empty state ou resultados */}
            {query.length < 2 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>Busca universal</Text>
                <Text style={styles.emptySub}>Digite pelo menos 2 caracteres para buscar em tarefas, hábitos e metas</Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>😶</Text>
                <Text style={styles.emptyTitle}>Nenhum resultado</Text>
                <Text style={styles.emptySub}>Nada encontrado para "{query}"</Text>
              </View>
            ) : (
              <>
                <Text style={styles.resultsLabel}>{results.length} resultado{results.length !== 1 ? 's' : ''}</Text>
                <FlatList
                  data={results}
                  keyExtractor={item => `${item.type}-${item.id}`}
                  renderItem={renderItem}
                  contentContainerStyle={styles.resultsList}
                  keyboardShouldPersistTaps="handled"
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// Botão de trigger para usar no dashboard
export function SearchTrigger({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.trigger}>
      <Text style={styles.triggerIcon}>🔍</Text>
      <Text style={styles.triggerText}>Buscar...</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  kav: { flex: 1 },
  sheet: { backgroundColor: '#0F172A', flex: 1, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 16, color: '#F9FAFB', backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#1F2937' },
  cancelBtn: { paddingHorizontal: 8 },
  cancelText: { fontSize: 14, color: '#7C3AED', fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#F9FAFB' },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  resultsLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', padding: 16, paddingBottom: 8 },
  resultsList: { paddingHorizontal: 16 },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  resultIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  resultBody: { flex: 1, gap: 3 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  resultSub: { fontSize: 12, color: '#6B7280' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#111827' },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#1F2937', flex: 1 },
  triggerIcon: { fontSize: 14 },
  triggerText: { fontSize: 14, color: '#4B5563', flex: 1 },
});
