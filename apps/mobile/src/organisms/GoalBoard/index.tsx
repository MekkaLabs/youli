/**
 * GoalBoard v2 — organismo completo de metas
 * - Header com stats gerais + progresso médio radial
 * - Filtro por status (todas / ativas / concluídas / em risco)
 * - GoalCards com barra de progresso, marcos e Alexandre insights
 * - Botão de adicionar meta
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useGoals, type GoalData } from '../../hooks/useGoals';
import { GoalCard } from '../../molecules/GoalCard';

type FilterType = 'all' | 'active' | 'completed' | 'at_risk';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'Todas',
  active: 'Ativas',
  completed: 'Concluídas',
  at_risk: 'Em risco',
};

const CATEGORY_EMOJIS: Record<string, string> = {
  carreira: '💼',
  financeiro: '💰',
  saude: '🏃',
  aprendizado: '📚',
  relacionamentos: '❤️',
  pessoal: '🎯',
};

export function GoalBoard() {
  const { goals, stats, updateProgress, addGoal, restoreGoal, deleteGoal, goalStatus, progressPercent, daysUntil, syncing, syncError, lastSyncAt, refresh } = useGoals();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [undoGoal, setUndoGoal] = useState<GoalData | null>(null);

  // Form
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎯');
  const [newColor, setNewColor] = useState('#DC2626');
  const [newTarget, setNewTarget] = useState('');
  const [newUnit, setNewUnit] = useState('%');
  const [newDeadline, setNewDeadline] = useState('');
  const [newCategory, setNewCategory] = useState<string>('pessoal');

  const filtered = goals.filter(g => {
    if (filter === 'all') return true;
    return goalStatus(g) === filter;
  });

  const handleAdd = () => {
    if (!newTitle.trim() || !newTarget || !newDeadline) return;
    const deadline = new Date(newDeadline);
    if (isNaN(deadline.getTime())) return;

    addGoal({
      title: newTitle.trim(),
      emoji: newEmoji,
      color: newColor,
      category: newCategory as any,
      currentValue: 0,
      targetValue: parseFloat(newTarget),
      unit: newUnit,
      startDate: new Date().toISOString().split('T')[0],
      deadline: deadline.toISOString().split('T')[0],
      milestones: [
        { id: 'm1', title: '25%', targetValue: parseFloat(newTarget) * 0.25 },
        { id: 'm2', title: '50%', targetValue: parseFloat(newTarget) * 0.5 },
        { id: 'm3', title: '75%', targetValue: parseFloat(newTarget) * 0.75 },
        { id: 'm4', title: '100% ✓', targetValue: parseFloat(newTarget) },
      ],
    });
    setNewTitle(''); setNewTarget(''); setShowAdd(false);
  };

  const confirmDelete = (goalId: string, title: string) => {
    Alert.alert(
      'Apagar meta',
      `Deseja apagar a meta "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            const removed = goals.find((g) => g.id === goalId);
            deleteGoal(goalId);
            if (removed) {
              setUndoGoal(removed);
              setTimeout(() => setUndoGoal((current) => (current?.id === goalId ? null : current)), 6000);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.syncBar}>
        <Text style={styles.syncText}>
          {syncing
            ? 'Sincronizando metas...'
            : syncError
              ? 'Modo offline (cache local)'
              : `Sincronizado ${lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString('pt-BR') : 'agora'}`}
        </Text>
        <TouchableOpacity onPress={refresh}>
          <Text style={styles.syncAction}>Sincronizar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats header ──────────────────────────── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.statsCard}>
        {/* Progresso médio grande */}
        <View style={styles.avgBlock}>
          <Text style={[styles.avgNum, {
            color: stats.avgProgress >= 70 ? '#059669' : stats.avgProgress >= 40 ? '#D97706' : '#DC2626',
          }]}>
            {stats.avgProgress}%
          </Text>
          <Text style={styles.avgLabel}>progresso médio</Text>
        </View>

        {/* Stats linha */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.active}</Text>
            <Text style={styles.statLabel}>⚡ ativas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.completed}</Text>
            <Text style={styles.statLabel}>✅ concluídas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, stats.atRisk > 0 && { color: '#DC2626' }]}>{stats.atRisk}</Text>
            <Text style={styles.statLabel}>⚠️ em risco</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.milestonesReached}</Text>
            <Text style={styles.statLabel}>🏅 marcos</Text>
          </View>
        </View>

        {/* Alexandre insight geral */}
        <View style={styles.agentInsight}>
          <Text style={styles.agentTag}>⚔️ Alexandre</Text>
          <Text style={styles.agentText}>
            {stats.atRisk > 0
              ? `${stats.atRisk} meta${stats.atRisk > 1 ? 's' : ''} em risco. Alexandre nunca deixou território conquistado escapar — reagrupe e avance.`
              : stats.avgProgress >= 70
              ? 'Progresso excepcional. Você está mais perto da linha de chegada do que parece.'
              : 'Cada meta que você persegue é um território que você decide conquistar. Continue avançando.'}
          </Text>
        </View>
      </Animated.View>

      {/* ── Filtros ───────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(Object.keys(FILTER_LABELS) as FilterType[]).map(f => {
          const count = f === 'all' ? goals.length : goals.filter(g => goalStatus(g) === f).length;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {FILTER_LABELS[f]} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Lista de metas ────────────────────────── */}
      <View style={styles.list}>
        {undoGoal && (
          <View style={styles.undoBar}>
            <Text style={styles.undoText}>Meta apagada.</Text>
            <TouchableOpacity
              onPress={() => {
                restoreGoal(undoGoal);
                setUndoGoal(null);
              }}
            >
              <Text style={styles.undoAction}>Desfazer</Text>
            </TouchableOpacity>
          </View>
        )}
        {filtered.map((goal, i) => (
          <View key={goal.id} style={styles.goalItemWrap}>
            <GoalCard
              goal={goal}
              index={i}
              status={goalStatus(goal)}
              progressPercent={progressPercent(goal.currentValue, goal.targetValue)}
              daysUntil={daysUntil(goal.deadline)}
              onUpdateProgress={(v) => updateProgress(goal.id, v)}
            />
            <TouchableOpacity
              style={styles.deleteGoalBtn}
              onPress={() => confirmDelete(goal.id, goal.title)}
            >
              <Text style={styles.deleteGoalText}>Apagar meta</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Animated.View entering={FadeInDown.delay(filtered.length * 80 + 100)}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Nova meta</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── Modal: adicionar meta ─────────────────── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAdd(false)}>
          <View style={styles.sheet}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Nova Meta</Text>

              <TextInput style={styles.input} placeholder="Título da meta..." placeholderTextColor="#4B5563" value={newTitle} onChangeText={setNewTitle} autoFocus />

              <View style={styles.row2}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.fieldLabel}>Valor alvo</Text>
                  <TextInput style={styles.input} placeholder="Ex: 10000" placeholderTextColor="#4B5563" value={newTarget} onChangeText={setNewTarget} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Unidade</Text>
                  <TextInput style={styles.input} placeholder="R$" placeholderTextColor="#4B5563" value={newUnit} onChangeText={setNewUnit} />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Prazo (AAAA-MM-DD)</Text>
              <TextInput style={[styles.input, { marginBottom: 16 }]} placeholder="Ex: 2026-12-31" placeholderTextColor="#4B5563" value={newDeadline} onChangeText={setNewDeadline} />

              <Text style={styles.fieldLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={styles.catRow}>
                  {Object.entries(CATEGORY_EMOJIS).map(([cat, emoji]) => (
                    <TouchableOpacity key={cat} onPress={() => setNewCategory(cat)}
                      style={[styles.catChip, newCategory === cat && styles.catChipActive]}>
                      <Text style={styles.catText}>{emoji} {cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>Criar meta ⚔️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  syncBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B1220', borderWidth: 1, borderColor: '#1F2937', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  syncText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  syncAction: { color: '#60A5FA', fontSize: 11, fontWeight: '800' },
  statsCard: { backgroundColor: '#111827', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#1F2937', gap: 14 },
  avgBlock: { alignItems: 'center', gap: 4 },
  avgNum: { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  avgLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  statLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: '#1F2937' },
  agentInsight: { backgroundColor: '#1E0F0F', borderRadius: 10, padding: 12, gap: 4 },
  agentTag: { fontSize: 11, color: '#DC2626', fontWeight: '700' },
  agentText: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, fontStyle: 'italic' },
  filterRow: { paddingHorizontal: 2, gap: 8, flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  filterChipActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  filterText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  filterTextActive: { color: '#FFF' },
  list: { gap: 12 },
  goalItemWrap: { gap: 8 },
  deleteGoalBtn: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3F1D1D', backgroundColor: '#1A1111' },
  deleteGoalText: { fontSize: 12, fontWeight: '700', color: '#FCA5A5' },
  undoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2A3A58', backgroundColor: '#0F172A' },
  undoText: { fontSize: 12, color: '#CBD5E1', fontWeight: '600' },
  undoAction: { fontSize: 12, color: '#60A5FA', fontWeight: '800' },
  addBtn: { borderRadius: 12, borderWidth: 1.5, borderColor: '#374151', borderStyle: 'dashed', padding: 14, alignItems: 'center' },
  addBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#374151', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#F9FAFB', marginBottom: 16 },
  fieldLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#1F2937', borderRadius: 12, padding: 14, fontSize: 15, color: '#F9FAFB', marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  row2: { flexDirection: 'row', marginBottom: 0 },
  catRow: { flexDirection: 'row', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  catChipActive: { backgroundColor: '#DC262633', borderColor: '#DC2626' },
  catText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  saveBtn: { backgroundColor: '#DC2626', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
