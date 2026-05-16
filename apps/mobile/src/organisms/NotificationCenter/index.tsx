/**
 * NotificationCenter — central de notificações inteligentes
 * Exibe histórico de smart nudges com read/unread, prioridade e agente
 * Pode ser aberto via ícone de sino no header de qualquer tela
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInRight, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSmartNotifications, SmartNotification } from '../../hooks/useSmartNotifications';

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#DC2626',
  high: '#D97706',
  medium: '#0891B2',
  low: '#059669',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Info',
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

interface NotificationCardProps {
  notif: SmartNotification;
  onRead: (id: string) => void;
  index: number;
}

function NotificationCard({ notif, onRead, index }: NotificationCardProps) {
  const priorityColor = PRIORITY_COLOR[notif.priority] ?? '#6B7280';
  return (
    <Animated.View entering={FadeInRight.delay(index * 60)} style={[styles.card, { borderLeftColor: priorityColor, opacity: notif.read ? 0.6 : 1 }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardAgent}>{notif.agentEmoji} {notif.agent}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '22', borderColor: priorityColor }]}>
          <Text style={[styles.priorityText, { color: priorityColor }]}>{PRIORITY_LABEL[notif.priority]}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{notif.title}</Text>
      <Text style={styles.cardBody}>{notif.body}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardTime}>{timeAgo(notif.receivedAt)}</Text>
        {!notif.read && (
          <TouchableOpacity onPress={() => onRead(notif.id)} style={styles.readBtn}>
            <Text style={styles.readBtnText}>Marcar como lida</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ── Componente do ícone de sino (para usar em headers) ────────────────────
interface BellIconProps {
  unreadCount: number;
  onPress: () => void;
  color?: string;
}

export function NotificationBell({ unreadCount, onPress, color = '#F9FAFB' }: BellIconProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.bell} hitSlop={8}>
      <Text style={[styles.bellIcon, { color }]}>🔔</Text>
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Modal principal ────────────────────────────────────────────────────────
interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    evaluating,
    evaluate,
    markRead,
    markAllRead,
    clearHistory,
    PRIORITY_LABEL,
  } = useSmartNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeIn.duration(100)} style={styles.overlay}>
        <Animated.View
          entering={SlideInDown.springify().damping(24).stiffness(220).mass(0.9)}
          exiting={SlideOutDown.springify().damping(24).stiffness(220).mass(0.9)}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>🔔 Notificações</Text>
              {unreadCount > 0 && (
                <Text style={styles.headerSub}>{unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}</Text>
              )}
            </View>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Ler todas</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filtros */}
          <View style={styles.filterRow}>
            {(['all', 'unread'] as const).map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'Todas' : `Não lidas (${unreadCount})`}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Atualizar */}
            <TouchableOpacity onPress={evaluate} style={styles.refreshBtn} disabled={evaluating}>
              {evaluating
                ? <ActivityIndicator size={12} color="#7C3AED" />
                : <Text style={styles.refreshText}>↻ Verificar</Text>}
            </TouchableOpacity>
          </View>

          {/* Lista */}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.list}>
            {filtered.length === 0 ? (
              <Animated.View entering={FadeIn} style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>✨</Text>
                <Text style={styles.emptyTitle}>Tudo em ordem</Text>
                <Text style={styles.emptySub}>
                  {filter === 'unread'
                    ? 'Sem notificações não lidas'
                    : 'Os agentes estão monitorando seu progresso'}
                </Text>
              </Animated.View>
            ) : (
              filtered.map((n, i) => (
                <NotificationCard key={n.id + n.receivedAt} notif={n} onRead={markRead} index={i} />
              ))
            )}
          </ScrollView>

          {/* Limpar histórico */}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Limpar histórico</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0B1120',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#374151', alignSelf: 'center', marginBottom: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  headerSub: { fontSize: 12, color: '#7C3AED', fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: {
    backgroundColor: '#1F2937', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  actionBtnText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#9CA3AF', fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 99, backgroundColor: '#1F2937',
    borderWidth: 1, borderColor: '#374151',
  },
  filterChipActive: { backgroundColor: '#2D1B6E', borderColor: '#7C3AED' },
  filterText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  filterTextActive: { color: '#A78BFA' },
  refreshBtn: {
    marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, backgroundColor: '#111827',
    borderWidth: 1, borderColor: '#374151',
    minWidth: 28, alignItems: 'center',
  },
  refreshText: { fontSize: 11, color: '#7C3AED', fontWeight: '700' },
  scroll: { maxHeight: 480 },
  list: { gap: 10, paddingBottom: 8 },
  card: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardAgent: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  priorityBadge: {
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1,
  },
  priorityText: { fontSize: 10, fontWeight: '700' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB', lineHeight: 20 },
  cardBody: { fontSize: 13, color: '#9CA3AF', lineHeight: 19 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardTime: { fontSize: 11, color: '#4B5563' },
  readBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#1F2937' },
  readBtnText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#F9FAFB' },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', maxWidth: 260 },
  clearBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  clearBtnText: { fontSize: 12, color: '#4B5563' },
  bell: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 20 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#DC2626', borderRadius: 99,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#FFF', fontWeight: '900' },
});
