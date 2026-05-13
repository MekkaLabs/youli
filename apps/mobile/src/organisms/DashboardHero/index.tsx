import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Button } from '../../atoms/Button';
import { ProgressRing } from '../../atoms/ProgressRing';
import { colors, fontWeight, fontSize, radii, spacing, shadows } from '../../theme/tokens';

interface DashboardHeroProps {
  dayFocus: string;
  progress: number;
  energy: string;
  onConnectBank?: () => void;
  onOpenCopilot?: () => void;
}

export function DashboardHero({ dayFocus, progress, energy, onConnectBank, onOpenCopilot }: DashboardHeroProps) {
  const energyEmoji = energy === 'high' ? '⚡' : energy === 'medium' ? '🔋' : '😴';

  return (
    <Animated.View entering={FadeInUp.springify()} style={[styles.card, shadows.lg]}>
      {/* Badge row */}
      <View style={styles.badges}>
        <View style={styles.badge}><Text style={styles.badgeText}>Open Finance ativo</Text></View>
        <View style={[styles.badge, styles.energyBadge]}>
          <Text style={styles.badgeText}>{energyEmoji} Energia {energy}</Text>
        </View>
      </View>

      {/* Hero content */}
      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={styles.headline}>Seus dados.{'\n'}Seu controle.</Text>
          <Text style={styles.subline} numberOfLines={3}>{dayFocus}</Text>
        </View>
        <ProgressRing value={progress} size={80} color={colors.accentGreen} label="hoje" />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button label="Copilot" onPress={onOpenCopilot} variant="secondary" size="sm" icon={<Text>🤖</Text>} />
        <Button label="+ Banco" onPress={onConnectBank} variant="ghost" size="sm"
          style={{ borderColor: 'rgba(255,255,255,0.3)' }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl, padding: spacing.xl,
    backgroundColor: colors.primary,
  },
  badges: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radii.full,
    paddingHorizontal: spacing.md, paddingVertical: 4,
  },
  energyBadge: { backgroundColor: 'rgba(134,239,172,0.2)' },
  badgeText: { color: colors.inverse, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  textBlock: { flex: 1 },
  headline: { color: colors.inverse, fontSize: fontSize.xxxl, fontWeight: fontWeight.black, lineHeight: 38 },
  subline: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.base, marginTop: spacing.sm, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
