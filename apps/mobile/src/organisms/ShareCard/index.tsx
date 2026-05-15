/**
 * ShareCard — compartilha progresso do dia via Share API nativo
 * Gera texto formatado com Life Score + stats + streak top
 */
import React, { useCallback } from 'react';
import { Share, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useHabits } from '../../hooks/useHabits';
import { useGoals } from '../../hooks/useGoals';
import { useLifePatterns } from '../../hooks/useLifePatterns';
import { useXP } from '../../hooks/useXP';

interface ShareCardProps {
  style?: object;
  compact?: boolean;
}

export function ShareProgressButton({ style, compact = false }: ShareCardProps) {
  const habits = useHabits();
  const goals = useGoals();
  const patterns = useLifePatterns();
  const { xpData } = useXP();

  const handleShare = useCallback(async () => {
    const habitsArr = (habits as any).habits ?? [];
    const goalsArr = (goals as any).goals ?? [];

    const topStreak = habitsArr.reduce(
      (max: any, h: any) => (!max || h.streak > max.streak ? h : max), null
    );
    const activeGoals = goalsArr.filter((g: any) => g.status === 'active');
    const avgGoalProgress = activeGoals.length
      ? Math.round(activeGoals.reduce((s: number, g: any) => s + (g.progress ?? 0), 0) / activeGoals.length)
      : 0;
    const habitsToday = habitsArr.filter((h: any) => h.completedToday).length;

    const lifeScore = patterns.lifeBalance ?? 70;
    const scoreEmoji = lifeScore >= 80 ? '🚀' : lifeScore >= 60 ? '💪' : lifeScore >= 40 ? '📈' : '🌱';

    const lines = [
      `${scoreEmoji} Life Score: ${lifeScore}/100 — Youli Personal OS`,
      '',
      `📊 Hoje (${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })})`,
      `• Hábitos: ${habitsToday}/${habitsArr.length} ✓`,
      `• Metas: ${avgGoalProgress}% progresso médio`,
      topStreak ? `• Streak: ${topStreak.streak} dias — "${topStreak.title}" 🔥` : '',
      `• Nível ${xpData.level} · ${xpData.total} XP total`,
      '',
      patterns.positiveCount > 0
        ? `✨ ${patterns.positiveCount} padrão${patterns.positiveCount !== 1 ? 'ões' : ''} positivo${patterns.positiveCount !== 1 ? 's' : ''} detectado${patterns.positiveCount !== 1 ? 's' : ''}`
        : '',
      '',
      '#Youli #LifeOS #PersonalDevelopment',
    ].filter(l => l !== undefined && l !== null).join('\n');

    try {
      await Share.share({
        message: lines,
        title: `Meu progresso — ${new Date().toLocaleDateString('pt-BR')}`,
      });
    } catch (e) {
      // usuário cancelou
    }
  }, [habits, goals, patterns, xpData]);

  if (compact) {
    return (
      <TouchableOpacity onPress={handleShare} style={[styles.compactBtn, style]}>
        <Text style={styles.compactBtnText}>↗ Compartilhar</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle}>Compartilhar progresso</Text>
        <Text style={styles.cardSub}>Life Score · hábitos · metas · XP</Text>
      </View>
      <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
        <Text style={styles.shareBtnText}>↗</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1F2937' },
  cardLeft: { gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB' },
  cardSub: { fontSize: 12, color: '#6B7280' },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  shareBtnText: { fontSize: 18, color: '#fff', fontWeight: '900' },
  compactBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1E0D3B', borderRadius: 8, borderWidth: 1, borderColor: '#7C3AED' },
  compactBtnText: { fontSize: 12, color: '#A78BFA', fontWeight: '700' },
});
