/**
 * HabitDeck v2 — organismo completo de hábitos
 * - Header com stats do dia + progresso
 * - Filtro por categoria
 * - Lista de HabitCards com check animado + calendário de contribuições
 * - Milestone overlay (Aristóteles celebra marcos de 3/7/21/66 dias)
 * - Modal para adicionar novo hábito
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useHabits, type HabitData } from '../../hooks/useHabits';
import { HabitCard } from '../../molecules/HabitCard';
import { StreakMilestone } from '../../molecules/StreakMilestone';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const CATEGORIES = ['Todos', 'Mente', 'Corpo', 'Produtividade', 'Aprendizado', 'Relacionamentos', 'Finanças'];
const EMOJI_OPTIONS = ['🧘', '📚', '🏃', '💧', '📋', '🙏', '💪', '🎯', '🌿', '✍️', '🎵', '🥗', '😴', '🧠', '❤️'];
const COLOR_OPTIONS = ['#059669', '#7C3AED', '#D97706', '#DC2626', '#0891B2', '#16A34A', '#6366F1', '#B45309', '#0EA5E9', '#EC4899'];

export function HabitDeck() {
  const { habits, stats, milestone, toggleToday, dismissMilestone, addHabit, restoreHabit, deleteHabit, isCompletedToday, syncing, syncError, lastSyncAt, refresh } = useHabits();
  const [filter, setFilter] = useState('Todos');
  const [showAdd, setShowAdd] = useState(false);
  const [undoHabit, setUndoHabit] = useState<HabitData | null>(null);

  // Form de novo hábito
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('🧘');
  const [newColor, setNewColor] = useState('#059669');
  const [newCategory, setNewCategory] = useState('Mente');

  const filteredHabits = useMemo(() =>
    filter === 'Todos' ? habits : habits.filter(h => h.category === filter),
    [habits, filter]
  );

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addHabit({
      title: newTitle.trim(),
      emoji: newEmoji,
      color: newColor,
      frequency: 'daily',
      category: newCategory,
    });
    setNewTitle('');
    setShowAdd(false);
  };

  const completionPercent = stats.total > 0
    ? Math.round((stats.completedToday / stats.total) * 100)
    : 0;

  const confirmDelete = (habitId: string, title: string) => {
    Alert.alert(
      'Apagar hábito',
      `Deseja apagar o hábito "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            const removed = habits.find((h) => h.id === habitId);
            deleteHabit(habitId);
            if (removed) {
              setUndoHabit(removed);
              setTimeout(() => setUndoHabit((current) => (current?.id === habitId ? null : current)), 6000);
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
            ? 'Sincronizando hábitos...'
            : syncError
              ? 'Modo offline (cache local)'
              : `Sincronizado ${lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString('pt-BR') : 'agora'}`}
        </Text>
        <TouchableOpacity onPress={refresh}>
          <Text style={styles.syncAction}>Sincronizar</Text>
        </TouchableOpacity>
      </View>

      {/* ── Header de stats ─────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.statsCard}>
        {/* Progresso do dia */}
        <View style={styles.dayProgress}>
          <View style={styles.dayTextRow}>
            <Text style={styles.dayTitle}>
              {completionPercent === 100
                ? '🎉 Dia perfeito!'
                : `${stats.completedToday} de ${stats.total} hoje`}
            </Text>
            <Text style={[styles.dayPercent, { color: completionPercent === 100 ? '#059669' : '#D97706' }]}>
              {completionPercent}%
            </Text>
          </View>
          <View style={styles.dayBarBg}>
            <View
              style={[
                styles.dayBarFill,
                {
                  width: `${completionPercent}%` as `${number}%`,
                  backgroundColor: completionPercent === 100 ? '#059669' : '#D97706',
                },
              ]}
            />
          </View>
        </View>

        {/* Stats linha */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>🔥 streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.bestEver}</Text>
            <Text style={styles.statLabel}>🏆 recorde</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.strongHabits}</Text>
            <Text style={styles.statLabel}>💎 +7 dias</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.totalCompletions}</Text>
            <Text style={styles.statLabel}>✅ total</Text>
          </View>
        </View>

        {/* Aristóteles insight */}
        <View style={styles.agentInsight}>
          <Text style={styles.agentTag}>🏛️ Aristóteles</Text>
          <Text style={styles.agentText}>
            {completionPercent === 100
              ? 'Excelência é um hábito. Hoje você a praticou.'
              : stats.completedToday === 0
              ? 'O momento de agir é agora. Cada hábito ativado hoje fortalece quem você é.'
              : `Você já completou ${stats.completedToday} hábito${stats.completedToday > 1 ? 's' : ''}. A consistência separa intenção de resultado.`}
          </Text>
        </View>
      </Animated.View>

      {/* ── Filtro por categoria ──────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map((cat) => {
          const count = cat === 'Todos' ? habits.length : habits.filter(h => h.category === cat).length;
          if (cat !== 'Todos' && count === 0) return null;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setFilter(cat)}
              style={[styles.filterChip, filter === cat && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === cat && styles.filterTextActive]}>
                {cat} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Lista de hábitos ─────────────────────────────── */}
      <View style={styles.list}>
        {undoHabit && (
          <View style={styles.undoBar}>
            <Text style={styles.undoText}>Hábito apagado.</Text>
            <TouchableOpacity
              onPress={() => {
                restoreHabit(undoHabit);
                setUndoHabit(null);
              }}
            >
              <Text style={styles.undoAction}>Desfazer</Text>
            </TouchableOpacity>
          </View>
        )}
        {filteredHabits.map((habit, i) => (
          <View key={habit.id} style={styles.habitItemWrap}>
            <HabitCard
              habit={habit}
              index={i}
              isCheckedToday={isCompletedToday(habit)}
              onToggle={() => toggleToday(habit.id)}
            />
            <TouchableOpacity
              style={styles.deleteHabitBtn}
              onPress={() => confirmDelete(habit.id, habit.title)}
            >
              <Text style={styles.deleteHabitText}>Apagar hábito</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Botão adicionar */}
        <Animated.View entering={FadeInDown.delay(filteredHabits.length * 70 + 100)}>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.7}>
            <Text style={styles.addBtnText}>+ Novo hábito</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── Milestone overlay ────────────────────────────── */}
      {milestone && (
        <StreakMilestone
          streak={milestone.streak}
          habitTitle={milestone.habitTitle}
          color={milestone.color}
          onDismiss={dismissMilestone}
        />
      )}

      {/* ── Modal: adicionar hábito ───────────────────────── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAdd(false)}>
          <View style={styles.modalSheet}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Novo Hábito</Text>

              <TextInput
                style={styles.input}
                placeholder="Nome do hábito..."
                placeholderTextColor="#4B5563"
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
              />

              <Text style={styles.sectionLabel}>Emoji</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={styles.emojiRow}>
                  {EMOJI_OPTIONS.map(e => (
                    <TouchableOpacity key={e} onPress={() => setNewEmoji(e)}
                      style={[styles.emojiOption, newEmoji === e && styles.emojiSelected]}>
                      <Text style={styles.emojiOptionText}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.sectionLabel}>Cor</Text>
              <View style={[styles.colorRow, { marginBottom: 16 }]}>
                {COLOR_OPTIONS.map(c => (
                  <TouchableOpacity key={c} onPress={() => setNewColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }, newColor === c && styles.colorDotSelected]} />
                ))}
              </View>

              <Text style={styles.sectionLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={styles.catRow}>
                  {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                    <TouchableOpacity key={cat} onPress={() => setNewCategory(cat)}
                      style={[styles.catChip, newCategory === cat && { backgroundColor: newColor + '33', borderColor: newColor }]}>
                      <Text style={[styles.catText, newCategory === cat && { color: newColor }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={[styles.preview, { borderColor: newColor }]}>
                <Text style={styles.previewEmoji}>{newEmoji}</Text>
                <Text style={styles.previewTitle}>{newTitle || 'Nome do hábito'}</Text>
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: newColor }]} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>Criar hábito</Text>
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
  statsCard: {
    backgroundColor: '#111827', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#1F2937', gap: 14,
  },
  dayProgress: { gap: 8 },
  dayTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayTitle: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  dayPercent: { fontSize: 15, fontWeight: '800' },
  dayBarBg: { height: 6, backgroundColor: '#1F2937', borderRadius: 99, overflow: 'hidden' },
  dayBarFill: { height: '100%', borderRadius: 99 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  statLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: '#1F2937' },
  agentInsight: { backgroundColor: '#0F1E16', borderRadius: 10, padding: 12, gap: 4 },
  agentTag: { fontSize: 11, color: '#059669', fontWeight: '700' },
  agentText: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, fontStyle: 'italic' },
  filterRow: { paddingHorizontal: 2, gap: 8, flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99,
    backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151',
  },
  filterChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  filterText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  filterTextActive: { color: '#FFF' },
  list: { gap: 10 },
  habitItemWrap: { gap: 8 },
  deleteHabitBtn: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#3F1D1D', backgroundColor: '#1A1111' },
  deleteHabitText: { fontSize: 12, fontWeight: '700', color: '#FCA5A5' },
  undoBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2A3A58', backgroundColor: '#0F172A' },
  undoText: { fontSize: 12, color: '#CBD5E1', fontWeight: '600' },
  undoAction: { fontSize: 12, color: '#60A5FA', fontWeight: '800' },
  addBtn: {
    borderRadius: 12, borderWidth: 1.5, borderColor: '#374151',
    borderStyle: 'dashed', padding: 14, alignItems: 'center',
  },
  addBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#374151', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#F9FAFB', marginBottom: 16 },
  input: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#F9FAFB', marginBottom: 16,
    borderWidth: 1, borderColor: '#374151',
  },
  sectionLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  emojiRow: { flexDirection: 'row', gap: 8 },
  emojiOption: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2937' },
  emojiSelected: { backgroundColor: '#374151', borderWidth: 2, borderColor: '#9CA3AF' },
  emojiOptionText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: '#FFF' },
  catRow: { flexDirection: 'row', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  catText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 16 },
  previewEmoji: { fontSize: 28 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#F9FAFB', flex: 1 },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
