/**
 * ErrorBoundary — captura erros de renderização em React Native
 * Exibe uma tela de fallback amigável em vez de travar o app
 */
import React, { Component, ReactNode, ErrorInfo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Fallback UI (componente funcional para poder usar hooks)
// ---------------------------------------------------------------------------
interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function FallbackScreen({ error, errorInfo, onReset }: FallbackProps) {
  // Safe-area manual pois não podemos usar hook dentro do ErrorBoundary (classe)
  // Usamos padding fixo como fallback seguro
  const isDev = __DEV__;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Algo deu errado</Text>
        <Text style={styles.subtitle}>
          Um erro inesperado aconteceu. Tente reiniciar a tela.
        </Text>

        <TouchableOpacity style={styles.button} onPress={onReset} activeOpacity={0.8}>
          <Text style={styles.buttonText}>🔄  Tentar novamente</Text>
        </TouchableOpacity>

        {isDev && error && (
          <ScrollView style={styles.debugBox} showsVerticalScrollIndicator>
            <Text style={styles.debugTitle}>DEBUG</Text>
            <Text style={styles.debugText}>{error.toString()}</Text>
            {errorInfo?.componentStack && (
              <Text style={styles.debugStack}>{errorInfo.componentStack}</Text>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ErrorBoundary class component
// ---------------------------------------------------------------------------
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Componente customizado de fallback (opcional) */
  fallback?: (props: FallbackProps) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Em produção, aqui enviaria para Sentry/Bugsnag
    if (__DEV__) {
      console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const fallbackProps: FallbackProps = {
        error:     this.state.error,
        errorInfo: this.state.errorInfo,
        onReset:   this.handleReset,
      };

      if (this.props.fallback) {
        return this.props.fallback(fallbackProps);
      }

      return <FallbackScreen {...fallbackProps} />;
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '700', color: '#F9FAFB', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
  },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  debugBox: {
    width: '100%',
    maxHeight: 200,
    marginTop: 16,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
  },
  debugTitle: { fontSize: 10, color: '#7C3AED', fontWeight: '700', marginBottom: 4 },
  debugText: { fontSize: 11, color: '#EF4444', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  debugStack: { fontSize: 9, color: '#6B7280', marginTop: 8, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
});
