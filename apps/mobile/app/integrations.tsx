/**
 * Integrações — conectar apps de esporte e saúde ao Youli
 * Strava · Zepp Health (Amazfit GTR/GTS/T-Rex)
 * Roadmap: WhatsApp · Google Calendar · Spotify · Notion
 */
import { useI18n } from '../src/hooks/useI18n';
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntegrationStatus {
  connected: boolean;
  syncedAt?: string | null;
  athleteName?: string | null;
  openId?: string | null;
  isExpired?: boolean;
  planned?: boolean;
}

interface StatusPayload {
  strava: IntegrationStatus & { athleteName: string | null };
  zepp: IntegrationStatus & { openId: string | null };
  whatsapp: IntegrationStatus;
  googleCalendar: IntegrationStatus;
  googleFit: IntegrationStatus;
  appleHealth: IntegrationStatus;
  spotify: IntegrationStatus;
  notion: IntegrationStatus;
  slack: IntegrationStatus;
}

// ─── Integration Card ─────────────────────────────────────────────────────────

interface IntegrationCardProps {
  logo: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  accentColor: string;
  onConnect: () => void;
  onSync?: () => void;
  onDisconnect?: () => void;
  syncing?: boolean;
}

function IntegrationCard({
  logo, name, description, status, accentColor,
  onConnect, onSync, onDisconnect, syncing,
}: IntegrationCardProps) {
  const isConnected = status.connected && !status.isExpired;
  const { t } = useI18n();
  const isPlanned   = !!status.planned;

  const syncLabel = status.syncedAt
    ? `Sync ${new Date(status.syncedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : 'Nunca sincronizado';

  return (
    <View style={[cardStyles.container, isConnected && { borderColor: accentColor + '44' }]}>
      {/* Header */}
      <View style={cardStyles.header}>
        <View style={[cardStyles.logoBox, { backgroundColor: accentColor + '22' }]}>
          <Text style={cardStyles.logo}>{logo}</Text>
        </View>
        <View style={cardStyles.nameBlock}>
          <Text style={cardStyles.name}>{name}</Text>
          <Text style={cardStyles.description}>{description}</Text>
        </View>
        <View style={[
          cardStyles.statusDot,
          { backgroundColor: isConnected ? '#00b894' : isPlanned ? '#4B5563' : '#e17055' }
        ]} />
      </View>

      {/* Connected info */}
      {isConnected && (
        <View style={cardStyles.connectedInfo}>
          <Text style={[cardStyles.connectedText, { color: accentColor }]}>✓ Conectado</Text>
          <Text style={cardStyles.syncLabel}>{syncLabel}</Text>
        </View>
      )}

      {isPlanned && !isConnected && (
        <View style={cardStyles.plannedBadge}>
          <Text style={cardStyles.plannedText}>🗓 Em breve</Text>
        </View>
      )}

      {/* Actions */}
      {!isPlanned && (
        <View style={cardStyles.actions}>
          {!isConnected ? (
            <TouchableOpacity
              style={[cardStyles.connectBtn, { backgroundColor: accentColor }]}
              onPress={onConnect}
              activeOpacity={0.8}
            >
              <Text style={cardStyles.connectBtnText}>Conectar</Text>
            </TouchableOpacity>
          ) : (
            <>
              {onSync && (
                <TouchableOpacity
                  style={[cardStyles.syncBtn, { borderColor: accentColor }]}
                  onPress={onSync}
                  disabled={syncing}
                  activeOpacity={0.8}
                >
                  {syncing
                    ? <ActivityIndicator size="small" color={accentColor} />
                    : <Text style={[cardStyles.syncBtnText, { color: accentColor }]}>{t('app.sync')}</Text>}
                </TouchableOpacity>
              )}
              {onDisconnect && (
                <TouchableOpacity style={cardStyles.disconnectBtn} onPress={onDisconnect} activeOpacity={0.8}>
                  <Text style={cardStyles.disconnectBtnText}>Desconectar</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1F2937', gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 22 },
  nameBlock: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  description: { fontSize: 11, color: '#6B7280', lineHeight: 16 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  connectedInfo: { gap: 2 },
  connectedText: { fontSize: 12, fontWeight: '700' },
  syncLabel: { fontSize: 10, color: '#4B5563' },
  plannedBadge: {
    backgroundColor: '#1F2937', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  plannedText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  connectBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  connectBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  syncBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, backgroundColor: 'transparent', height: 40, justifyContent: 'center' },
  syncBtnText: { fontSize: 13, fontWeight: '700' },
  disconnectBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1F2937' },
  disconnectBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function IntegrationsScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingStrava, setSyncingStrava] = useState(false);
  const [syncingZepp,   setSyncingZepp]   = useState(false);
  const [lastSyncMsg, setLastSyncMsg]     = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/integrations/status`);
      if (res.ok) setStatus(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  React.useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── Strava ──────────────────────────────────────────────────────────────────

  const connectStrava = () => {
    // Opens the API OAuth redirect (which then redirects to Strava)
    const url = `${API_BASE}/api/integrations/strava/auth`;
    Linking.openURL(url);
    // Poll for connection after user returns
    setTimeout(fetchStatus, 5000);
  };

  const syncStrava = async () => {
    setSyncingStrava(true);
    setLastSyncMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/integrations/strava/sync`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 'default', daysBack: 30 }),
      });
      const data = await res.json() as { activitiesCount: number; sweci: { pointsRecorded: number } };
      setLastSyncMsg(`✅ ${data.activitiesCount} atividades sincronizadas · ${data.sweci.pointsRecorded} pontos SWE-CI registrados`);
      await fetchStatus();
    } catch {
      setLastSyncMsg('❌ Erro ao sincronizar Strava');
    } finally { setSyncingStrava(false); }
  };

  const disconnectStrava = () => {
    Alert.alert('Desconectar Strava', 'Remover a conexão com o Strava?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar', style: 'destructive',
        onPress: async () => {
          await fetch(`${API_BASE}/api/integrations/strava/sync`, { method: 'DELETE' }).catch(() => {});
          fetchStatus();
        },
      },
    ]);
  };

  // ── Zepp ─────────────────────────────────────────────────────────────────────

  const connectZepp = () => {
    const url = `${API_BASE}/api/integrations/zepp/auth`;
    Linking.openURL(url);
    setTimeout(fetchStatus, 5000);
  };

  const syncZepp = async () => {
    setSyncingZepp(true);
    setLastSyncMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/integrations/zepp/sync`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 'default', daysBack: 7 }),
      });
      const data = await res.json() as { workoutsCount: number; sweci: { pointsRecorded: number }; today: { steps: number; sleepHours: number } };
      setLastSyncMsg(`✅ ${data.today.steps.toLocaleString()} passos · ${data.today.sleepHours}h sono · ${data.sweci.pointsRecorded} pontos SWE-CI`);
      await fetchStatus();
    } catch {
      setLastSyncMsg('❌ Erro ao sincronizar Zepp');
    } finally { setSyncingZepp(false); }
  };

  const disconnectZepp = () => {
    Alert.alert('Desconectar Zepp', 'Remover a conexão com o Zepp Health?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar', style: 'destructive',
        onPress: async () => {
          await fetch(`${API_BASE}/api/integrations/zepp/sync`, { method: 'DELETE' }).catch(() => {});
          fetchStatus();
        },
      },
    ]);
  };

  const activeCount = status
    ? [status.strava, status.zepp].filter((s) => s.connected).length
    : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{t('integrations.title')}</Text>
          <Text style={styles.subtitle}>{activeCount} app{activeCount !== 1 ? 's' : ''} conectado{activeCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#7C3AED" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStatus(); }} tintColor="#7C3AED" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Sync result message */}
          {lastSyncMsg && (
            <Animated.View entering={FadeInDown} style={styles.syncMsg}>
              <Text style={styles.syncMsgText}>{lastSyncMsg}</Text>
            </Animated.View>
          )}

          {/* Section: Esporte */}
          <Animated.View entering={FadeInDown.delay(0)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('integrations.sport')}</Text>
            <Text style={styles.sectionSub}>Alimenta o Life Health Score e Evolution Tracker</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40)}>
            <IntegrationCard
              logo="🚴"
              name="Strava"
              description="Corridas, pedaladas e treinos · Importa atividades dos últimos 30 dias"
              status={status?.strava ?? { connected: false }}
              accentColor="#FC4C02"
              onConnect={connectStrava}
              onSync={syncStrava}
              onDisconnect={disconnectStrava}
              syncing={syncingStrava}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80)}>
            <IntegrationCard
              logo="⌚"
              name="Zepp Health"
              description="Amazfit GTR/GTS/T-Rex · Passos, sono, frequência cardíaca e treinos do relógio"
              status={status?.zepp ?? { connected: false }}
              accentColor="#0891B2"
              onConnect={connectZepp}
              onSync={syncZepp}
              onDisconnect={disconnectZepp}
              syncing={syncingZepp}
            />
          </Animated.View>

          {/* SWE-CI info */}
          <Animated.View entering={FadeInDown.delay(120)} style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔬 Como os dados alimentam o SWE-CI</Text>
            <Text style={styles.infoText}>
              Cada sincronização registra pontos de evolução — treinos, passos, sono, frequência cardíaca —
              no Evolution Tracker. Esses dados calculam seu Life Health Score e detectam gaps de fitness
              automaticamente.
            </Text>
            <TouchableOpacity onPress={() => router.push('/life-score' as any)}>
              <Text style={styles.infoLink}>Ver Life Score →</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Section: Roadmap */}
          <Animated.View entering={FadeInDown.delay(160)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('integrations.roadmap')}</Text>
            <Text style={styles.sectionSub}>Youli como mega agente pessoal global</Text>
          </Animated.View>

          {[
            { logo: '💬', name: 'WhatsApp', desc: 'Captura compromissos de mensagens e adiciona na agenda automaticamente', color: '#25D366' },
            { logo: '📅', name: 'Google Calendar', desc: 'Sincronização bidirecional de eventos e blocos de foco', color: '#4285F4' },
            { logo: '🎵', name: 'Spotify', desc: 'Playlists de foco e energia correlacionadas com produtividade', color: '#1DB954' },
            { logo: '📝', name: 'Notion', desc: 'Sincroniza metas, tarefas e notas com o Youli', color: '#FFFFFF' },
            { logo: '💼', name: 'Slack', desc: 'Captura compromissos e action items de canais de trabalho', color: '#4A154B' },
          ].map((item, i) => (
            <Animated.View key={item.name} entering={FadeInDown.delay(200 + i * 30)}>
              <IntegrationCard
                logo={item.logo}
                name={item.name}
                description={item.desc}
                status={{ connected: false, planned: true }}
                accentColor={item.color}
                onConnect={() => {}}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1F2937',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: '#7C3AED', fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '900', color: '#F9FAFB', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 12 },
  syncMsg: {
    backgroundColor: '#0D2B1A', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#065F46',
  },
  syncMsgText: { fontSize: 12, color: '#34D399', lineHeight: 18 },
  sectionHeader: { gap: 2, marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB' },
  sectionSub: { fontSize: 11, color: '#6B7280' },
  infoCard: {
    backgroundColor: '#1A1040', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#7C3AED44', gap: 8,
  },
  infoTitle: { fontSize: 12, fontWeight: '800', color: '#A78BFA' },
  infoText: { fontSize: 12, color: '#9CA3AF', lineHeight: 19 },
  infoLink: { fontSize: 12, color: '#7C3AED', fontWeight: '700' },
});
