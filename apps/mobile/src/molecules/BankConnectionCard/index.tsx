/**
 * BankConnectionCard — card de banco disponível ou conectado
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BankConnection, AvailableBank } from '../../hooks/useOpenBanking';

function money(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

// ── Banco conectado ────────────────────────────────────────────────────────
interface ConnectedCardProps {
  connection: BankConnection;
  onDisconnect: (id: string) => void;
  index: number;
}

export function ConnectedBankCard({ connection, onDisconnect, index }: ConnectedCardProps) {
  const totalBalance = connection.accounts.reduce((s, a) => s + a.balance, 0);
  const isSyncing = connection.status === 'syncing';

  return (
    <Animated.View entering={FadeInDown.delay(index * 60)} style={[styles.connectedCard, { borderLeftColor: connection.bankColor }]}>
      <View style={styles.connectedHeader}>
        <View style={styles.bankId}>
          <Text style={styles.bankLogo}>{connection.bankLogo}</Text>
          <View>
            <Text style={styles.bankName}>{connection.bankName}</Text>
            <View style={styles.statusRow}>
              {isSyncing ? (
                <ActivityIndicator size={10} color="#7C3AED" style={{ marginRight: 4 }} />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: '#059669' }]} />
              )}
              <Text style={styles.statusText}>{isSyncing ? 'Sincronizando...' : `Sincronizado ${timeAgo(connection.lastSync)}`}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => onDisconnect(connection.id)} style={styles.disconnectBtn}>
          <Text style={styles.disconnectText}>Desconectar</Text>
        </TouchableOpacity>
      </View>

      {/* Saldo total */}
      <View style={[styles.balanceRow, { backgroundColor: connection.bankColor + '11' }]}>
        <Text style={styles.balanceLabel}>Saldo total</Text>
        <Text style={[styles.balanceValue, { color: connection.bankColor }]}>{money(totalBalance)}</Text>
      </View>

      {/* Contas */}
      <View style={styles.accountsList}>
        {connection.accounts.map(acc => (
          <View key={acc.id} style={styles.accountRow}>
            <Text style={styles.accountName}>{acc.name}</Text>
            <Text style={styles.accountBalance}>{money(acc.balance)}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ── Banco disponível para conectar ────────────────────────────────────────
interface AvailableCardProps {
  bank: AvailableBank;
  onConnect: (id: string) => void;
  isConnecting: boolean;
  isConnected: boolean;
  index: number;
}

export function AvailableBankCard({ bank, onConnect, isConnecting, isConnected, index }: AvailableCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40)} style={styles.availableCard}>
      <Text style={styles.availableLogo}>{bank.logo}</Text>
      <Text style={styles.availableName}>{bank.name}</Text>
      <TouchableOpacity
        style={[
          styles.connectBtn,
          isConnected && styles.connectBtnConnected,
          { borderColor: bank.color },
        ]}
        onPress={() => !isConnected && onConnect(bank.id)}
        disabled={isConnecting || isConnected}
      >
        {isConnecting
          ? <ActivityIndicator size={12} color={bank.color} />
          : <Text style={[styles.connectBtnText, { color: isConnected ? '#059669' : bank.color }]}>
              {isConnected ? '✓ Conectado' : 'Conectar'}
            </Text>
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  connectedCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, gap: 10, borderWidth: 1, borderColor: '#1F2937',
  },
  connectedHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bankId: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bankLogo: { fontSize: 28 },
  bankName: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: '#6B7280' },
  disconnectBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, backgroundColor: '#1F2937',
  },
  disconnectText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  balanceLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  balanceValue: { fontSize: 18, fontWeight: '900' },
  accountsList: { gap: 6 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  accountName: { fontSize: 12, color: '#9CA3AF' },
  accountBalance: { fontSize: 12, color: '#E5E7EB', fontWeight: '700' },

  availableCard: {
    backgroundColor: '#111827', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#1F2937',
    alignItems: 'center', gap: 6, minWidth: 100,
  },
  availableLogo: { fontSize: 24 },
  availableName: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textAlign: 'center' },
  connectBtn: {
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1.5, minWidth: 76, alignItems: 'center',
  },
  connectBtnConnected: { borderColor: '#059669' },
  connectBtnText: { fontSize: 11, fontWeight: '700' },
});
