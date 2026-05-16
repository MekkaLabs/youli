import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const STORAGE_KEY = '@youli:last-agent-context';

type AreaKey =
  | 'dashboard'
  | 'tarefas'
  | 'habitos'
  | 'metas'
  | 'financeiro'
  | 'calendario'
  | 'fitness'
  | 'insights'
  | 'simular'
  | 'perfil';

export function useAgentAction(area: AreaKey, agentName: string) {
  const router = useRouter();

  return () => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ area, agentName, at: new Date().toISOString() }),
    ).catch(() => null);

    Alert.alert(
      `${agentName} • Assistente da área`,
      'Escolha a próxima ação rápida.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ver Insights', onPress: () => router.replace('/(tabs)/insights') },
        { text: 'Abrir Foco', onPress: () => router.replace('/(tabs)/focus') },
      ],
    );
  };
}
