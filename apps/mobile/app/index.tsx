import { Redirect } from 'expo-router';
import { useAuthContext } from '../src/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function Home() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080812', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={'/login' as any} />;
  }

  return <Redirect href="/(tabs)/dashboard" />;
}
