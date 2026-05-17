import React, { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontWeight, fontSize, spacing } from '../theme/tokens';
import { useAccessibility } from '../accessibility/useAccessibility';
import { accessibleColors } from '../theme/accessibleTheme';

interface FullScrollLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  onRefresh?: () => Promise<void>;
  rightAction?: ReactNode;
  paddingBottom?: number;
}

export function FullScrollLayout({
  title, subtitle, children, onRefresh, rightAction, paddingBottom = 100,
}: FullScrollLayoutProps) {
  const insets = useSafeAreaInsets();
  const { highContrast, fontMultiplier, reduceMotion } = useAccessibility();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  };

  const bgColor = highContrast ? accessibleColors.bg : colors.bg;
  const titleColor = highContrast ? accessibleColors.textPrimary : colors.text;
  const subtitleColor = highContrast ? accessibleColors.textSecondary : colors.muted;

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top, backgroundColor: bgColor }]}
      contentContainerStyle={[styles.content, { paddingBottom }]}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh
        ? <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={highContrast ? accessibleColors.primary : colors.primary}
          />
        : undefined}
      // Accessibility: announce page title to screen readers
      accessibilityLabel={title}
    >
      {(title || rightAction) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && (
              <Text
                style={[styles.title, { color: titleColor, fontSize: fontSize.xxl * fontMultiplier }]}
                accessibilityRole="header"
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={[styles.subtitle, { color: subtitleColor, fontSize: fontSize.sm * fontMultiplier }]}>
                {subtitle}
              </Text>
            )}
          </View>
          {rightAction}
        </View>
      )}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.sm,
  },
  headerText: { flex: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
});
