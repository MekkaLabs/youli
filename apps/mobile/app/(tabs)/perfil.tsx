/**
 * Perfil — identidade, XP, conquistas e configurações
 * Dados reais via hooks + Store global
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  Switch, ScrollView, TextInput,
} from 'react-native';
import { useI18n, SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '../../src/hooks/useI18n';
import { useTheme } from '../../src/providers/ThemeProvider';
import { router } from 'expo-router';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { ProgressRing } from '../../src/atoms/ProgressRing';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { useAgentAction } from '../../src/hooks/useAgentAction';
import { OrchestratorSetup } from '../../src/organisms/OrchestratorSetup';
import { XPBar, AchievementsPanel } from '../../src/organisms/AchievementsPanel';
import { WeeklyReview } from '../../src/organisms/WeeklyReview';
import { useProfile, useSettings } from '../../src/store';
import { useHabits } from '../../src/hooks/useHabits';
import { useGoals } from '../../src/hooks/useGoals';
import { useWeeklyReview } from '../../src/hooks/useWeeklyReview';
import { useXP } from '../../src/hooks/useXP';
import { useSWECI } from '../../src/hooks/useSWECI';
import { useAuthContext } from '../../src/hooks/useAuth';
import type { PersonaId } from '../../src/store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

const AGENT = {
  name: 'Marco',
  fullName: 'Marco Aurélio',
  emoji: '👑',
  color: '#B45309',
  domain: 'Identidade & Valores',
};

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const onAgentPress = useAgentAction('perfil', AGENT.name);
  const { profile, setProfile, setHumanDesign, setPersona } = useProfile();
  const { settings, setNotifPref } = useSettings();
  const { xpData, achievements } = useXP();
  const { shouldShow: showReview, openManually, saveReview, dismiss } = useWeeklyReview();
  const { language, setLanguage } = useI18n();
  const { isDark, toggleTheme, mode } = useTheme();

  const [showOrch, setShowOrch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);

  async function runCIPipeline() {
    setRunningPipeline(true);
    setPipelineResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/copilot/weekly-pipeline`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: user?.id ?? 'default', context: {} }),
      });
      if (res.ok) {
        const data = await res.json();
        setPipelineResult(`✅ Pipeline concluído — Life Health: ${data.lifeHealthScore}/100 | ANC: ${data.ancScore}/100`);
      } else {
        setPipelineResult('❌ Erro ao rodar o pipeline');
      }
    } catch {
      setPipelineResult('❌ Sem conexão com a API');
    } finally {
      setRunningPipeline(false);
    }
  }
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [hdBirthDate, setHdBirthDate] = useState(profile.humanDesign.birthData?.date || '');
  const [hdBirthTime, setHdBirthTime] = useState(profile.humanDesign.birthData?.time || '');
  const [hdBirthLocation, setHdBirthLocation] = useState(profile.humanDesign.birthData?.location || '');

  const PERSONA_LABELS: Record<PersonaId, string> = {
    leonardo: 'Leonardo',
    franklin: 'Franklin',
    aristoteles: 'Aristóteles',
    alexandre: 'Alexandre',
    adam: 'Adam',
    hipocrates: 'Hipócrates',
    newton: 'Newton',
    socrates: 'Sócrates',
    tesla: 'Tesla',
    marco: 'Marco'
  };

  const AREA_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    tarefas: 'Tarefas',
    habitos: 'Hábitos',
    metas: 'Metas',
    financeiro: 'Financeiro',
    fitness: 'Fitness',
    calendario: 'Calendário',
    insights: 'Insights',
    foco: 'Foco',
    perfil: 'Perfil',
  };

  async function patchHumanDesign(payload: Record<string, unknown>) {
    setHumanDesign(payload as Partial<typeof profile.humanDesign>);
    const res = await fetch(`${API_BASE}/api/settings/human-design`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (res?.ok) {
      const latest = await res.json().catch(() => null);
      if (latest && typeof latest === 'object') {
        setHumanDesign(latest as Partial<typeof profile.humanDesign>);
      }
    }
  }

  async function patchPersona(payload: { personaId: PersonaId; enabled?: boolean; humanDesignEnabled?: boolean }) {
    setPersona(payload);
    await fetch(`${API_BASE}/api/settings/personas`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);
  }

  async function saveBirthData() {
    await patchHumanDesign({
      birthData: {
        date: hdBirthDate.trim(),
        time: hdBirthTime.trim(),
        location: hdBirthLocation.trim()
      }
    });
  }

  useEffect(() => {
    if (!showSettings) return;
    fetch(`${API_BASE}/api/settings/human-design`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json) return;
        setHumanDesign(json as Partial<typeof profile.humanDesign>);
        const birth = (json as { birthData?: { date?: string; time?: string; location?: string } }).birthData;
        if (birth) {
          setHdBirthDate(birth.date || '');
          setHdBirthTime(birth.time || '');
          setHdBirthLocation(birth.location || '');
        }
      })
      .catch(() => null);

    fetch(`${API_BASE}/api/settings/personas`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const personas = (json as { personas?: { personaId: PersonaId; enabled?: boolean; humanDesignEnabled?: boolean }[] } | null)?.personas;
        if (!personas) return;
        personas.forEach((persona) => {
          setPersona({
            personaId: persona.personaId,
            enabled: persona.enabled,
            humanDesignEnabled: persona.humanDesignEnabled
          });
        });
      })
      .catch(() => null);
  }, [showSettings, setHumanDesign, setPersona]);

  const habits = useHabits();
  const goals = useGoals();
  const { getAreaGap, lifeHealthScore } = useSWECI();
  const { isAdmin, logout, user } = useAuthContext();

  type HabitItem = (typeof habits)['habits'][number] & { completedToday?: boolean };
  type GoalItem = (typeof goals)['goals'][number];

  const habitsArr: HabitItem[] = (habits.habits ?? []) as HabitItem[];
  const goalsArr: GoalItem[] = goals.goals ?? [];
  const activeGoals = goalsArr.filter((g) => g.status === 'active');
  const maxStreak = habitsArr.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);
  const completedGoals = goalsArr.filter((g) => g.status === 'completed').length;
  const unlockedAch = achievements.filter(a => a.unlocked).length;

  // progresso de uma meta = currentValue / targetValue (0-100)
  const goalProgress = (g: GoalItem) =>
    Math.round(((g.currentValue ?? 0) / (g.targetValue || 1)) * 100);

  // Áreas de vida calculadas a partir dos dados reais
  const habitScore = habitsArr.length > 0
    ? Math.round((habitsArr.filter((h) => h.completedToday).length / habitsArr.length) * 100)
    : 50;
  const goalScore = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((s, g) => s + goalProgress(g), 0) / activeGoals.length)
    : 50;

  // Scores derivados do SWE-CI: gap → score inverso (sem gap = 80+, com gap crítico = 40)
  function gapToScore(area: string, fallback: number): number {
    const gap = getAreaGap(area);
    if (!gap) return lifeHealthScore > 0 ? Math.min(fallback + 10, 95) : fallback;
    return Math.max(20, Math.round(100 - gap.gapMagnitude * 100));
  }

  const LIFE_AREAS = [
    { label: 'Hábitos', progress: habitScore, icon: '🔥' },
    { label: 'Metas', progress: goalScore, icon: '🎯' },
    { label: 'Finanças', progress: gapToScore('financeiro', 55), icon: '💰' },
    { label: 'Fitness', progress: gapToScore('fitness', 70), icon: '💪' },
    { label: 'Aprendizado', progress: Math.min(xpData.level * 10, 100), icon: '📚' },
    { label: 'Conquistas', progress: Math.round((unlockedAch / Math.max(achievements.length, 1)) * 100), icon: '🏆' },
  ];

  return (
    <FullScrollLayout
      title="Perfil"
      subtitle="Sua identidade em evolução"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...AGENT} compact onPress={onAgentPress} />}
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

      {/* Administração do Sistema — área separada, visível só para admin.
          Não faz parte das ações pessoais (idioma, tema, etc.) — é função de operador. */}
      {isAdmin && (
        <Animated.View entering={FadeInDown.delay(40)}>
          <TouchableOpacity
            style={styles.adminCard}
            onPress={() => router.push('/admin' as any)}
            accessibilityRole="button"
            accessibilityLabel="Abrir Administração do Sistema"
          >
            <View style={styles.adminIconWrap}>
              <Text style={styles.adminIcon}>👑</Text>
            </View>
            <View style={styles.adminInfo}>
              <Text style={styles.adminTitle}>Administração do Sistema</Text>
              <Text style={styles.adminSub}>Gerenciar usuários e permissões</Text>
            </View>
            <Text style={styles.adminChevron}>›</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

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
        <TouchableOpacity onPress={runCIPipeline} style={[styles.actionBtn, runningPipeline && { opacity: 0.6 }]} disabled={runningPipeline}>
          <Text style={styles.actionIcon}>{runningPipeline ? '⏳' : '🔄'}</Text>
          <Text style={styles.actionLabel}>CI Semanal</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/life-score' as any)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionLabel}>Life Score</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/sweci-settings' as any)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🛠️</Text>
          <Text style={styles.actionLabel}>SWE-CI</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/evolution-history' as any)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>📈</Text>
          <Text style={styles.actionLabel}>Evolução</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/integrations' as any)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🔗</Text>
          <Text style={styles.actionLabel}>Integrações</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowLanguagePicker(true)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🌍</Text>
          <Text style={styles.actionLabel}>Idioma</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/accessibility-settings' as any)} style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel="Configurações de acessibilidade"
        >
          <Text style={styles.actionIcon}>♿</Text>
          <Text style={styles.actionLabel}>Acesso</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleTheme}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          <Text style={styles.actionIcon}>{isDark ? '☀️' : '🌙'}</Text>
          <Text style={styles.actionLabel}>{isDark ? 'Claro' : 'Escuro'}</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          onPress={async () => { await logout(); router.replace('/login' as any); }}
          style={[styles.actionBtn, { borderColor: '#F87171', borderWidth: 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
        >
          <Text style={styles.actionIcon}>🚪</Text>
          <Text style={[styles.actionLabel, { color: '#F87171' }]}>Sair</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Pipeline Result */}
      {pipelineResult && (
        <Animated.View entering={FadeInDown} style={styles.pipelineResult}>
          <Text style={styles.pipelineResultText}>{pipelineResult}</Text>
        </Animated.View>
      )}

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
              <Text style={styles.settingValue}>Expo 54 + Claude API</Text>
            </View>

            <View style={styles.settingsDivider} />
            <Text style={styles.settingsSection}>Configurações Avançadas</Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.settingLabel}>Human Design Global</Text>
                <Text style={styles.settingDesc}>Ativa personalização assistiva por HD</Text>
              </View>
              <Switch
                value={profile.humanDesign.enabled}
                onValueChange={(v) => patchHumanDesign({ enabled: v })}
                trackColor={{ true: '#7C3AED', false: '#1F2937' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.settingLabel}>Consentimento HD</Text>
                <Text style={styles.settingDesc}>Necessário para uso de dados de nascimento</Text>
              </View>
              <Switch
                value={profile.humanDesign.consentAccepted}
                onValueChange={(v) => patchHumanDesign({ consentAccepted: v })}
                trackColor={{ true: '#7C3AED', false: '#1F2937' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.settingLabel}>Modo Assistivo HD</Text>
                <Text style={styles.settingDesc}>Somente sugestões, sem inferências absolutas</Text>
              </View>
              <Switch
                value={profile.humanDesign.mode === 'assistive'}
                onValueChange={(v) => patchHumanDesign({ mode: v ? 'assistive' : 'off' })}
                trackColor={{ true: '#7C3AED', false: '#1F2937' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.hdFormCard}>
              <Text style={styles.settingLabel}>Dados de Nascimento</Text>
              <TextInput
                style={styles.hdInput}
                value={hdBirthDate}
                onChangeText={setHdBirthDate}
                placeholder="Data (AAAA-MM-DD)"
                placeholderTextColor="#6B7280"
              />
              <TextInput
                style={styles.hdInput}
                value={hdBirthTime}
                onChangeText={setHdBirthTime}
                placeholder="Hora (HH:MM)"
                placeholderTextColor="#6B7280"
              />
              <TextInput
                style={styles.hdInput}
                value={hdBirthLocation}
                onChangeText={setHdBirthLocation}
                placeholder="Local de nascimento"
                placeholderTextColor="#6B7280"
              />
              <TouchableOpacity style={styles.hdSaveBtn} onPress={saveBirthData}>
                <Text style={styles.hdSaveBtnText}>Salvar dados HD</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.settingsSection}>Personas (Área Fixa)</Text>
            {profile.aiPersonalization.personas.map((persona) => (
              <View key={persona.personaId} style={styles.personaCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{PERSONA_LABELS[persona.personaId]} · {AREA_LABELS[persona.area]}</Text>
                </View>
                <View style={styles.personaSwitchCol}>
                  <Text style={styles.personaSwitchLabel}>Ativo</Text>
                  <Switch
                    value={persona.enabled}
                    onValueChange={(v) => patchPersona({ personaId: persona.personaId, enabled: v })}
                    trackColor={{ true: '#16A34A', false: '#1F2937' }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.personaSwitchCol}>
                  <Text style={styles.personaSwitchLabel}>HD</Text>
                  <Switch
                    value={persona.humanDesignEnabled}
                    onValueChange={(v) => patchPersona({ personaId: persona.personaId, humanDesignEnabled: v })}
                    trackColor={{ true: '#7C3AED', false: '#1F2937' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Weekly Review */}
      <WeeklyReview visible={showReview} onClose={dismiss} />

      {/* Language Picker Modal */}
      <Modal visible={showLanguagePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLanguagePicker(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🌍 Idioma / Language</Text>
            <TouchableOpacity onPress={() => setShowLanguagePicker(false)}><Text style={styles.modalClose}>Fechar</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 10 }}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const selected = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langOption, selected && styles.langOptionSelected]}
                  onPress={async () => { await setLanguage(lang); setShowLanguagePicker(false); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={styles.langEmoji}>
                    {lang === 'pt-BR' ? '🇧🇷' : lang === 'en' ? '🇺🇸' : lang === 'es' ? '🇪🇸' : '🇨🇳'}
                  </Text>
                  <Text style={[styles.langLabel, selected && styles.langLabelSelected]}>
                    {LANGUAGE_LABELS[lang]}
                  </Text>
                  {selected && <Text style={styles.langCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </Modal>
    </FullScrollLayout>
  );
}

const styles = StyleSheet.create({
  adminCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A0A3A', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#7C3AED',
  },
  adminIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#3B0764',
    alignItems: 'center', justifyContent: 'center',
  },
  adminIcon: { fontSize: 22 },
  adminInfo: { flex: 1, gap: 2 },
  adminTitle: { fontSize: 15, fontWeight: '800', color: '#EDE9FE' },
  adminSub: { fontSize: 12, color: '#A78BFA', fontWeight: '600' },
  adminChevron: { fontSize: 28, color: '#7C3AED', fontWeight: '300' },
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
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { width: '30%', flexGrow: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1F2937' },
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
  hdFormCard: { backgroundColor: '#111827', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1F2937', gap: 8 },
  hdInput: { backgroundColor: '#0B1220', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 10, paddingVertical: 8, color: '#F9FAFB', fontSize: 13 },
  hdSaveBtn: { marginTop: 4, backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  hdSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  personaCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#111827', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1F2937' },
  personaSwitchCol: { alignItems: 'center', gap: 4 },
  personaSwitchLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  pipelineResult: {
    backgroundColor: '#0D1A0D', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#065F46',
  },
  pipelineResultText: { fontSize: 13, color: '#D1FAE5', fontWeight: '600', textAlign: 'center' },
  langOption: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#111827', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  langOptionSelected: { borderColor: '#7C3AED', backgroundColor: '#1A0A3A' },
  langEmoji: { fontSize: 26 },
  langLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  langLabelSelected: { color: '#F9FAFB' },
  langCheck: { fontSize: 18, color: '#7C3AED', fontWeight: '900' },
});
