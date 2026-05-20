/**
 * Youli — AccessibilityProvider
 * Suporte: visual (alto contraste, fonte grande), motor (tap targets 48pt),
 * cognitivo (modo simplificado), auditivo (sem audio-only info).
 *
 * Lê preferências do sistema via AccessibilityInfo do React Native,
 * permite override manual persistido via AsyncStorage.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { logWarn } from '../services/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FontScale = 'normal' | 'large' | 'xlarge';

export interface AccessibilitySettings {
  /** Alto contraste (fundo preto puro, texto branco, sem transparências) */
  highContrast: boolean;
  /** Escala da fonte: normal (1), large (1.2), xlarge (1.4) */
  fontScale: FontScale;
  /** Reduzir animações (0ms para quem tem epilepsia ou sensibilidade) */
  reduceMotion: boolean;
  /** Modo cognitivo: layout simplificado, mensagens mais curtas */
  cognitiveMode: boolean;
  /** Tap targets mínimos garantidos (48×48pt — WCAG 2.5.5) */
  enforceMinTapTarget: boolean;
}

interface AccessibilityContextValue extends AccessibilitySettings {
  /** Multiplier de fonte para usar em fontSize: baseFontSize * fontMultiplier */
  fontMultiplier: number;
  /** Duração de animação (0 se reduceMotion ativo) */
  animDuration: (base: number) => number;
  /** Atualizar uma configuração específica */
  update: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => Promise<void>;
  /** Se qualquer feature de acessibilidade está ativa */
  anyEnabled: boolean;
}

const DEFAULTS: AccessibilitySettings = {
  highContrast: false,
  fontScale: 'normal',
  reduceMotion: false,
  cognitiveMode: false,
  enforceMinTapTarget: true, // sempre ligado por padrão
};

const FONT_MULTIPLIERS: Record<FontScale, number> = {
  normal: 1,
  large: 1.2,
  xlarge: 1.4,
};

const STORAGE_KEY = '@youli/accessibility';

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULTS);

  // 1. Detect OS-level preferences on mount
  useEffect(() => {
    Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isBoldTextEnabled().catch(() => false),
      AccessibilityInfo.isGrayscaleEnabled().catch(() => false),
    ]).then(([reduceMotion, boldText, grayscale]) => {
      // Load persisted user overrides first, then apply OS defaults only if not overridden
      loadPersisted().then((saved) => {
        setSettings((prev) => ({
          ...DEFAULTS,
          // OS signals
          reduceMotion: reduceMotion,
          highContrast: grayscale, // grayscale often indicates visual impairment
          fontScale: boldText ? 'large' : 'normal',
          // User overrides take precedence
          ...saved,
        }));
      });
    }).catch(() => {
      loadPersisted().then((saved) => {
        setSettings((prev) => ({ ...DEFAULTS, ...saved }));
      });
    });

    // Listen for OS changes at runtime
    const motionSub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setSettings((prev) => ({ ...prev, reduceMotion: enabled })),
    );

    return () => {
      motionSub.remove();
    };
  }, []);

  const update = useCallback(
    async <K extends keyof AccessibilitySettings>(
      key: K,
      value: AccessibilitySettings[K],
    ) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        persistSettings(next); // fire-and-forget
        return next;
      });
    },
    [],
  );

  const fontMultiplier = FONT_MULTIPLIERS[settings.fontScale];
  const animDuration = useCallback(
    (base: number) => (settings.reduceMotion ? 0 : base),
    [settings.reduceMotion],
  );
  const anyEnabled =
    settings.highContrast ||
    settings.fontScale !== 'normal' ||
    settings.reduceMotion ||
    settings.cognitiveMode;

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...settings,
      fontMultiplier,
      animDuration,
      update,
      anyEnabled,
    }),
    [settings, fontMultiplier, animDuration, update, anyEnabled],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be inside AccessibilityProvider');
  return ctx;
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function loadPersisted(): Promise<Partial<AccessibilitySettings>> {
  try {
    const { default: AsyncStorage } = await import(
      '@react-native-async-storage/async-storage'
    );
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<AccessibilitySettings>;
  } catch (e) {
    logWarn('AccessibilityProvider:loadPersisted', e);
  }
  return {};
}

async function persistSettings(s: AccessibilitySettings): Promise<void> {
  try {
    const { default: AsyncStorage } = await import(
      '@react-native-async-storage/async-storage'
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {
    logWarn('AccessibilityProvider:persistSettings', e);
  }
}
