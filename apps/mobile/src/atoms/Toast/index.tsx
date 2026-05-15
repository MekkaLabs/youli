/**
 * Toast — notificação temporária reutilizável
 * Uso: const { showToast, ToastContainer } = useToast()
 */
import React, {
  useState, useCallback, useRef, createContext, useContext, ReactNode,
} from 'react';
import { Animated, StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number; // ms (default 3000)
  action?: { label: string; onPress: () => void };
}

interface ToastItem extends ToastOptions {
  id: string;
}

// ---------------------------------------------------------------------------
// Toast visual
// ---------------------------------------------------------------------------
const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#0A1F0A', border: '#14532D', icon: '✅' },
  error:   { bg: '#1F0A0A', border: '#7F1D1D', icon: '❌' },
  warning: { bg: '#1F1500', border: '#78350F', icon: '⚠️' },
  info:    { bg: '#0A0F1F', border: '#1E3A5F', icon: 'ℹ️' },
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const colors = TOAST_COLORS[item.type ?? 'info'];

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(onDismiss);
    }, item.duration ?? 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: colors.bg, borderColor: colors.border },
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.icon}>{colors.icon}</Text>
      <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
      {item.action && (
        <TouchableOpacity onPress={item.action.onPress} hitSlop={8}>
          <Text style={styles.action}>{item.action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface ToastContextValue {
  showToast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((opts: ToastOptions) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev.slice(-2), { ...opts, id }]); // max 3
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={[styles.container, { top: insets.top + 12 }]}
        pointerEvents="box-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10000,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 10 },
    }),
  },
  icon: { fontSize: 16 },
  message: { flex: 1, fontSize: 13, color: '#F9FAFB', fontWeight: '500', lineHeight: 18 },
  action: { fontSize: 12, color: '#A78BFA', fontWeight: '700' },
});
