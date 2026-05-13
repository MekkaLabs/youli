/**
 * Perfil — tela de identidade do usuário
 * Inclui: avatar, progresso de vida, e configuração do orquestrador (Jarvis Mode)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { ProgressRing } from '../../src/atoms/ProgressRing';
import { Badge } from '../../src/atoms/Badge';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { OrchestratorSetup } from '../../src/organisms/OrchestratorSetup';
import { tokens } from '../../src/theme/tokens';

const AGENT = {
  name: 'Marco',
  fullName: 'Marco Aurélio',
  emoji: '👑',
  color: '#B45309',
  domain: 'Identidade & Valores',
};

const STORAGE_KEY = '@youli:orchestrator';

const LIFE_AREAS = [
  { label: 'Produtividade', progress: 72 },
  { label: 'Saúde', progress: 85 },
  { label: 'Finanças', progress: 55 },
  { label: 'Relacionamentos', progress: 68 },
  { label: 'Aprendizado', progress: 80 },
  { label: 'Propósito', progress: 90 },
];

const OBJECTIVES = [
  'Lançar produto SaaS em 6 meses',
  'Hábitos consistentes de saúde',
  'Liberdade financeira',
];

const BEHAVIOR_PATTERNS = [
  { label: 'Madrugador', value: true },
  { label: 'Visual & Espacial', value: true },
  { label: 'Autônomo', value: true },
  { label: 'Alto foco', value: false },
];

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const [showOrchestratorSetup, setShowOrchestratorSetup] = useState(false);
  const [orchestratorName, setOrchestratorName] = useState('Youli');
  const [orchestratorEmoji, setOrchestratorEmoji] = useState('🤖');

  // Carrega config salva
  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) {
        const { name, emoji } = JSON.parse(v);
        setOrchestratorName(name);
        setOrchestratorEmoji(emoji);
      }
    });
  }, []);

  const handleSaveOrchestrator = useCallback((name: string, emoji: string) => {
    setOrchestratorName(name);
    setOrchestratorEmoji(emoji);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ name, emoji }));
    setShowOrchestratorSetup(false);
  }, []);

  return (
    <>
      <FullScrollLayout
        title="Perfil"
        subtitle="Sua identidade e evolução"
        paddingBottom={insets.bottom + 90}
      >
        {/* Agente da área */}
        <AgentBadge
          name={AGENT.name}
          fullName={AGENT.fullName}
          emoji={AGENT.emoji}
          color={AGENT.color}
          domain={AGENT.domain}
          onPress={() => {}}
        />

        {/* Avatar + nome */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>G</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.userName}>Gustavo</Text>
            <Badge variant="green" label="Em evolução" />
          </View>
        </Animated.View>

        {/* Orquestrador — Card do Jarvis */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <TouchableOpacity
            style={styles.orchestratorCard}
            onPress={() => setShowOrchestratorSetup(true)}
            activeOpacity={0.85}
          >
            <View style={styles.orchestratorLeft}>
              <Text style={styles.orchestratorEmoji}>{orchestratorEmoji}</Text>
              <View>
                <Text style={styles.orchestratorName}>{orchestratorName}</Text>
                <Text style={styles.orchestratorSub}>Seu assistente pessoal</Text>
              </View>
            </View>
            <View style={styles.orchestratorRight}>
              <Text style={styles.orchestratorAgents}>10 agentes</Text>
              <Text style={styles.orchestratorEdit}>Configurar →</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Anéis de progresso */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.ringsSection}>
          <Text style={styles.sectionLabel}>Equilíbrio de vida</Text>
          <View style={styles.ringsRow}>
            <View style={styles.ringItem}>
              <ProgressRing progress={78} size={64} color={tokens.colors.primary} />
              <Text style={styles.ringLabel}>Geral</Text>
            </View>
            <View style={styles.ringItem}>
              <ProgressRing progress={85} size={64} color={tokens.colors.success} />
              <Text style={styles.ringLabel}>Saúde</Text>
            </View>
            <View style={styles.ringItem}>
              <ProgressRing progress={65} size={64} color={tokens.colors.accent} />
              <Text style={styles.ringLabel}>Finanças</Text>
            </View>
          </View>
        </Animated.View>

        {/* Áreas de vida */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.areasSection}>
          <Text style={styles.sectionLabel}>Áreas de vida</Text>
          {LIFE_AREAS.map((area, i) => (
            <View key={area.label} style={styles.areaRow}>
              <Text style={styles.areaLabel}>{area.label}</Text>
              <View style={styles.areaBarBg}>
                <View
                  style={[
                    styles.areaBarFill,
                    {
                      width: `${area.progress}%` as any,
                      backgroundColor:
                        area.progress >= 80
                          ? tokens.colors.success
                          : area.progress >= 60
                          ? tokens.colors.accent
                          : tokens.colors.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.areaPercent}>{area.progress}%</Text>
            </View>
          ))}
        </Animated.View>

        {/* Objetivos */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <Text style={styles.sectionLabel}>Objetivos de vida</Text>
          {OBJECTIVES.map((obj, i) => (
            <View key={i} style={styles.objectiveRow}>
              <Text style={styles.objectiveDot}>◆</Text>
              <Text style={styles.objectiveText}>{obj}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Padrões comportamentais */}
        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.section}>
          <Text style={styles.sectionLabel}>Padrões comportamentais</Text>
          <View style={styles.patternsRow}>
            {BEHAVIOR_PATTERNS.map((p) => (
              <Badge
                key={p.label}
                label={p.label}
                variant={p.value ? 'green' : 'gray'}
              />
            ))}
          </View>
        </Animated.View>
      </FullScrollLayout>

      {/* Modal: OrchestratorSetup */}
      <Modal
        visible={showOrchestratorSetup}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrchestratorSetup(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Configurar Assistente</Text>
            <TouchableOpacity
              onPress={() => setShowOrchestratorSetup(false)}
              hitSlop={12}
            >
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <OrchestratorSetup
            currentName={orchestratorName}
            currentEmoji={orchestratorEmoji}
            onSave={handleSaveOrchestrator}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: tokens.fontWeight.bold,
    color: '#FFF',
  },
  avatarInfo: {
    gap: tokens.spacing.xs,
  },
  userName: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  orchestratorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radii.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  orchestratorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  orchestratorEmoji: { fontSize: 32 },
  orchestratorName: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: '#FFF',
  },
  orchestratorSub: {
    fontSize: tokens.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  orchestratorRight: {
    alignItems: 'flex-end',
  },
  orchestratorAgents: {
    fontSize: tokens.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  orchestratorEdit: {
    fontSize: tokens.fontSize.sm,
    color: '#FFF',
    fontWeight: tokens.fontWeight.semibold,
  },
  ringsSection: {
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  sectionLabel: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ringsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.lg,
  },
  ringItem: {
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  ringLabel: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
  },
  areasSection: {
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  areaLabel: {
    width: 110,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
  },
  areaBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: tokens.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  areaBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  areaPercent: {
    width: 36,
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    textAlign: 'right',
  },
  section: {
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
  },
  objectiveDot: {
    fontSize: 10,
    color: tokens.colors.primary,
    marginTop: 3,
  },
  objectiveText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text,
    flex: 1,
  },
  patternsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  modalTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  modalClose: {
    fontSize: 18,
    color: tokens.colors.textSecondary,
    padding: tokens.spacing.xs,
  },
});
