/**
 * Youli — useI18n hook (re-export for convenience)
 * Import from here to keep imports clean throughout the app.
 *
 * Usage:
 *   const { t, language, setLanguage } = useI18n();
 *   <Text>{t('app.loading')}</Text>
 *   <Text>{t('a11y.lifeHealthScore', { score: '87' })}</Text>
 */

export { useI18n } from '../i18n/I18nProvider';
export type { SupportedLanguage, TranslationKey, TranslationParams } from '../i18n/index';
export { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '../i18n/index';
