/**
 * Vision Board — objetivos de vida 1 / 3 / 5 anos
 * Acessível via Perfil → "Visão de Futuro"
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useVisionBoard, Horizon, VisionItem } from '../src/hooks/useVisionBoard';

const HORIZON_CONFIG: Record<Horizon, { label: string; color: string; desc: string; icon: string }> = {
  '1y': { label: '1 Ano',   color: '#059669', desc: 'Conquistas concretas e mensuráveis',     icon: '🎯' },
  '3y': { label: '3 Anos',  color: '#D97706', desc: 'Transformações significativas de vida',   icon: '🚀' },
  '5y': { label: '5 Anos',  color: '#7C3AED', desc: 'Legado e visão de longo prazo',           icon: '👑' },
};

const AREA_PRESETS = ['Carreira', 'Financeiro', 'Saúde', 'Relacionamentos', 'Aprendizado', 'Impacto', 'Legado', 'Criatividade'];
const ICON_PRESETS = ['🚀','💰','💪','❤️','📚','🌍','👑','🎨','🔬','🏠','✈️','🎯'];
const COLOR_PRESETS = ['#7C3AED','#059669','#D97706','#DC2626','#0EA5E9','#EC4899','#6366F1','#14B8A6'];

function VisionCard({ item, onDelete, index }: { item: VisionItem; onDelete: (id: string) => void; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60)} style={[styles.card, { borderLeftColor: item.color }]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardIcon}>{item.icon}</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardArea}>{item.area}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function AddModal({ visible, onClose, onAdd, defaultHorizon }: {
  visible: boolean; onClose: () => void;
  onAdd: (item: any) => void; defaultHorizon: Horizon;
}) {
  const [horizon, setHorizon] = useState<Horizon>(defaultHorizon);
  const [area, setArea] = useState('Carreira');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [icon, setIcon] = useState('🚀');
  const [color, setColor] = useState('#7C3AED');

  function handleAdd() {
    if (!title.trim()) return;
    onAdd({ horizon, area, title: title.trim(), description: desc.trim(), icon, color });
    setTitle(''); setDesc(''); setIcon('🚀'); setColor('#7C3AED');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova Visão</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>

          {/* Horizonte */}
          <Text style={styles.fieldLabel}>Horizonte temporal</Text>
          <View style={styles.horizonRow}>
            {(['1y','3y','5y'] as Horizon[]).map(h => (
              <TouchableOpacity key={h} onPress={() => setHorizon(h)}
                style={[styles.horizonChip, horizon === h && { backgroundColor: HORIZON_CONFIG[h].color + '33', borderColor: HORIZON_CONFIG[h].color }]}>
                <Text style={[styles.horizonChipText, horizon === h && { color: HORIZON_CONFIG[h].color }]}>
                  {HORIZON_CONFIG[h].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Área */}
          <Text style={styles.fieldLabel}>Área de vida</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.areaRow}>
              {AREA_PRESETS.map(a => (
                <TouchableOpacity key={a} onPress={() => setArea(a)}
                  style={[styles.areaChip, area === a && styles.areaChipActive]}>
                  <Text style={[styles.areaChipText, area === a && styles.areaChipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Icon */}
          <Text style={styles.fieldLabel}>Ícone</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.iconRow}>
              {ICON_PRESETS.map(ic => (
                <TouchableOpacity key={ic} onPress={() => setIcon(ic)}
                  style={[styles.iconChip, icon === ic && styles.iconChipActive]}>
                  <Text style={styles.iconChipText}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Cor */}
          <View style={styles.colorRow}>
            {COLOR_PRESETS.map(c => (
              <TouchableOpacity key={c} onPress={() => setColor(c)}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]} />
            ))}
          </View>

          {/* Título */}
          <TextInput style={styles.input} placeholder="Minha visão para daqui X anos..." placeholderTextColor="#4B5563"
            value={title} onChangeText={setTitle} maxLength={100} autoFocus />
          <TextInput style={[styles.input, { height: 70 }]} placeholder="Mais detalhes (opcional)..."
            placeholderTextColor="#4B5563" value={desc} onChangeText={setDesc} multiline maxLength={200} />

          <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, !title.trim() && { opacity: 0.4 }]} disabled={!title.trim()}>
            <Text style={styles.addBtnText}>Adicionar visão</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function VisionScreen() {
  const insets = useSafeAreaInsets();
  const { items, addItem, deleteItem, byHorizon } = useVisionBoard();
  const [showAdd, setShowAdd] = useState(false);
  const [defaultHorizon, setDefaultHorizon] = useState<Horizon>('1y');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔭 Visão de Futuro</Text>
        <TouchableOpacity onPress={() => { setDefaultHorizon('1y'); setShowAdd(true); }} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ Nova</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {(['1y','3y','5y'] as Horizon[]).map(h => {
          const cfg = HORIZON_CONFIG[h];
          const hItems = byHorizon(h);
          return (
            <View key={h} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{cfg.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={styles.sectionDesc}>{cfg.desc}</Text>
                </View>
                <TouchableOpacity onPress={() => { setDefaultHorizon(h); setShowAdd(true); }} style={[styles.sectionAdd, { borderColor: cfg.color }]}>
                  <Text style={[styles.sectionAddText, { color: cfg.color }]}>+</Text>
                </TouchableOpacity>
              </View>

              {hItems.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>Nenhuma visão para {cfg.label.toLowerCase()}. Adicione uma!</Text>
                </View>
              ) : (
                hItems.map((item, i) => (
                  <VisionCard key={item.id} item={item} onDelete={deleteItem} index={i} />
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      <AddModal visible={showAdd} onClose={() => setShowAdd(false)} onAdd={addItem} defaultHorizon={defaultHorizon} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#111827' },
  backBtn: { paddingRight: 8 },
  backBtnText: { fontSize: 14, color: '#7C3AED', fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#F9FAFB' },
  newBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  scroll: { padding: 20, gap: 28 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { fontSize: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionDesc: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  sectionAdd: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sectionAddText: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  emptySection: { backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F2937', borderStyle: 'dashed' },
  emptySectionText: { fontSize: 13, color: '#4B5563', textAlign: 'center' },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderWidth: 1, borderColor: '#1F2937' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardIcon: { fontSize: 24 },
  cardBody: { flex: 1, gap: 3 },
  cardArea: { fontSize: 11, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  cardDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 14, color: '#374151' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  modalSheet: { backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: '#1F2937' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#F9FAFB' },
  modalClose: { fontSize: 18, color: '#6B7280', padding: 4 },
  fieldLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  horizonRow: { flexDirection: 'row', gap: 8 },
  horizonChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#1F2937', alignItems: 'center', backgroundColor: '#111827' },
  horizonChipText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  areaRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  areaChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937' },
  areaChipActive: { backgroundColor: '#1E0D3B', borderColor: '#7C3AED' },
  areaChipText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  areaChipTextActive: { color: '#A78BFA' },
  iconRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  iconChip: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  iconChipActive: { borderColor: '#7C3AED', backgroundColor: '#1E0D3B' },
  iconChipText: { fontSize: 18 },
  colorRow: { flexDirection: 'row', gap: 8 },
  colorDot: { width: 26, height: 26, borderRadius: 13 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  input: { backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 14, paddingVertical: 10, color: '#F9FAFB', fontSize: 14 },
  addBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
