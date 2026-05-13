import { Link } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { Screen } from '../src/components/Screen';
import { colors } from '../src/theme/tokens';

const routes = [
  ['onboarding', '/onboarding'],
  ['perfil', '/perfil'],
  ['dashboard', '/dashboard'],
  ['tarefas', '/tarefas'],
  ['metas', '/metas'],
  ['hábitos', '/habitos'],
  ['insights', '/insights'],
  ['calendário', '/calendario']
] as const;

export default function Home() {
  return (
    <Screen title="YOULI">
      <Text style={styles.subtitle}>Personal Cognitive Operating System</Text>
      <View style={styles.grid}>
        {routes.map(([label, href]) => (
          <Link key={href} href={href} style={styles.link}>{label}</Link>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.muted, marginBottom: 16 },
  grid: { gap: 10 },
  link: { color: colors.accent, fontSize: 18, fontWeight: '600' }
});
