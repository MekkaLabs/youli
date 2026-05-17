/**
 * Youli — Tela de Configurações de Acessibilidade
 * Acessível via Perfil → Configurações de Acessibilidade
 * Ou via botão flutuante para usuários com necessidades especiais.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAccessibility } from '../src/accessibility/useAccessibility';
import { useI18n } from '../src/hooks/useI18n';
import type { FontScale } from '../src/accessibility/AccessibilityProvider';

export default function AccessibilitySettingsScreen() {
  const { t } = useI18n();
  const {
    highContrast, fontScale, reduceMotion, cognitiveMode,
    enforceMinTapTarget, update, anyEnabled,
  } = useAccessibility();

  const FONT_OPTIONS: { value: FontScale; label: string; preview: string }[] = [
    { value: 'normal', label: t('a11y.fontSize') + ' padrão', preview: 'Aa' },
    { value: 'large', label: t('a11y.fontSize') + ' grande', preview: 'Aa' },
    { value: 'xlarge', label: t('a11y.fontSize') + ' extra', preview: 'Aa' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>♿ Acessibilidade</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Visual */}
        <Text style={styles.sectionTitle}>👁️ Visual</Text>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>{t('a11y.highContrast')}</Text>
            <Text style={styles.rowDesc}>Fundo preto, texto branco, sem transparências</Text>
          </View>
          <Switch
            value={highContrast}
            onValueChange={(v) => update('highContrast', v)}
            trackColor={{ true: '#7C3AED', false: '#1F2937' }}
            thumbColor="#fff"
            accessibilityLabel={t('a11y.highContrast')}
          />
        </View>

        <Text style={styles.subLabel}>{t('a11y.fontSize')}</Text>
        <View style={styles.fontRow}>
          {FONT_OPTIONS.map((opt) => {
            const selected = fontScale === opt.value;
            const previewSize = opt.value === 'normal' ? 18 : opt.value === 'large' ? 22 : 28;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.fontCard, selected && styles.fontCardSelected]}
                onPress={() => update('fontScale', opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={opt.label}
              >
                <Text style={[styles.fontPreview, { fontSize: previewSize }]}>{opt.preview}</Text>
                <Text style={[styles.fontLabel, selected && styles.fontLabelSelected]}>
                  {opt.value === 'normal' ? 'Padrão' : opt.value === 'large' ? 'Grande' : 'Extra'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Motor */}
        <Text style={styles.sectionTitle}>🖐️ Motor</Text>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>{t('a11y.reduceMotion')}</Text>
            <Text style={styles.rowDesc}>Remove animações e transições — ideal para epilepsia</Text>
          </View>
          <Switch
            value={reduceMotion}
            onValueChange={(v) => update('reduceMotion', v)}
            trackColor={{ true: '#7C3AED', false: '#1F2937' }}
            thumbColor="#fff"
            accessibilityLabel={t('a11y.reduceMotion')}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Áreas de toque ampliadas</Text>
            <Text style={styles.rowDesc}>Mínimo 48×48pt em todos os botões (WCAG 2.5.5)</Text>
          </View>
          <Switch
            value={enforceMinTapTarget}
            onValueChange={(v) => update('enforceMinTapTarget', v)}
            trackColor={{ true: '#7C3AED', false: '#1F2937' }}
            thumbColor="#fff"
            accessibilityLabel="Áreas de toque ampliadas"
          />
        </View>

        {/* Cognitivo */}
        <Text style={styles.sectionTitle}>🧠 Cognitivo</Text>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Modo simplificado</Text>
            <Text style={styles.rowDesc}>Interface com menos elementos, linguagem mais clara e direta</Text>
          </View>
          <Switch
            value={cognitiveMode}
            onValueChange={(v) => update('cognitiveMode', v)}
            trackColor={{ true: '#7C3AED', false: '#1F2937' }}
            thumbColor="#fff"
            accessibilityLabel="Modo simplificado"
          />
        </View>

        {/* Status badge */}
        {anyEnabled && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>✅ Modo acessível ativo</Text>
          </View>
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 Compatibilidade</Text>
          <Text style={styles.infoText}>
            O Youli é compatível com VoiceOver (iOS) e TalkBack (Android).
            Todos os elementos interativos possuem rótulos descritivos,
            papéis semânticos e dicas de ação.{'\n\n'}
            Para sugestões de acessibilidade, escreva para: acessibilidade@youli.app
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#030712' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#111827',
  },
  backBtn: { minWidth: 48, minHeight: 48, justifyContent: 'center' },
  backText: { fontSize: 15, color: '#7C3AED', fontWeight: '700' },
  placeholder: { width: 48 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#F9FAFB' },
  content: { padding: 20, gap: 12, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8,
  },
  subLabel: {
    fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginTop: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111827', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1F2937', gap: 12,
  },
  rowInfo: { flex: 1, gap: 3 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  rowDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  fontRow: { flexDirection: 'row', gap: 10 },
  fontCard: {
    flex: 1, backgroundColor: '#111827', borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#1F2937',
    minHeight: 80, justifyContent: 'center',
  },
  fontCardSelected: { borderColor: '#7C3AED', backgroundColor: '#1A0A3A' },
  fontPreview: { fontWeight: '900', color: '#F9FAFB' },
  fontLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  fontLabelSelected: { color: '#A78BFA' },
  statusBadge: {
    backgroundColor: '#0D2010', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#065F46', alignItems: 'center',
  },
  statusText: { fontSize: 14, color: '#6EE7B7', fontWeight: '700' },
  infoCard: {
    backgroundColor: '#0B1220', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1F2937', gap: 8, marginTop: 8,
  },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB' },
  infoText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
});
