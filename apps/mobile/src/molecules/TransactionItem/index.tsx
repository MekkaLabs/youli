/**
 * TransactionItem — linha de transação financeira
 * Mostra: emoji, descrição, categoria, data, valor colorido (verde receita / vermelho gasto)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import type { Transaction } from '../../hooks/useFinance';

interface TransactionItemProps {
  tx: Transaction;
  index?: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatMoney(amount: number, type: 'income' | 'expense'): string {
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  return type === 'income' ? `+${formatted}` : `-${formatted}`;
}

export function TransactionItem({ tx, index = 0 }: TransactionItemProps) {
  const isIncome = tx.type === 'income';
  return (
    <Animated.View
      entering={FadeInRight.delay(index * 40).springify().damping(24).stiffness(220).mass(0.9)}
      style={styles.row}
    >
      {/* Emoji avatar */}
      <View style={[styles.avatar, { backgroundColor: isIncome ? '#0F1E16' : '#1E0F0F' }]}>
        <Text style={styles.emoji}>{tx.emoji}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>{tx.description}</Text>
        <Text style={styles.meta}>{tx.category} · {formatDate(tx.date)}</Text>
      </View>

      {/* Valor */}
      <Text style={[styles.amount, { color: isIncome ? '#059669' : '#EF4444' }]}>
        {formatMoney(tx.amount, tx.type)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  info: { flex: 1 },
  description: { fontSize: 14, fontWeight: '600', color: '#F9FAFB' },
  meta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700' },
});
