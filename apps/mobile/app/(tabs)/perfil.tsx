/**
 * Perfil — identidade, XP, conquistas e configurações
 * Dados reais via hooks + Store global
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  Switch, ScrollView, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { ProgressRing } from '../../src/atoms/ProgressRing';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { OrchestratorSetup } from '../../src/organisms/OrchestratorSetup';
import { XPBar, AchievementsPanel } from '../../src/organisms/AchievementsPanel';
import { WeeklyReview } from '../../src/organisms/WeeklyReview';
import { useProfile, useSettings } from '../../src/store';
import { useHabits } from '../../src/hooks/useHabits';
import { useGoals } from '../../src/hooks/useGoals';
import { useWeeklyReview } from '../../src/hooks/useWeeklyReview';
import { useXP } from '../../src/hooks/useXP';

const AGENT = {
  name: 'Marco',
  fullName: 'Marco Aurélio',
  emoji: '👑',
  color: '#B45309',
  domain: 'Identidade & Valores',
};

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { profile, setProfile } = useProfile();
  const { settings, setNotifPref } = useSettings();
  const { xpData, achievements } = useXP();
  const { shouldShow: showReview, openManually, saveReview, dismiss } = useWeeklyReview();

  const [showOrch, setShowOrch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);

  const habits = useHabits();
  const goals = useGoals();

  const habitsArr = (habits as any).habits ?? [];
  const goalsArr = (goals as any).goals ?? [];
  const activeGoals = goalsArr.filter((g: any) => g.status === 'active');
  const maxStreak = habitsArr.reduce((max: number, h: any) => Math.max(max, h.streak ?? 0), 0);
  const completedGoals = goalsArr.filter((g: any) => g.status === 'completed').length;
  const unlockedAch = achievements.filter(a => a.unlocked).length;

  // Áreas de vida calculadas a partir dos dados reais
  const habitScore = habitsArr.length > 0
    ? Math.round((habitsArr.filter((h: any) => h.completedToday).length / habitsArr.length) * 100)
    : 50;
  const goalScore = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((s: number, g: any) => s + (g.progress ?? 0), 0) / activeGoals.length)
    : 50;

  const LIFE_AREAS = [
    { label: 'Hábitos', progress: habitScore, icon: '🔥' },
    { label: 'Metas', progress: goalScore, icon: '🎯' },
    { label: 'Finanças', progress: 55, icon: '💰' },
    { label: 'Fitness', progress: 70, icon: '💪' },
    { label: 'Aprendizado', progress: Math.min(xpData.level * 10, 100), icon: '📚' },
    { label: 'Conquistas', progress: Math.round((unlockedAch / Math.max(achievements.length, 1)) * 100), icon: '🏆' },
  ];

  return (
    <FullScrollLayout
      title="Perfil"
      subtitle="Sua identidade em evolução"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...AGENT} compact onPress={() => {}} />}
    >
      {/* Avatar + nome */}
      <Animated.View entering={FadeInDown.delay(0)} style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{profile.name[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={styles.avatarInfo}>
          {editName ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                onBlur={() => { setProfile({ name: nameInput }); setEditName(false); }}
                maxLength={30}
              />
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setNameInput(profile.name); setEditName(true); }}>
              <Text style={styles.avatarName}>{profile.name} ✏️</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.avatarOrch}>Orquestrador: {profile.orchestratorName}</Text>
          <Text style={styles.avatarLevel}>Nível {xpData.level} · {unlockedAch} conquistas</Text>
        </View>
      </Animated.View>

      {/* XP Bar */}
      <Animated.View entering={FadeInDown.delay(60)}>
        <XPBar />
      </Animated.View>

      {/* Stats rápidas */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.statsRow}>
        {[
          { val: maxStreak, label: 'Maior streak', icon: '🔥' },
          { val: completedGoals, label: 'Metas completas', icon: '🏆' },
          { val: activeGoals.length, label: 'Metas ativas', icon: '🎯' },
          { val: habitsArr.length, label: 'Hábitos', icon: '⚡' },
        ].map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statVal}>{stat.val}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Áreas de vida */}
      <Animated.View entering={FadeInDown.delay(140)} style={styles.areasCard}>
        <Text style={styles.sectionTitle}>Áreas de Vida</Text>
        {LIFE_AREAS.map((area, i) => (
          <View key={i} style={styles.areaRow}>
            <Text style={styles.areaIcon}>{area.icon}</Text>
            <View style={styles.areaBarWrap}>
              <Text style={styles.areaLabel}>{area.label}</Text>
              <View style={styles.areaTrack}>
                <Animated.View style={[styles.areaFill, { width: `${area.progress}%` }]} />
              </View>
            </View>
            <Text style={styles.areaPct}>{area.progress}%</Text>
          </View>
        ))}
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInDown.delay(180)} style={styles.actionsGrid}>
        <TouchableOpacity onPress={openManually} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionLabel}>Review Semanal</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/vision' as any)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🌌</Text>
          <Text style={styles.actionLabel}>Vision Board</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowOrch(true)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🤖</Text>
          <Text style={styles.actionLabel}>Orquestrador</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionLabel}>Configurações</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Conquistas */}
      <Animated.View entering={FadeInDown.delay(220)}>
        <AchievementsPanel />
      </Animated.View>

      {/* Modals */}
      <Modal visible={showOrch} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowOrch(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Configurar Orquestrador</Text>
            <TouchableOpacity onPress={() => setShowOrch(false)}><Text style={styles.modalClose}>Fechar</Text></TouchableOpacity>
          </View>
          <OrchestratorSetup />
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>⚙️ Configurações</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}><Text style={styles.modalClose}>Fechar</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.settingsScroll} contentContainerStyle={{ padding: 20, gap: 20 }}>
            <Text style={styles.settingsSection}>Notificações</Text>
            {([
              { key: 'daily_digest', label: '📅 Digest Diário', desc: 'Resumo matinal às 8h' },
              { key: 'habit_reminders', label: '🔥 Lembretes de Hábitos', desc: 'Alertas de check-in' },
              { key: 'goal_alerts', label: '🎯 Alertas de Metas', desc: 'Prazo e progresso' },
              { key: 'finance_alerts', label: '💰 Alertas Financeiros', desc: 'Variações no saldo' },
            ] as const).map(notif => (
              <View key={notif.key} style={styles.settingRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.settingLabel}>{notif.label}</Text>
                  <Text style={styles.settingDesc}>{notif.desc}</Text>
                </View>
                <Switch
                  value={settings.notifications[notif.key]}
                  onValueChange={v => setNotifPref(notif.key, v)}
                  trackColor={{ true: '#7C3AED', false: '#1F2937' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
            <View style={styles.settingsDivider} />
            <Text style={styles.settingsSection}>App</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Versão</Text>
              <Text style={styles.settingValue}>1.0.0-beta</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Stack</Text>
              <Text style={styles.settingValue}>Expo 53 + Claude API</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Weekly Review */}
      <WeeklyReview visible={showReview} onClose={dismiss} />
    </FullScrollLayout>
  );
}

const styles = StyleSheet.create({
  avatarCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 28, fontWeight: '900', color: '#fff' },
  avatarInfo: { flex: 1, gap: 3 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, fontSize: 20, fontWeight: '900', color: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#7C3AED' },
  avatarName: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  avatarOrch: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  avatarLevel: { fontSize: 12, color: '#A78BFA', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 10, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: '#1F2937' },
  statIcon: { fontSize: 18 },
  statVal: { fontSize: 20, fontWeight: '900', color: '#F9FAFB' },
  statLabel: { fontSize: 9, color: '#6B7280', fontWeight: '600', textAlign: 'center' },
  areasCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#1F2937' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB', marginBottom: 4 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  areaIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  areaBarWrap: { flex: 1, gap: 3 },
  areaLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  areaTrack: { height: 5, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' },
  areaFill: { height: 5, backgroundColor: '#7C3AED', borderRadius: 3 },
  areaPct: { fontSize: 12, color: '#6B7280', fontWeight: '700', minWidth: 32, textAlign: 'right' },
  actionsGrid: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1F2937' },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '700', textAlign: 'center' },
  modalSafe: { flex: 1, backgroundColor: '#030712' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#111827' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#F9FAFB' },
  modalClose: { fontSize: 15, color: '#7C3AED', fontWeight: '700' },
  settingsScroll: { flex: 1 },
  settingsSection: { fontSize: 12, color: '#6B7280', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#111827', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  settingLabel: { fontSize: 14, color: '#F9FAFB', fontWeight: '700' },
  settingDesc: { fontSize: 12, color: '#6B7280' },
  settingValue: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  settingsDivider: { height: 1, backgroundColor: '#111827' },
});
