/**
 * Simular — tela do Life Simulator
 * Acesso: BottomNav ou link direto
 */
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { LifeSimulator } from '../../src/organisms/LifeSimulator';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { tokens } from '../../src/theme/tokens';

// O orquestrador central (Leonardo vê o todo)
const LEONARDO = { name: 'Leonardo', fullName: 'Leonardo da Vinci', emoji: '🎨', color: '#7C3AED', domain: 'Simulação de Vida' };

export default function SimularScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <AgentBadge {...LEONARDO} onPress={() => {}} />
      </View>
      <LifeSimulator orchestratorName="Youli" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background },
  header: { paddingHorizontal: tokens.spacing.md, paddingBottom: tokens.spacing.xs },
});
