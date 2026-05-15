import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StoreProvider } from '../src/store';
import { ErrorBoundary } from '../src/atoms/ErrorBoundary';
import { ToastProvider } from '../src/atoms/Toast';
import { OfflineBanner } from '../src/atoms/OfflineBanner';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';

/** Wrapper interno para usar hook dentro da árvore (SafeAreaProvider já disponível) */
function AppShell() {
  const { status } = useNetworkStatus();

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
        <Stack.Screen name="vision" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      {/* Banner de offline — sobrepõe tudo quando sem conexão */}
      <OfflineBanner status={status} />
    </>
  );
}

export default function RootLayout() {
  const GHRoot = GestureHandlerRootView as any;
  return (
    <ErrorBoundary>
      <GHRoot style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StoreProvider>
            <ToastProvider>
              <AppShell />
            </ToastProvider>
          </StoreProvider>
        </SafeAreaProvider>
      </GHRoot>
    </ErrorBoundary>
  );
}
