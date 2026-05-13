import { ReactNode } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  card: { flex: 1, borderRadius: 18, backgroundColor: colors.card, padding: 16 }
});
