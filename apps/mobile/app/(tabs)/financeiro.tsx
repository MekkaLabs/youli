import { useI18n } from '../../src/hooks/useI18n';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullScrollLayout } from '../../src/templates/FullScrollLayout';
import { FinanceGrid } from '../../src/organisms/FinanceGrid';
import { AgentBadge } from '../../src/atoms/AgentBadge';
import { useAgentAction } from '../../src/hooks/useAgentAction';
import { ConnectedBankCard, AvailableBankCard } from '../../src/molecules/BankConnectionCard';
import { useOpenBanking } from '../../src/hooks/useOpenBanking';

const ADAM = {
  name: 'Adam',
  fullName: 'Adam Smith',
  emoji: '💰',
  color: '#0891B2',
  domain: 'Riqueza & Economia',
};

function money(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function FinanceiroScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const onAgentPress = useAgentAction('financeiro', ADAM.name);
  const [tab, setTab] = useState<'lancamentos' | 'contas'>('lancamentos');
  const { connections, availableBanks, connecting, totalBalance, connect, disconnect, isConnected } = useOpenBanking();

  const popularBanks = availableBanks.filter(b => b.popular);
  const otherBanks = availableBanks.filter(b => !b.popular);

  return (
    <FullScrollLayout
      title={t("finances.title")}
      subtitle={t("finances.subtitle")}
      paddingBottom={insets.bottom + 90}
      rightAction={<AgentBadge {...ADAM} compact onPress={onAgentPress} />}
    >
      {/* Tabs principais */}
      <View style={styles.tabs}>
        {(['lancamentos', 'contas'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'lancamentos' ? '📊 Lançamentos' : `🏦 Open Banking (${connections.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'lancamentos' ? (
        <FinanceGrid />
      ) : (
        <View style={styles.bankingSection}>
          {/* Saldo consolidado */}
          {connections.length > 0 && (
            <Animated.View entering={FadeInDown.delay(50)} style={styles.totalCard}>
              <Text style={styles.totalLabel}>Saldo consolidado</Text>
              <Text style={styles.totalValue}>{money(totalBalance)}</Text>
              <Text style={styles.totalSub}>{connections.length} banco{connections.length !== 1 ? 's' : ''} conectado{connections.length !== 1 ? 's' : ''}</Text>
            </Animated.View>
          )}

          {/* Bancos conectados */}
          {connections.length > 0 && (
            <View style={styles.connectedSection}>
              <Text style={styles.sectionLabel}>Conectados</Text>
              {connections.map((conn, i) => (
                <ConnectedBankCard key={conn.id} connection={conn} onDisconnect={disconnect} index={i} />
              ))}
            </View>
          )}

          {/* Bancos populares para conectar */}
          <View style={styles.availableSection}>
            <Text style={styles.sectionLabel}>
              {connections.length === 0 ? 'Conecte seu banco' : 'Adicionar banco'}
            </Text>
            <Text style={styles.sectionSub}>Open Banking Brasil — seus dados, seu controle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.bankRow}>
                {popularBanks.map((bank, i) => (
                  <AvailableBankCard
                    key={bank.id} bank={bank} index={i}
                    onConnect={connect}
                    isConnecting={connecting === bank.id}
                    isConnected={isConnected(bank.id)}
                  />
                ))}
              </View>
            </ScrollView>
            {otherBanks.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Outros</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.bankRow}>
                    {otherBanks.map((bank, i) => (
                      <AvailableBankCard
                        key={bank.id} bank={bank} index={i}
                        onConnect={connect}
                        isConnecting={connecting === bank.id}
                        isConnected={isConnected(bank.id)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>

          {/* Aviso de segurança */}
          <View style={styles.securityNote}>
            <Text style={styles.securityText}>🔒 Conexão segura via Open Banking Brasil. Seus dados bancários nunca são armazenados — apenas os saldos e extratos são sincronizados.</Text>
          </View>
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
  tabActive: { backgroundColor: '#0D1F17', borderColor: '#0891B2' },
  tabText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#67E8F9', fontWeight: '700' },
  bankingSection: { gap: 16 },
  totalCard: {
    backgroundColor: '#0D1F17', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#0F2E1F', gap: 4, alignItems: 'center',
  },
  totalLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 32, fontWeight: '900', color: '#34D399' },
  totalSub: { fontSize: 12, color: '#059669' },
  connectedSection: { gap: 10 },
  availableSection: { gap: 10 },
  sectionLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSub: { fontSize: 12, color: '#4B5563', marginTop: -4 },
  bankRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  securityNote: {
    backgroundColor: '#0D1520', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#1E3A5F',
  },
  securityText: { fontSize: 12, color: '#60A5FA', lineHeight: 18 },
});
