/**
 * FinanceGrid v2 — organismo completo de finanças
 * - Cards de saldo / receita / gasto / taxa de poupança
 * - Donut chart de gastos por categoria
 * - Bar chart receita vs despesa (6 meses)
 * - Lista de transações recentes filtráveis
 * - Adam Smith insight dinâmico
 * - Modal para adicionar transação rápida
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useFinance } from '../../hooks/useFinance';
import { DonutChart } from '../../atoms/DonutChart';
import { BarChart } from '../../atoms/BarChart';
import { TransactionItem } from '../../molecules/TransactionItem';

type TxFilter = 'all' | 'income' | 'expense';

export function FinanceGrid() {
  const {
    transactions: _transactions,
    thisMonth,
    monthlySummary,
    categoryBreakdown,
    monthlyHistory,
    totalBalance,
    adamInsight,
    addTransaction,
    money,
    CATEGORY_META,
  } = useFinance();

  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);

  // Form
  const [newType, setNewType] = useState<'income' | 'expense'>('expense');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('alimentação');

  const filteredTx = thisMonth
    .filter(t => txFilter === 'all' || t.type === txFilter)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, showAllTx ? 50 : 8);

  const handleAdd = () => {
    const amount = parseFloat(newAmount.replace(',', '.'));
    if (!newDesc.trim() || isNaN(amount) || amount <= 0) return;
    addTransaction({
      type: newType,
      amount,
      description: newDesc.trim(),
      category: newCategory,
      emoji: CATEGORY_META[newCategory]?.emoji ?? '📦',
      date: new Date().toISOString().split('T')[0],
    });
    setNewDesc(''); setNewAmount(''); setShowAdd(false);
  };

  const { income, expenses, balance, savingsRate } = monthlySummary;
  const savingsColor = savingsRate >= 20 ? '#059669' : savingsRate >= 10 ? '#D97706' : '#DC2626';

  return (
    <View style={styles.root}>

      {/* ── Cards de resumo ─────────────────────── */}
      <Animated.View entering={FadeIn.duration(350)} style={styles.summaryGrid}>
        {/* Saldo */}
        <View style={[styles.summaryCard, styles.summaryCardLarge]}>
          <Text style={styles.summaryLabel}>Saldo acumulado</Text>
          <Text style={[styles.summaryValue, { color: totalBalance >= 0 ? '#059669' : '#DC2626' }]}>
            {money(totalBalance)}
          </Text>
        </View>

        {/* Receita do mês */}
        <View style={[styles.summaryCard, styles.summaryCardHalf, { borderColor: '#0F1E16' }]}>
          <Text style={styles.summaryLabel}>↑ Receita</Text>
          <Text style={[styles.summaryValueSm, { color: '#059669' }]}>{money(income)}</Text>
        </View>

        {/* Gastos do mês */}
        <View style={[styles.summaryCard, styles.summaryCardHalf, { borderColor: '#1E0F0F' }]}>
          <Text style={styles.summaryLabel}>↓ Gastos</Text>
          <Text style={[styles.summaryValueSm, { color: '#EF4444' }]}>{money(expenses)}</Text>
        </View>

        {/* Saldo do mês */}
        <View style={[styles.summaryCard, styles.summaryCardHalf]}>
          <Text style={styles.summaryLabel}>Sobrou</Text>
          <Text style={[styles.summaryValueSm, { color: balance >= 0 ? '#059669' : '#EF4444' }]}>
            {money(balance)}
          </Text>
        </View>

        {/* Taxa de poupança */}
        <View style={[styles.summaryCard, styles.summaryCardHalf]}>
          <Text style={styles.summaryLabel}>💰 Poupança</Text>
          <Text style={[styles.summaryValueSm, { color: savingsColor }]}>{savingsRate}%</Text>
        </View>
      </Animated.View>

      {/* ── Adam Smith insight ───────────────────── */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.adamCard}>
        <Text style={styles.adamTag}>💰 Adam Smith</Text>
        <Text style={styles.adamText}>{adamInsight}</Text>
      </Animated.View>

      {/* ── Donut: gastos por categoria ──────────── */}
      {categoryBreakdown.length > 0 && (
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos por categoria</Text>
          <View style={styles.donutRow}>
            <DonutChart
              data={categoryBreakdown.map(c => ({ value: c.total, color: c.color }))}
              size={160}
              strokeWidth={30}
              centerLabel={money(expenses).replace('R$ ', 'R$ ')}
              centerSublabel="total"
            />
            <View style={styles.legend}>
              {categoryBreakdown.slice(0, 5).map((cat) => (
                <View key={cat.name} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                  <View style={styles.legendText}>
                    <Text style={styles.legendName}>{cat.emoji} {cat.name}</Text>
                    <Text style={styles.legendVal}>{cat.percent}% · {money(cat.total)}</Text>
                  </View>
                </View>
              ))}
              {categoryBreakdown.length > 5 && (
                <Text style={styles.moreCategories}>+{categoryBreakdown.length - 5} categorias</Text>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Bar chart: 6 meses ───────────────────── */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
        <Text style={styles.sectionTitle}>Receita vs Gastos (6 meses)</Text>
        <BarChart
          data={monthlyHistory.map((m) => ({
            label: m.month,
            income: m.income,
            expenses: m.expenses,
          }))}
          height={150}
          incomeColor="#059669"
          expenseColor="#DC2626"
        />
      </Animated.View>

      {/* ── Transações recentes ──────────────────── */}
      <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transações</Text>
          <TouchableOpacity style={styles.addTxBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addTxText}>+ Adicionar</Text>
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as TxFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setTxFilter(f)}
              style={[styles.filterChip, txFilter === f && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, txFilter === f && styles.filterTextActive]}>
                {f === 'all' ? 'Todas' : f === 'income' ? '↑ Receitas' : '↓ Gastos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista */}
        <View>
          {filteredTx.map((tx, i) => (
            <TransactionItem key={tx.id} tx={tx} index={i} />
          ))}
          {thisMonth.length > 8 && (
            <TouchableOpacity onPress={() => setShowAllTx(v => !v)} style={styles.showMoreBtn}>
              <Text style={styles.showMoreText}>
                {showAllTx ? 'Ver menos' : `Ver todas (${thisMonth.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ── Modal: adicionar transação ───────────── */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAdd(false)}>
          <View style={styles.sheet}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Nova Transação</Text>

              {/* Tipo */}
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, newType === 'expense' && styles.typeBtnExpense]}
                  onPress={() => setNewType('expense')}
                >
                  <Text style={[styles.typeBtnText, newType === 'expense' && { color: '#EF4444' }]}>↓ Gasto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, newType === 'income' && styles.typeBtnIncome]}
                  onPress={() => setNewType('income')}
                >
                  <Text style={[styles.typeBtnText, newType === 'income' && { color: '#059669' }]}>↑ Receita</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Descrição..."
                placeholderTextColor="#4B5563"
                value={newDesc}
                onChangeText={setNewDesc}
                autoFocus
              />
              <TextInput
                style={styles.input}
                placeholder="Valor (ex: 150,90)"
                placeholderTextColor="#4B5563"
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="numeric"
              />

              {/* Categorias */}
              <Text style={styles.fieldLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={styles.catRow}>
                  {Object.entries(CATEGORY_META)
                    .filter(([cat]) => newType === 'income'
                      ? ['salário', 'freelance', 'investimentos', 'outros'].includes(cat)
                      : !['salário', 'freelance'].includes(cat))
                    .map(([cat, meta]) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setNewCategory(cat)}
                        style={[styles.catChip, newCategory === cat && {
                          backgroundColor: meta.color + '22',
                          borderColor: meta.color,
                        }]}
                      >
                        <Text style={[styles.catText, newCategory === cat && { color: meta.color }]}>
                          {meta.emoji} {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: newType === 'income' ? '#059669' : '#DC2626' }]}
                onPress={handleAdd}
              >
                <Text style={styles.saveBtnText}>Registrar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },

  // Summary grid
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryCard: {
    backgroundColor: '#111827', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1F2937',
  },
  summaryCardLarge: { width: '100%' },
  summaryCardHalf: { flex: 1, minWidth: '45%' },
  summaryLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 26, fontWeight: '900' },
  summaryValueSm: { fontSize: 18, fontWeight: '800' },

  // Adam card
  adamCard: { backgroundColor: '#0D1F17', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#0F2E1F', gap: 6 },
  adamTag: { fontSize: 11, color: '#0891B2', fontWeight: '700' },
  adamText: { fontSize: 13, color: '#9CA3AF', lineHeight: 20, fontStyle: 'italic' },

  // Sections
  section: { backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1F2937', gap: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  addTxBtn: { backgroundColor: '#1F2937', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  addTxText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },

  // Donut
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  legendText: { flex: 1 },
  legendName: { fontSize: 12, color: '#E5E7EB', fontWeight: '600' },
  legendVal: { fontSize: 11, color: '#6B7280' },
  moreCategories: { fontSize: 11, color: '#4B5563', marginTop: 4 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  filterChipActive: { backgroundColor: '#374151', borderColor: '#6B7280' },
  filterText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  filterTextActive: { color: '#F9FAFB' },

  // Show more
  showMoreBtn: { paddingVertical: 12, alignItems: 'center' },
  showMoreText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#374151', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#F9FAFB', marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#1F2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  typeBtnExpense: { backgroundColor: '#1E0F0F', borderColor: '#EF4444' },
  typeBtnIncome: { backgroundColor: '#0F1E16', borderColor: '#059669' },
  typeBtnText: { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  input: { backgroundColor: '#1F2937', borderRadius: 12, padding: 14, fontSize: 15, color: '#F9FAFB', marginBottom: 12, borderWidth: 1, borderColor: '#374151' },
  fieldLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  catRow: { flexDirection: 'row', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  catText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
