/**
 * OrchestratorSetup
 * Tela de configuração do orquestrador — onde o usuário escolhe o nome
 * do seu "Jarvis" pessoal e vê todos os agentes disponíveis
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';
import { Button } from '../../atoms/Button';

interface OrchestratorPreset {
  name: string;
  emoji: string;
  description: string;
}

interface AgentInfo {
  area: string;
  name: string;
  fullName: string;
  emoji: string;
  color: string;
  domain: string;
  tagline: string;
}

const PRESETS: OrchestratorPreset[] = [
  { name: 'Youli', emoji: '🤖', description: 'Seu assistente pessoal Youli' },
  { name: 'Jarvis', emoji: '⚡', description: 'Assistente de alta performance' },
  { name: 'Atlas', emoji: '🌍', description: 'Visionário de longo prazo' },
  { name: 'Mentor', emoji: '🦅', description: 'Guia sábio e experiente' },
  { name: 'Spark', emoji: '✨', description: 'Motivador energético' },
  { name: 'Nexus', emoji: '🔮', description: 'Conector de padrões' },
  { name: 'Echo', emoji: '🎯', description: 'Foco e clareza absoluta' },
  { name: 'Sage', emoji: '📿', description: 'Sabedoria e equilíbrio' },
];

const AGENTS: AgentInfo[] = [
  { area: 'dashboard', name: 'Leonardo', fullName: 'Leonardo da Vinci', emoji: '🎨', color: '#7C3AED', domain: 'Visão Sistêmica', tagline: 'Tudo está conectado' },
  { area: 'tarefas', name: 'Franklin', fullName: 'Benjamin Franklin', emoji: '⚡', color: '#D97706', domain: 'Produtividade', tagline: 'Execute com precisão' },
  { area: 'habitos', name: 'Aristóteles', fullName: 'Aristóteles de Estagira', emoji: '🏛️', color: '#059669', domain: 'Hábitos & Caráter', tagline: 'Somos o que fazemos' },
  { area: 'metas', name: 'Alexandre', fullName: 'Alexandre, o Grande', emoji: '⚔️', color: '#DC2626', domain: 'Metas Audaciosas', tagline: 'Conquiste o próximo território' },
  { area: 'financeiro', name: 'Adam', fullName: 'Adam Smith', emoji: '💰', color: '#0891B2', domain: 'Finanças Pessoais', tagline: 'Riqueza é uma escolha' },
  { area: 'fitness', name: 'Hipócrates', fullName: 'Hipócrates de Cós', emoji: '🏃', color: '#16A34A', domain: 'Saúde & Movimento', tagline: 'Que o movimento seja seu remédio' },
  { area: 'calendario', name: 'Newton', fullName: 'Isaac Newton', emoji: '🍎', color: '#7C3AED', domain: 'Gestão do Tempo', tagline: 'O tempo pode ser dominado' },
  { area: 'insights', name: 'Sócrates', fullName: 'Sócrates de Atenas', emoji: '🦉', color: '#0EA5E9', domain: 'Autoconhecimento', tagline: 'Conhece-te a ti mesmo' },
  { area: 'foco', name: 'Tesla', fullName: 'Nikola Tesla', emoji: '⚡', color: '#6366F1', domain: 'Foco Profundo', tagline: 'O foco é o superpoder mais raro' },
  { area: 'perfil', name: 'Marco', fullName: 'Marco Aurélio', emoji: '👑', color: '#B45309', domain: 'Identidade & Valores', tagline: 'Quem você é define o que conquista' },
];

interface OrchestratorSetupProps {
  currentName?: string;
  currentEmoji?: string;
  onSave?: (name: string, emoji: string) => void;
  onAgentPress?: (area: string) => void;
}

export function OrchestratorSetup({
  currentName = 'Youli',
  currentEmoji = '🤖',
  onSave,
  onAgentPress,
}: OrchestratorSetupProps) {
  const [selectedPreset, setSelectedPreset] = useState<OrchestratorPreset | null>(
    PRESETS.find((p) => p.name === currentName) || null
  );
  const [customName, setCustomName] = useState(
    PRESETS.find((p) => p.name === currentName) ? '' : currentName
  );
  const [saving, setSaving] = useState(false);

  const displayName = customName.trim() || selectedPreset?.name || currentName;
  const displayEmoji = selectedPreset?.emoji || currentEmoji;

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Nome obrigatório', 'Escolha um nome para seu assistente.');
      return;
    }
    setSaving(true);
    try {
      await fetch('/api/settings/orchestrator', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName, emoji: displayEmoji }),
      });
      onSave?.(displayName, displayEmoji);
    } catch (e) {
      // Salva localmente mesmo sem API
      onSave?.(displayName, displayEmoji);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Preview do orquestrador */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.previewCard}>
        <Text style={styles.previewEmoji}>{displayEmoji}</Text>
        <Text style={styles.previewName}>{displayName}</Text>
        <Text style={styles.previewSub}>Seu assistente pessoal de vida</Text>
      </Animated.View>

      {/* Seção: escolher preset */}
      <Animated.View entering={FadeInDown.delay(100).springify().damping(24).stiffness(220).mass(0.9)} style={styles.section}>
        <Text style={styles.sectionTitle}>Escolha um nome</Text>
        <View style={styles.presetsGrid}>
          {PRESETS.map((preset, i) => (
            <TouchableOpacity
              key={preset.name}
              style={[
                styles.presetChip,
                selectedPreset?.name === preset.name && styles.presetChipSelected,
              ]}
              onPress={() => {
                setSelectedPreset(preset);
                setCustomName('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.presetEmoji}>{preset.emoji}</Text>
              <Text
                style={[
                  styles.presetName,
                  selectedPreset?.name === preset.name && styles.presetNameSelected,
                ]}
              >
                {preset.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Input personalizado */}
      <Animated.View entering={FadeInDown.delay(200).springify().damping(24).stiffness(220).mass(0.9)} style={styles.section}>
        <Text style={styles.sectionTitle}>Ou crie seu próprio nome</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Athena, Max, Orion..."
          placeholderTextColor={tokens.colors.textMuted}
          value={customName}
          onChangeText={(t) => {
            setCustomName(t);
            setSelectedPreset(null);
          }}
          maxLength={20}
          autoCorrect={false}
        />
      </Animated.View>

      {/* Salvar */}
      <Animated.View entering={FadeInDown.delay(300).springify().damping(24).stiffness(220).mass(0.9)} style={styles.section}>
        <Button
          label={`Salvar — ${displayEmoji} ${displayName}`}
          variant="primary"
          onPress={handleSave}
          loading={saving}
          fullWidth
        />
      </Animated.View>

      {/* Seção: agentes especializados */}
      <Animated.View entering={FadeInDown.delay(400).springify().damping(24).stiffness(220).mass(0.9)} style={styles.section}>
        <Text style={styles.sectionTitle}>Seus Agentes Especializados</Text>
        <Text style={styles.sectionSub}>
          Cada área da sua vida tem um consultor histórico com expertise real
        </Text>
        <View style={styles.agentsList}>
          {AGENTS.map((agent, i) => (
            <Animated.View
              key={agent.area}
              entering={FadeInDown.delay(450 + i * 50).springify().damping(24).stiffness(220).mass(0.9)}
            >
              <TouchableOpacity
                style={styles.agentRow}
                onPress={() => onAgentPress?.(agent.area)}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={[styles.agentAvatar, { backgroundColor: agent.color + '20' }]}>
                  <Text style={styles.agentEmoji}>{agent.emoji}</Text>
                </View>

                {/* Info */}
                <View style={styles.agentInfo}>
                  <View style={styles.agentNameRow}>
                    <Text style={[styles.agentName, { color: agent.color }]}>
                      {agent.name}
                    </Text>
                    <Text style={styles.agentEra}>{agent.domain}</Text>
                  </View>
                  <Text style={styles.agentFullName}>{agent.fullName}</Text>
                  <Text style={styles.agentTagline}>{agent.tagline}</Text>
                </View>

                {/* Seta */}
                <Text style={styles.agentArrow}>›</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    paddingHorizontal: tokens.spacing.md,
  },
  previewCard: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xl,
    gap: tokens.spacing.xs,
  },
  previewEmoji: {
    fontSize: 56,
  },
  previewName: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  previewSub: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  section: {
    marginBottom: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    marginTop: -tokens.spacing.xs,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radii.full,
    borderWidth: 1.5,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  presetChipSelected: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.primary + '12',
  },
  presetEmoji: {
    fontSize: 16,
  },
  presetName: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSecondary,
    fontWeight: tokens.fontWeight.medium,
  },
  presetNameSelected: {
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.bold,
  },
  input: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
  },
  agentsList: {
    gap: tokens.spacing.xs,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radii.md,
    padding: tokens.spacing.sm,
  },
  agentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  agentEmoji: {
    fontSize: 22,
  },
  agentInfo: {
    flex: 1,
    gap: 2,
  },
  agentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  agentName: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
  },
  agentEra: {
    fontSize: 10,
    color: tokens.colors.textMuted,
    backgroundColor: tokens.colors.surfaceDim || '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: tokens.radii.xs,
  },
  agentFullName: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
  },
  agentTagline: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSecondary,
  },
  agentArrow: {
    fontSize: 20,
    color: tokens.colors.textMuted,
  },
});
