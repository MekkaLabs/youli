import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';

export type TabKey = 'dashboard' | 'tarefas' | 'copilot' | 'habitos' | 'perfil';

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'dashboard', icon: '⚡', label: 'Início' },
  { key: 'tarefas',   icon: '✅', label: 'Tarefas' },
  { key: 'copilot',   icon: '🤖', label: 'Copilot' },
  { key: 'habitos',   icon: '🔥', label: 'Hábitos' },
  { key: 'perfil',    icon: '👤', label: 'Perfil' },
];

interface BottomNavProps {
  active: TabKey;
  onPress: (tab: TabKey) => void;
}

function NavItem({ tab, isActive, onPress, isCopilot }: {
  tab: typeof TABS[0]; isActive: boolean; onPress: () => void; isCopilot: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.85, { damping: 10 });
    setTimeout(() => { scale.value = withSpring(1, { damping: 12 }); }, 120);
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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.xs }, shadows.lg]}>
      {TABS.map(tab => (
        <NavItem
          key={tab.key}
          tab={tab}
          isActive={active === tab.key}
          onPress={() => onPress(tab.key)}
          isCopilot={tab.key === 'copilot'}
        />
      ))}
    </View>
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
  item: { flex: 1, alignItems: 'center', gap: 3, paddingBottom: spacing.xs },
  iconWrap: { width: 40, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.accentSoft },
  icon: { fontSize: 20 },
  iconActiveText: {},
  label: { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.muted },
  labelActive: { color: colors.primary, fontWeight: fontWeight.bold },

  // Copilot (central, grande)
  copilotWrap: { flex: 1, alignItems: 'center', gap: 3, paddingBottom: spacing.xs, marginTop: -spacing.lg },
  copilotBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  copilotIcon: { fontSize: 24 },
  copilotLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary },
});
