/**
 * Youli — I18nProvider
 * Wrap o app com este provider para acesso a traduções em toda a árvore.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  type SupportedLanguage,
  type TranslationKey,
  type TranslationParams,
  detectDeviceLanguage,
  loadSavedLanguage,
  saveLanguage,
  translate,
} from './index';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface I18nContextValue {
  /** Current active language */
  language: SupportedLanguage;
  /** Change language and persist to AsyncStorage */
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  /** Translate a key with optional interpolation params */
  t: (key: TranslationKey | string, params?: TranslationParams) => string;
  /** Whether i18n has finished loading the saved preference */
  isReady: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface I18nProviderProps {
  children: React.ReactNode;
  /** Override initial language (useful for testing) */
  initialLanguage?: SupportedLanguage;
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(
    initialLanguage ?? detectDeviceLanguage(),
  );
  const [isReady, setIsReady] = useState(false);

  // Load persisted language on mount
  useEffect(() => {
    loadSavedLanguage().then((saved) => {
      if (saved) setLanguageState(saved);
      setIsReady(true);
    });
  }, []);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    setLanguageState(lang);
    await saveLanguage(lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey | string, params?: TranslationParams) =>
      translate(language, key, params),
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t, isReady }),
    [language, setLanguage, t, isReady],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Use inside any component wrapped by I18nProvider */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
