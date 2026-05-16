import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';
import { pressScaleIn, pressScaleOut } from '../../theme/motion';

export type TabKey =
  | 'dashboard' | 'habitos' | 'copilot' | 'metas' | 'mais'
  | 'tarefas' | 'insights' | 'financeiro' | 'calendario' | 'fitness' | 'simular' | 'perfil' | 'focus';

const MAIN_TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'dashboard', icon: '⚡', label: 'Início'  },
  { key: 'habitos',   icon: '🔥', label: 'Hábitos' },
  { key: 'copilot',   icon: '🤖', label: 'Copilot' },
  { key: 'metas',     icon: '🎯', label: 'Metas'   },
  { key: 'mais',      icon: '☰',  label: 'Mais'    },
];

const MAIS_ITEMS: { key: TabKey; icon: string; label: string; color: string }[] = [
  { key: 'tarefas',    icon: '✅', label: 'Tarefas',    color: '#6366F1' },
  { key: 'insights',   icon: '💡', label: 'Insights',   color: '#F59E0B' },
  { key: 'financeiro', icon: '💰', label: 'Financeiro', color: '#10B981' },
  { key: 'calendario', icon: '📅', label: 'Calendário', color: '#3B82F6' },
  { key: 'fitness',    icon: '💪', label: 'Fitness',    color: '#EF4444' },
  { key: 'simular',    icon: '🔮', label: 'Simular',    color: '#8B5CF6' },
  { key: 'focus',      icon: '🧘', label: 'Foco',       color: '#EC4899' },
  { key: 'perfil',     icon: '👤', label: 'Perfil',     color: '#64748B' },
];

interface BottomNavProps {
  active: TabKey;
  onPress: (tab: TabKey) => void;
}

function NavItem({ tab, isActive, onPress, isCopilot }: {
  tab: typeof MAIN_TABS[0]; isActive: boolean; onPress: () => void; isCopilot: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = pressScaleIn(0.95);
    setTimeout(() => { scale.value = pressScaleOut(1); }, 80);
    onPress();
  };

  if (isCopilot) {
    return (
      <Pressable onPress={handlePress} style={styles.copilotWrap}>
        <Animated.View style={[styles.copilotBtn, shadows.md, animStyle]}>
          <Text style={styles.copilotIcon}>{tab.icon}</Text>
        </Animated.View>
        <Text style={styles.copilotLabel}>{tab.label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} style={styles.item}>
      <Animated.View style={[styles.iconWrap, isActive && styles.iconActive, animStyle]}>
        <Text style={[styles.icon, isActive && styles.iconActiveText]}>{tab.icon}</Text>
      </Animated.View>
      <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

export function BottomNav({ active, onPress }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const [maisOpen, setMaisOpen] = useState(false);

  const isSubTab = MAIS_ITEMS.some(i => i.key === active);
  const visualActive: TabKey = isSubTab ? 'mais' : active;

  const handleTabPress = (tab: TabKey) => {
    if (tab === 'mais') { setMaisOpen(true); return; }
    onPress(tab);
  };

  const handleMaisItem = (tab: TabKey) => {
    setMaisOpen(false);
    onPress(tab);
  };

  return (
    <>
      <View style={[styles.container, { paddingBottom: insets.bottom + spacing.xs }, shadows.lg]}>
        {MAIN_TABS.map(tab => (
          <NavItem
            key={tab.key}
            tab={tab}
            isActive={visualActive === tab.key}
            onPress={() => handleTabPress(tab.key)}
            isCopilot={tab.key === 'copilot'}
          />
        ))}
      </View>

      <Modal visible={maisOpen} transparent animationType="slide" onRequestClose={() => setMaisOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMaisOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Todas as Áreas</Text>
            <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
              {MAIS_ITEMS.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.card, active === item.key && styles.cardActive]}
                  onPress={() => handleMaisItem(item.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.cardIcon, { backgroundColor: item.color + '22' }]}>
                    <Text style={styles.cardEmoji}>{item.icon}</Text>
                  </View>
                  <Text style={[styles.cardLabel, active === item.key && { color: item.color }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.card,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, paddingBottom: spacing.xs },
  iconWrap: { width: 40, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.accentSoft },
  icon: { fontSize: 18 },
  iconActiveText: {},
  label: { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.muted },
  labelActive: { color: colors.primary, fontWeight: fontWeight.bold },

  copilotWrap: { flex: 1, alignItems: 'center', gap: 2, paddingBottom: spacing.xs, marginTop: -spacing.lg },
  copilotBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  copilotIcon: { fontSize: 24 },
  copilotLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary },

  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm, paddingHorizontal: spacing.lg,
    maxHeight: '60%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    color: colors.text, marginBottom: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.md },
  card: {
    width: '22%', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  cardActive: { borderColor: colors.primary },
  cardIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 22 },
  cardLabel: { fontSize: 11, color: colors.textMuted, fontWeight: fontWeight.medium, textAlign: 'center' },
});
