/**
 * TaskBoard — Kanban visual com criação de tarefas inline
 * Colunas: A fazer / Executando / Concluído
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTasks, LocalTask, TaskStatus, TaskPriority } from '../../hooks/useTasks';

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string; icon: string }> = {
  low:      { color: '#6B7280', label: 'Baixa', icon: '○' },
  medium:   { color: '#3B82F6', label: 'Média', icon: '◐' },
  high:     { color: '#D97706', label: 'Alta', icon: '●' },
  critical: { color: '#DC2626', label: 'Crítica', icon: '🔴' },
};

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string; icon: string; next: TaskStatus | null }> = {
  todo:  { color: '#6B7280', label: 'A Fazer', icon: '○', next: 'doing' },
  doing: { color: '#D97706', label: 'Executando', icon: '◑', next: 'done' },
  done:  { color: '#059669', label: 'Concluído', icon: '●', next: null },
};

// ── Formulário de nova tarefa ────────────────────────────────────────────────
interface NewTaskFormProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
}

function NewTaskForm({ visible, onClose, onCreate }: NewTaskFormProps) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [saving, setSaving] = useState(false);

  function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    onCreate({ title: title.trim(), description: desc.trim(), status: 'todo' as TaskStatus, priority });
    setTitle(''); setDesc(''); setPriority('medium');
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View entering={FadeInDown.springify().damping(24).stiffness(220).mass(0.9)} style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Nova Tarefa</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="O que precisa ser feito?"
            placeholderTextColor="#4B5563"
            value={title}
            onChangeText={setTitle}
            autoFocus
            maxLength={100}
          />
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Descrição (opcional)"
            placeholderTextColor="#4B5563"
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={3}
            maxLength={300}
          />

          <Text style={styles.fieldLabel}>Prioridade</Text>
          <View style={styles.priorityRow}>
            {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG.low][]).map(([key, cfg]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setPriority(key)}
                style={[styles.priorityChip, priority === key && { borderColor: cfg.color, backgroundColor: cfg.color + '22' }]}
              >
                <Text style={[styles.priorityChipText, { color: priority === key ? cfg.color : '#6B7280' }]}>
                  {cfg.icon} {cfg.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formFooter}>
            <Text style={styles.xpHint}>+{priority === 'low' ? 5 : priority === 'medium' ? 15 : priority === 'high' ? 30 : 50} XP ao concluir</Text>
            <TouchableOpacity
              onPress={handleCreate}
              style={[styles.createBtn, !title.trim() && styles.createBtnDisabled]}
              disabled={!title.trim() || saving}
            >
              {saving ? <ActivityIndicator size={16} color="#fff" /> : <Text style={styles.createBtnText}>Criar tarefa</Text>}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Card de tarefa ────────────────────────────────────────────────────────────
function TaskCard({ task, onMove, onDelete, index }: {
  task: LocalTask;
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  index: number;
}) {
  const pcfg = PRIORITY_CONFIG[task.priority];
  const scfg = STATUS_CONFIG[task.status];
  const isDone = task.status === 'done';

  return (
    <Animated.View entering={FadeInRight.delay(index * 50)} style={[styles.taskCard, isDone && styles.taskCardDone]}>
      <View style={styles.taskCardTop}>
        <View style={[styles.priorityDot, { backgroundColor: pcfg.color }]} />
        <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
      </View>

      {task.description ? (
        <Text style={styles.taskDesc} numberOfLines={1}>{task.description}</Text>
      ) : null}

      <View style={styles.taskFooter}>
        <Text style={[styles.taskXP, { color: pcfg.color }]}>+{task.xpReward} XP</Text>
        <View style={styles.taskActions}>
          {scfg.next && (
            <TouchableOpacity
              onPress={() => onMove(task.id, scfg.next!)}
              style={[styles.moveBtn, { borderColor: STATUS_CONFIG[scfg.next].color }]}
            >
              <Text style={[styles.moveBtnText, { color: STATUS_CONFIG[scfg.next].color }]}>
                → {STATUS_CONFIG[scfg.next].label}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Coluna Kanban ─────────────────────────────────────────────────────────────
// Mantida (prefixo _) para reativação futura do modo kanban (hoje só list).
function _KanbanColumn({ status, tasks, onMove, onDelete }: {
  status: TaskStatus;
  tasks: LocalTask[];
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={styles.column}>
      <View style={[styles.columnHeader, { borderBottomColor: cfg.color }]}>
        <Text style={[styles.columnIcon, { color: cfg.color }]}>{cfg.icon}</Text>
        <Text style={styles.columnTitle}>{cfg.label}</Text>
        <View style={[styles.countBadge, { backgroundColor: cfg.color + '22' }]}>
          <Text style={[styles.countText, { color: cfg.color }]}>{tasks.length}</Text>
        </View>
      </View>
      {tasks.length === 0 ? (
        <View style={styles.emptyCol}>
          <Text style={styles.emptyColText}>{status === 'todo' ? 'Adicione tarefas' : status === 'doing' ? 'Nada em andamento' : 'Nada concluído ainda'}</Text>
        </View>
      ) : (
        tasks.map((task, i) => (
          <TaskCard key={task.id} task={task} onMove={onMove} onDelete={onDelete} index={i} />
        ))
      )}
    </View>
  );
}

// ── TaskBoard principal ───────────────────────────────────────────────────────
export function TaskBoard({ filter: periodFilter }: { filter?: 'hoje' | 'semana' | 'backlog' }) {
  const { tasks, counts, createTask, restoreTask, moveTask, deleteTask, syncing, syncError, lastSyncAt, refresh } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [_view, _setView] = useState<'kanban' | 'list'>('list');
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [undoTask, setUndoTask] = useState<LocalTask | null>(null);

  // Filtra por período se especificado externamente
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

  const periodFiltered = periodFilter
    ? tasks.filter(t => {
        if (periodFilter === 'hoje') {
          const created = new Date(t.createdAt ?? 0);
          return created >= startOfToday || t.status === 'doing';
        }
        if (periodFilter === 'semana') {
          const created = new Date(t.createdAt ?? 0);
          return created >= startOfWeek;
        }
        return t.status === 'todo'; // backlog
      })
    : tasks;

  const _byStatus: Record<TaskStatus, LocalTask[]> = {
    todo:  periodFiltered.filter(t => t.status === 'todo'),
    doing: periodFiltered.filter(t => t.status === 'doing'),
    done:  periodFiltered.filter(t => t.status === 'done'),
  };
  const filtered = filter === 'all' ? periodFiltered : periodFiltered.filter(t => t.status === filter);
  const handleDeleteTask = (task: LocalTask) => {
    Alert.alert(
      'Apagar tarefa',
      `Deseja apagar "${task.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            deleteTask(task.id);
            setUndoTask(task);
            setTimeout(() => setUndoTask((current) => (current?.id === task.id ? null : current)), 6000);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.syncBar}>
        <Text style={styles.syncText}>
          {syncing
            ? 'Sincronizando tarefas...'
            : syncError
              ? 'Modo offline (cache local)'
              : `Sincronizado ${lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString('pt-BR') : 'agora'}`}
        </Text>
        <TouchableOpacity onPress={refresh}>
          <Text style={styles.syncAction}>Sincronizar</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.stats}>
          <Text style={styles.statNum}>{counts.doing}</Text>
          <Text style={styles.statLabel}>em progresso</Text>
          <Text style={[styles.statNum, { marginLeft: 12 }]}>{counts.done}</Text>
          <Text style={styles.statLabel}>concluídas</Text>
        </View>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {([
            { key: 'all', label: `Todas (${counts.total})` },
            { key: 'todo', label: `A Fazer (${counts.todo})` },
            { key: 'doing', label: `Fazendo (${counts.doing})` },
            { key: 'done', label: `Feitas (${counts.done})` },
          ] as { key: TaskStatus | 'all'; label: string }[]).map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Lista de tarefas */}
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚡</Text>
          <Text style={styles.emptyText}>Nenhuma tarefa aqui</Text>
          <TouchableOpacity onPress={() => setShowForm(true)} style={styles.emptyAddBtn}>
            <Text style={styles.emptyAddBtnText}>+ Criar tarefa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filtered.map((task, i) => (
          <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={() => handleDeleteTask(task)} index={i} />
        ))
      )}

      {undoTask && (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>Tarefa apagada.</Text>
          <TouchableOpacity
            onPress={() => {
              restoreTask(undoTask);
              setUndoTask(null);
            }}
          >
            <Text style={styles.undoAction}>Desfazer</Text>
          </TouchableOpacity>
        </View>
      )}

      <NewTaskForm visible={showForm} onClose={() => setShowForm(false)} onCreate={createTask} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  syncBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B1220', borderWidth: 1, borderColor: '#1F2937', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  syncText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  syncAction: { color: '#60A5FA', fontSize: 11, fontWeight: '800' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  addBtn: { backgroundColor: '#D97706', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  filterRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' },
  filterChipActive: { backgroundColor: '#1A1200', borderColor: '#D97706' },
  filterText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  filterTextActive: { color: '#FCD34D', fontWeight: '700' },
  taskCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#1F2937' },
  taskCardDone: { opacity: 0.6 },
  taskCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  taskTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#F9FAFB', lineHeight: 20 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#6B7280' },
  taskDesc: { fontSize: 12, color: '#6B7280', marginLeft: 16 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 16 },
  taskXP: { fontSize: 11, fontWeight: '800' },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moveBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  moveBtnText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 12, color: '#4B5563' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 14, color: '#6B7280' },
  emptyAddBtn: { marginTop: 8, backgroundColor: '#D97706', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  emptyAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  undoBar: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2A3A58', backgroundColor: '#0F172A' },
  undoText: { fontSize: 12, color: '#CBD5E1', fontWeight: '600' },
  undoAction: { fontSize: 12, color: '#60A5FA', fontWeight: '800' },
  // Kanban
  column: { gap: 8 },
  columnHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottomWidth: 2 },
  columnIcon: { fontSize: 16 },
  columnTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: '#F9FAFB', textTransform: 'uppercase', letterSpacing: 0.5 },
  countBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  countText: { fontSize: 11, fontWeight: '800' },
  emptyCol: { paddingVertical: 16, alignItems: 'center' },
  emptyColText: { fontSize: 12, color: '#4B5563' },
  // Form
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  form: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: '#1F2937' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontSize: 18, fontWeight: '900', color: '#F9FAFB' },
  closeBtn: { fontSize: 18, color: '#6B7280', padding: 4 },
  input: { backgroundColor: '#0F172A', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 14, paddingVertical: 12, color: '#F9FAFB', fontSize: 15 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priorityChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: '#1F2937' },
  priorityChipText: { fontSize: 12, fontWeight: '700' },
  formFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpHint: { fontSize: 12, color: '#D97706', fontWeight: '700' },
  createBtn: { backgroundColor: '#D97706', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
