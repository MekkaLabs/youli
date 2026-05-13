import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { api } from '../src/services/api';
import { colors } from '../src/theme/tokens';
import type { FinancialSummary, FinancialTransaction } from '@youli/shared';

type DashboardResponse = {
  dashboard: {
    dayFocus: string;
    energy: string;
    progress: number;
    topTasks: { id: string; title: string; priority: number }[];
    insights: { id: string; summary: string }[];
  };
  finance: FinancialSummary;
};

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function load() {
      try {
        const [dashboard, tx] = await Promise.all([
          api<DashboardResponse>('/api/dashboard'),
          api<FinancialTransaction[]>('/api/open-finance/transactions')
        ]);
        setData(dashboard);
        setTransactions(tx);
      } finally {
        setLoading(false);
        Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }
    }
    load();
  }, [fade]);

  const financeCards = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Saldo em contas', value: money(data.finance.totalBalance), tone: '#133E35' },
      { label: 'Receitas do mês', value: money(data.finance.monthlyIncome), tone: '#174A3E' },
      { label: 'Despesas do mês', value: money(data.finance.monthlyExpenses), tone: '#4A1F24' },
      { label: 'Crédito usado', value: money(data.finance.creditUsed), tone: '#46361F' }
    ];
  }, [data]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fade }}>
        <View style={styles.heroCard}>
          <Text style={styles.badge}>Open Finance ativo</Text>
          <Text style={styles.headline}>Seus dados. Seu controle.</Text>
          <Text style={styles.subline}>{data?.dashboard.dayFocus || 'Organização financeira e cognitiva em um só fluxo.'}</Text>
          <Pressable style={styles.connectBtn}>
            <Text style={styles.connectText}>Conectar novo banco</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Visão financeira</Text>
        <View style={styles.cardGrid}>
          {financeCards.map((card) => (
            <View key={card.label} style={[styles.metricCard, { backgroundColor: card.tone }]}>
              <Text style={styles.metricLabel}>{card.label}</Text>
              <Text style={styles.metricValue}>{card.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Contas conectadas</Text>
        <View style={styles.panel}>
          {data?.finance.accounts.map((acc) => (
            <View key={acc.id} style={styles.rowItem}>
              <View>
                <Text style={styles.rowTitle}>{acc.institution}</Text>
                <Text style={styles.rowMeta}>{acc.type}</Text>
              </View>
              <Text style={styles.rowValue}>{money(acc.balance)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Últimas transações</Text>
        <View style={styles.panel}>
          {transactions.slice(0, 4).map((tx) => (
            <View key={tx.id} style={styles.rowItem}>
              <View>
                <Text style={styles.rowTitle}>{tx.description}</Text>
                <Text style={styles.rowMeta}>{tx.category}</Text>
              </View>
              <Text style={[styles.rowValue, tx.amount < 0 ? styles.expense : styles.income]}>{money(tx.amount)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Foco de execução</Text>
        <View style={styles.panel}>
          {data?.dashboard.topTasks.map((task) => (
            <Text key={task.id} style={styles.taskLine}>• {task.title}</Text>
          ))}
          <Text style={styles.progress}>Progresso do dia: {data?.dashboard.progress}%</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2EFE7' },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2EFE7' },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#103F34',
    shadowColor: '#0B2D25',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D7ECD8',
    color: '#103F34',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 14
  },
  headline: { color: '#F7F4EA', fontSize: 34, fontWeight: '800', lineHeight: 38 },
  subline: { color: '#DDE7DE', marginTop: 10, fontSize: 16, lineHeight: 24 },
  connectBtn: {
    marginTop: 16,
    backgroundColor: '#D9EFD7',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12
  },
  connectText: { color: '#123E34', fontWeight: '700' },
  sectionTitle: { marginTop: 18, marginBottom: 10, fontSize: 21, fontWeight: '800', color: '#172118' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48.6%', borderRadius: 18, padding: 14, minHeight: 110, justifyContent: 'space-between' },
  metricLabel: { color: '#D9E8D7', fontWeight: '600', fontSize: 13 },
  metricValue: { color: '#F1F7EE', fontWeight: '800', fontSize: 20 },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, gap: 12 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { color: '#1A241B', fontSize: 16, fontWeight: '700' },
  rowMeta: { color: '#70816F', fontSize: 13, textTransform: 'capitalize' },
  rowValue: { color: '#1E2A1E', fontSize: 15, fontWeight: '700' },
  income: { color: '#1E6548' },
  expense: { color: '#8A2F3E' },
  taskLine: { color: '#243024', fontSize: 15 },
  progress: { marginTop: 8, color: '#4B5A4B', fontWeight: '700' }
});
