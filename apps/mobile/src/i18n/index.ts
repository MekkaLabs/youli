/**
 * Youli — Custom i18n Engine (zero-dependency)
 * Suporta: PT-BR, EN, ES, ZH
 * Detecção automática via Intl.DateTimeFormat + fallback PT-BR
 */

import ptBR from './locales/pt-BR';
import en from './locales/en';
import es from './locales/es';
import zh from './locales/zh';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupportedLanguage = 'pt-BR' | 'en' | 'es' | 'zh';

export type TranslationParams = Record<string, string | number>;

// Extrai todos os caminhos possíveis do dicionário PT-BR (tipo base)
type Leaves<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? Leaves<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
        : never;
    }[keyof T]
  : Prefix;

export type TranslationKey = Leaves<typeof ptBR>;

// ─── Dictionaries ─────────────────────────────────────────────────────────────

 
const dictionaries: Record<SupportedLanguage, any> = {
  'pt-BR': ptBR,
  en,
  es,
  zh,
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['pt-BR', 'en', 'es', 'zh'];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'pt-BR': 'Português (BR)',
  en: 'English',
  es: 'Español',
  zh: '中文',
};

// ─── Locale Detection ─────────────────────────────────────────────────────────

function normalizeLocale(raw: string): SupportedLanguage {
  const lower = raw.toLowerCase();

  // Portuguese
  if (lower.startsWith('pt')) return 'pt-BR';

  // Chinese (Simplified or Traditional)
  if (lower.startsWith('zh')) return 'zh';

  // Spanish
  if (lower.startsWith('es')) return 'es';

  // English fallback
  if (lower.startsWith('en')) return 'en';

  // Default
  return 'pt-BR';
}

export function detectDeviceLanguage(): SupportedLanguage {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return normalizeLocale(locale);
  } catch {
    return 'pt-BR';
  }
}

// ─── Translation Engine ───────────────────────────────────────────────────────

/**
 * Resolve a dot-notation key against a nested dictionary object.
 * e.g. 'app.loading' → dictionary.app.loading
 */
function resolvePath(obj: Record<string, unknown>, path: string): string | undefined {
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (typeof current === 'string') return current;
  return undefined;
}

/**
 * Substitui {{variavel}} pelos valores em params.
 */
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

/**
 * Função de tradução principal.
 * @param lang  Idioma atual
 * @param key   Chave dot-notation (ex: 'app.loading')
 * @param params Variáveis de interpolação
 */
export function translate(
  lang: SupportedLanguage,
  key: string,
  params?: TranslationParams,
): string {
  const dict = dictionaries[lang] as unknown as Record<string, unknown>;
  const fallbackDict = dictionaries['pt-BR'] as unknown as Record<string, unknown>;

  // Try target language first, fall back to PT-BR, then show key
  const raw =
    resolvePath(dict, key) ??
    resolvePath(fallbackDict, key) ??
    key;

  return interpolate(raw, params);
}

// ─── AsyncStorage Persistence ─────────────────────────────────────────────────

const STORAGE_KEY = '@youli/language';

export async function loadSavedLanguage(): Promise<SupportedLanguage | null> {
  try {
    // Lazy import to avoid bundling issues in tests
    const { default: AsyncStorage } = await import(
      '@react-native-async-storage/async-storage'
    );
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
      return saved as SupportedLanguage;
    }
  } catch {
    // AsyncStorage not available (tests, SSR)
  }
  return null;
}

export async function saveLanguage(lang: SupportedLanguage): Promise<void> {
  try {
    const { default: AsyncStorage } = await import(
      '@react-native-async-storage/async-storage'
    );
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // noop
  }
}
