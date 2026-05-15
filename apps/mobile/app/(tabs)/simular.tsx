/**
 * Simular — tela do Life Simulator
 * Projeção 30/60/90 dias + IA what-if
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { SimulationChart } from '../../src/organisms/SimulationChart';
import { LifeSimulator } from '../../src/organisms/LifeSimulator';

// O orquestrador central (Leonardo vê o todo)
const LEONARDO = {
  name: 'Leonardo',
  fullName: 'Leonardo da Vinci',
  emoji: '🎨',
  color: '#7C3AED',
  domain: 'Simulação de Vida',
};

type TabId = 'projecao' | 'simulador';

export default function SimularScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabId>('projecao');

  return (
    <FullScrollLayout
      title="Simular"
      subtitle="Visualize seu futuro, decida hoje"
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...LEONARDO} compact onPress={() => {}} />}
    >
      {/* Tabs */}
      <View style={styles.tabs}>
        {([
          { id: 'projecao', label: '📈 Projeção 90d' },
          { id: 'simulador', label: '🎮 Simulador' },
        ] as { id: TabId; label: string }[]).map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'projecao' ? (
        <SimulationChart />
      ) : (
        <View style={styles.simulatorWrap}>
          <LifeSimulator orchestratorName="Youli" />
        </View>
      )}
    </FullScrollLayout>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937', alignItems: 'center',
  },
  tabActive: { backgroundColor: '#160D2B', borderColor: '#7C3AED' },
  tabText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#A78BFA', fontWeight: '700' },
  simulatorWrap: { flex: 1, minHeight: 500 },
});
