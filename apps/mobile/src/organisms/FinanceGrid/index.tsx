import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { FinancialSummary, FinancialTransaction } from '@youli/shared';
import { MetricCard } from '../../molecules/MetricCard';
import { TransactionRow } from '../../molecules/TransactionRow';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';

function money(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface FinanceGridProps {
  summary: FinancialSummary;
  transactions: FinancialTransaction[];
}

export function FinanceGrid({ summary, transactions }: FinanceGridProps) {
  const metrics = [
    { label: 'Saldo em contas', value: money(summary.totalBalance), tone: colors.incomeBg },
    { label: 'Receitas do mês', value: money(summary.monthlyIncome), tone: colors.savingsBg },
    { label: 'Despesas do mês', value: money(summary.monthlyExpenses), tone: colors.expenseBg },
    { label: 'Crédito usado',   value: money(summary.creditUsed),      tone: colors.creditBg },
  ];

  return (
    <View style={styles.wrap}>
      {/* Metric grid */}
      <View style={styles.grid}>
        {metrics.map((m, i) => (
          <MetricCard key={m.label} label={m.label} value={m.value} tone={m.tone}
            textColor={colors.inverse} index={i} style={styles.metricCell} />
        ))}
      </View>

      {/* Accounts */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.panel, shadows.sm]}>
        <Text style={styles.panelTitle}>Contas conectadas</Text>
        {summary.accounts.map(acc => (
          <View key={acc.id} style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>{acc.institution}</Text>
              <Text style={styles.rowSub}>{acc.type}</Text>
            </View>
            <Text style={[styles.rowValue, acc.balance < 0 && { color: colors.expense }]}>
              {money(acc.balance)}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Transactions */}
      <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.panel, shadows.sm]}>
        <Text style={styles.panelTitle}>Últimas transações</Text>
        {transactions.slice(0, 5).map(tx => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCell: { width: '48%', minHeight: 100 },
  panel: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  panelTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, color: colors.text, marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  rowTitle: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  rowSub: { fontSize: fontSize.sm, color: colors.muted, textTransform: 'capitalize' },
  rowValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
});
