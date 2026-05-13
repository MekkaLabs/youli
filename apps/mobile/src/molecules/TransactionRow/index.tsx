import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FinancialTransaction } from '@youli/shared';
import { colors, fontWeight, fontSize, spacing } from '../../theme/tokens';

interface TransactionRowProps { tx: FinancialTransaction; }

function money(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function TransactionRow({ tx }: TransactionRowProps) {
  const isIncome = tx.amount >= 0;
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: isIncome ? colors.income : colors.expense }]} />
      <View style={styles.body}>
        <Text style={styles.desc} numberOfLines={1}>{tx.description}</Text>
        <Text style={styles.cat}>{tx.category}</Text>
      </View>
      <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
        {isIncome ? '+' : ''}{money(tx.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  body: { flex: 1 },
  desc: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  cat: { fontSize: fontSize.sm, color: colors.muted, textTransform: 'capitalize' },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
