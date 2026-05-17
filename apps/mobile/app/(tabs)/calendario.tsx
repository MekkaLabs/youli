/**
 * Calendário — tela de agenda do dia + blocos de foco
 * Agente: Nikola Tesla (energia e tempo)
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { useAgentAction } from '../../src/hooks/useAgentAction';
import { EventCard, FocusBlockCard } from '../../src/molecules/CalendarBlock';
import { useCalendar } from '../../src/hooks/useCalendar';
import { useSWECI } from '../../src/hooks/useSWECI';

const TESLA = {
  name: 'Tesla',
  fullName: 'Nikola Tesla',
  emoji: '⚡',
  color: '#0891B2',
  domain: 'Energia & Tempo',
};

export default function CalendarioScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const onAgentPress = useAgentAction('calendario', TESLA.name);
  const {
    events,
    focusBlocks,
    loading,
    source,
    todayLabel,
    currentEvent,
    nextEvent,
    refresh,
  } = useCalendar();

  const [activeTab, setActiveTab] = useState<'agenda' | 'foco'>('agenda');
  const { getAreaGap, maintainabilityVerdict, maintainabilityScore } = useSWECI();
  const calendarioGap = getAreaGap('calendario');

  const teslaInsight = currentEvent
    ? `Você está em "${currentEvent.title}" agora. Tesla sugere máxima concentração — sem distrações.`
    : nextEvent
    ? `Próximo: "${nextEvent.title}" às ${nextEvent.startTime}. Prepare-se com antecedência.`
    : focusBlocks.length > 0
    ? `Você tem ${focusBlocks.filter(b => b.quality === 'deep').length} bloco(s) de foco profundo hoje. Use-os para seu trabalho mais importante.`
    : 'Agenda livre hoje. Tesla recomenda usar esse tempo para projetos de alto impacto.';

  return (
    <FullScrollLayout
      title={t("calendar.title")}
      subtitle={todayLabel}
      paddingBottom={insets.bottom + 90}
      onRefresh={refresh}
      rightAction={<AgentBadge {...TESLA} compact onPress={onAgentPress} />}
    >
      {/* SWE-CI: painel de tempo e sustentabilidade */}
      {(calendarioGap || maintainabilityScore > 0) && (
        <Animated.View entering={FadeInDown.delay(0)} style={styles.sweciPanel}>
          <View style={styles.sweciRow}>
            <View style={styles.sweciMetric}>
              <Text style={styles.sweciLabel}>Sustentab.</Text>
              <Text style={[styles.sweciValue, {
                color: maintainabilityVerdict === 'sustainable' ? '#00b894'
                  : maintainabilityVerdict === 'moderate_risk' ? '#fdcb6e' : '#e17055'
              }]}>
                {maintainabilityVerdict === 'sustainable' ? '✅ Ok'
                  : maintainabilityVerdict === 'moderate_risk' ? '⚠️ Risco'
                  : '🔴 Alto'}
              </Text>
            </View>
            <View style={styles.sweciMetric}>
              <Text style={styles.sweciLabel}>Blocos deep</Text>
              <Text style={styles.sweciValue}>{focusBlocks.filter((b: any) => b.quality === 'deep').length}</Text>
            </View>
            <View style={styles.sweciMetric}>
              <Text style={styles.sweciLabel}>Eficiência</Text>
              <Text style={[styles.sweciValue, { color: focusBlocks.length >= 2 ? '#00b894' : '#fdcb6e' }]}>
                {focusBlocks.length >= 3 ? 'Alta' : focusBlocks.length >= 1 ? 'Média' : 'Baixa'}
              </Text>
            </View>
          </View>
          {calendarioGap && (
            <View style={styles.sweciGap}>
              <Text style={styles.sweciGapText}>📅 {calendarioGap.requirement}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Tesla insight */}
      <Animated.View entering={FadeInDown.delay(80)} style={styles.teslaCard}>
        <Text style={styles.teslaTag}>⚡ Nikola Tesla</Text>
        <Text style={styles.teslaText}>{teslaInsight}</Text>
        <View style={styles.sourceRow}>
          <Text style={styles.sourceLabel}>
            Fonte: {source === 'api' ? '☁️ Google Calendar' : source === 'native' ? '📱 Calendário nativo' : '📋 Demo'}
          </Text>
          {source === 'mock' && (
            <Text style={styles.connectHint}>Conecte o Google Calendar para dados reais</Text>
          )}
        </View>
      </Animated.View>

      {/* Tabs */}
      <Animated.View entering={FadeInDown.delay(120)} style={styles.tabs}>
        {(['agenda', 'foco'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'agenda' ? `📅 Agenda (${events.length})` : `🧠 Blocos de foco (${focusBlocks.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Conteúdo */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={styles.loadingText}>Carregando agenda...</Text>
        </View>
      ) : activeTab === 'agenda' ? (
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🗓</Text>
              <Text style={styles.emptyTitle}>Sem eventos hoje</Text>
              <Text style={styles.emptySub}>Conecte o Google Calendar ou o calendário nativo para ver sua agenda real.</Text>
            </View>
          ) : (
            <View style={styles.eventList}>
              {events.map((e, i) => (
                <EventCard
                  key={e.id}
                  event={e}
                  index={i}
                  isCurrent={currentEvent?.id === e.id}
                />
              ))}
            </View>
          )}
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionLabel}>Janelas de foco detectadas</Text>
          {focusBlocks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🧠</Text>
              <Text style={styles.emptyTitle}>Agenda muito cheia</Text>
              <Text style={styles.emptySub}>Nenhum bloco livre ≥30min encontrado. Considere reorganizar compromissos.</Text>
            </View>
          ) : (
            <View style={styles.focusList}>
              {focusBlocks.map((b, i) => (
                <FocusBlockCard key={`${b.startTime}-${i}`} block={b} index={i} />
              ))}
            </View>
          )}

          {/* Dica */}
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              💡 Blocos de foco profundo (≥90min) são ideais para trabalho criativo e resolução de problemas complexos. Use-os para sua tarefa mais importante do dia.
            </Text>
          </View>
        </Animated.View>
      )}
    </FullScrollLayout>
  );
}

const styles = StyleSheet.create({
  teslaCard: {
    backgroundColor: '#0D1E2E', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#0F2D3F', gap: 6,
  },
  teslaTag: { fontSize: 11, color: '#0891B2', fontWeight: '700' },
  teslaText: { fontSize: 13, color: '#9CA3AF', lineHeight: 20, fontStyle: 'italic' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sourceLabel: { fontSize: 10, color: '#4B5563' },
  connectHint: { fontSize: 10, color: '#D97706', fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#2D1B6E', borderColor: '#7C3AED' },
  tabText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#A78BFA', fontWeight: '700' },
  section: { gap: 12 },
  sectionLabel: {
    fontSize: 12, color: '#6B7280', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  eventList: { gap: 8 },
  focusList: { gap: 8 },
  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#F9FAFB' },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  tipCard: {
    backgroundColor: '#1A1040', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#2D1B6E',
  },
  tipText: { fontSize: 12, color: '#A78BFA', lineHeight: 19 },
  sweciPanel: { backgroundColor: '#0D1220', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1F2937', gap: 10 },
  sweciRow: { flexDirection: 'row', justifyContent: 'space-around' },
  sweciMetric: { alignItems: 'center', gap: 4 },
  sweciLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  sweciValue: { fontSize: 14, fontWeight: '800', color: '#F9FAFB' },
  sweciGap: { backgroundColor: '#111827', borderRadius: 8, padding: 10 },
  sweciGapText: { fontSize: 12, color: '#93C5FD', lineHeight: 18 },
});
