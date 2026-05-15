/**
 * AchievementsPanel — galeria de conquistas + XP bar
 * Usado na tela de Perfil
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useXP } from '../../hooks/useXP';

const CATEGORY_LABELS = {
  habits: '🔥 Hábitos',
  goals: '🎯 Metas',
  finance: '💰 Finanças',
  fitness: '💪 Fitness',
  streak: '⚡ Streaks',
  social: '🦉 Consciência',
};

export function XPBar({ compact = false }: { compact?: boolean }) {
  const { xpData, levelProgress } = useXP();

  if (compact) {
    return (
      <View style={styles.xpBarCompact}>
        <View style={styles.xpBarLeft}>
          <Text style={styles.xpLevelCompact}>Nv {xpData.level}</Text>
          <Text style={styles.xpTotalCompact}>{xpData.total} XP</Text>
        </View>
        <View style={styles.xpTrackCompact}>
          <View style={[styles.xpFillCompact, { width: `${Math.round(levelProgress * 100)}%` }]} />
        </View>
        <Text style={styles.xpNextCompact}>{xpData.nextLevelXP - xpData.currentLevelXP} para Nv {xpData.level + 1}</Text>
      </View>
    );
  }

  return (
    <View style={styles.xpCard}>
      <View style={styles.xpHeader}>
        <View>
          <Text style={styles.xpLevelLabel}>NÍVEL {xpData.level}</Text>
          <Text style={styles.xpTotal}>{xpData.total.toLocaleString()} XP total</Text>
        </View>
        <View style={styles.xpLevelBadge}>
          <Text style={styles.xpLevelBadgeText}>{xpData.level}</Text>
        </View>
      </View>
      <View style={styles.xpTrack}>
        <Animated.View style={[styles.xpFill, { width: `${Math.round(levelProgress * 100)}%` }]} />
      </View>
      <View style={styles.xpTrackLabels}>
        <Text style={styles.xpTrackLab}>{xpData.currentLevelXP} XP</Text>
        <Text style={styles.xpTrackLab}>{xpData.nextLevelXP - xpData.currentLevelXP} XP para nível {xpData.level + 1}</Text>
      </View>
    </View>
  );
}

export function AchievementToast({ achievement, onDismiss }: { achievement: { title: string; description: string; icon: string; xpReward: number } | null; onDismiss: () => void }) {
  if (!achievement) return null;
  return (
    <Modal visible={!!achievement} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.toastOverlay}>
        <Animated.View entering={ZoomIn.springify()} style={styles.toast}>
          <Text style={styles.toastIcon}>{achievement.icon}</Text>
          <View style={styles.toastBody}>
            <Text style={styles.toastTitle}>Conquista desbloqueada!</Text>
            <Text style={styles.toastName}>{achievement.title}</Text>
            <Text style={styles.toastDesc}>{achievement.description}</Text>
            {achievement.xpReward > 0 && (
              <Text style={styles.toastXP}>+{achievement.xpReward} XP</Text>
            )}
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.toastClose}>
            <Text style={styles.toastCloseText}>✓</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function AchievementsPanel() {
  const { achievements } = useXP();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const categories = [...new Set(achievements.map(a => a.category))];
  const filtered = filter === 'all' ? achievements : achievements.filter(a => filter === 'unlocked' ? a.unlocked : !a.unlocked);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>🏆 Conquistas</Text>
        <Text style={styles.panelSub}>{unlockedCount}/{achievements.length} desbloqueadas</Text>
      </View>

      {/* Filtro */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {(['all', 'unlocked', 'locked'] as const).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'Todas' : f === 'unlocked' ? '✓ Desbloqueadas' : '🔒 Bloqueadas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Grid de conquistas */}
      <View style={styles.grid}>
        {filtered.map((ach, i) => (
          <Animated.View
            key={ach.id}
            entering={FadeInDown.delay(i * 30)}
            style={[styles.achCard, !ach.unlocked && styles.achCardLocked]}
          >
            <Text style={[styles.achIcon, !ach.unlocked && styles.achIconLocked]}>{ach.unlocked ? ach.icon : '🔒'}</Text>
            <Text style={[styles.achTitle, !ach.unlocked && styles.achTextLocked]} numberOfLines={1}>{ach.title}</Text>
            <Text style={[styles.achCondition, !ach.unlocked && styles.achTextLocked]} numberOfLines={1}>{ach.condition}</Text>
            {ach.xpReward > 0 && (
              <Text style={[styles.achXP, !ach.unlocked && styles.achTextLocked]}>+{ach.xpReward} XP</Text>
            )}
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // XP Bar compact
  xpBarCompact: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111827', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#1F2937' },
  xpBarLeft: { alignItems: 'center', minWidth: 40 },
  xpLevelCompact: { fontSize: 11, fontWeight: '900', color: '#A78BFA' },
  xpTotalCompact: { fontSize: 10, color: '#6B7280' },
  xpTrackCompact: { flex: 1, height: 6, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' },
  xpFillCompact: { height: 6, backgroundColor: '#7C3AED', borderRadius: 3 },
  xpNextCompact: { fontSize: 10, color: '#6B7280', fontWeight: '600' },

  // XP Bar full
  xpCard: { backgroundColor: '#1E0D3B', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#2D1B69' },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  xpLevelLabel: { fontSize: 11, color: '#A78BFA', fontWeight: '800', letterSpacing: 1 },
  xpTotal: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  xpLevelBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  xpLevelBadgeText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  xpTrack: { height: 8, backgroundColor: '#2D1B69', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, backgroundColor: '#A78BFA', borderRadius: 4 },
  xpTrackLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  xpTrackLab: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  // Toast
  toastOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  toast: { backgroundColor: '#1E0D3B', borderRadius: 20, padding: 20, margin: 24, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#7C3AED' },
  toastIcon: { fontSize: 44 },
  toastBody: { flex: 1, gap: 3 },
  toastTitle: { fontSize: 11, color: '#A78BFA', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  toastName: { fontSize: 18, fontWeight: '900', color: '#F9FAFB' },
  toastDesc: { fontSize: 13, color: '#9CA3AF' },
  toastXP: { fontSize: 14, fontWeight: '900', color: '#A78BFA', marginTop: 4 },
  toastClose: { padding: 8, backgroundColor: '#7C3AED', borderRadius: 10 },
  toastCloseText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // Panel
  panel: { gap: 14 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 16, fontWeight: '900', color: '#F9FAFB' },
  panelSub: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' },
  filterChipActive: { backgroundColor: '#1E0D3B', borderColor: '#7C3AED' },
  filterText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  filterTextActive: { color: '#A78BFA', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achCard: { width: '47%', backgroundColor: '#111827', borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: '#1F2937', alignItems: 'center' },
  achCardLocked: { opacity: 0.45 },
  achIcon: { fontSize: 28 },
  achIconLocked: { fontSize: 22 },
  achTitle: { fontSize: 13, fontWeight: '800', color: '#F9FAFB', textAlign: 'center' },
  achCondition: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  achXP: { fontSize: 11, fontWeight: '800', color: '#A78BFA' },
  achTextLocked: { color: '#4B5563' },
});
