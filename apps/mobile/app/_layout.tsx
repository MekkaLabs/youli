import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StoreProvider } from '../src/store';
import { ErrorBoundary } from '../src/atoms/ErrorBoundary';
import { ToastProvider } from '../src/atoms/Toast';
import { OfflineBanner } from '../src/atoms/OfflineBanner';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { I18nProvider, useI18n } from '../src/i18n/I18nProvider';
import { AccessibilityProvider } from '../src/accessibility/AccessibilityProvider';
import { ThemeProvider, useTheme } from '../src/providers/ThemeProvider';
import { useNotifications } from '../src/hooks/useNotifications';
import { AuthProvider } from '../src/hooks/useAuth';
import { installAuthInterceptor, loadTokenFromStorage } from '../src/services/auth-token';

// Instala o interceptor global de fetch e hidrata o token ANTES de qualquer
// render — garante que toda request à API já saia com Authorization: Bearer.
installAuthInterceptor();
void loadTokenFromStorage();

/** Shell principal do app — usa hooks dentro da árvore de providers */
function AppShell() {
  const { status } = useNetworkStatus();
  const { language } = useI18n();
  const { isDark } = useTheme();
  useNotifications(language);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        {/* Tela de login — pública, sem guard */}
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />

        {/* Telas protegidas */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
        <Stack.Screen name="vision" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="life-score" options={{ headerShown: false }} />
        <Stack.Screen name="evolution-history" options={{ headerShown: false }} />
        <Stack.Screen name="sweci-settings" options={{ headerShown: false }} />
        <Stack.Screen name="integrations" options={{ headerShown: false }} />
        <Stack.Screen name="accessibility-settings" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
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
          <AuthProvider>
            <StoreProvider>
              <ThemeProvider>
                <AccessibilityProvider>
                  <I18nProvider>
                    <ToastProvider>
                      <AppShell />
                    </ToastProvider>
                  </I18nProvider>
                </AccessibilityProvider>
              </ThemeProvider>
            </StoreProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GHRoot>
    </ErrorBoundary>
  );
}
