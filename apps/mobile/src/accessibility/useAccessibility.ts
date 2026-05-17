/**
 * Youli — useAccessibility hook (re-export)
 * Também exporta utilitários de estilo acessível.
 */

export { useAccessibility } from './AccessibilityProvider';
export type { AccessibilitySettings, FontScale } from './AccessibilityProvider';

import type { ViewStyle } from 'react-native';

/**
 * Garante tap target mínimo de 48×48pt (WCAG 2.5.5).
 * Adicione ao style de qualquer TouchableOpacity pequeno.
 */
export const minTapTarget: ViewStyle = {
  minWidth: 48,
  minHeight: 48,
};

/**
 * Aplica alto contraste: sem border radius suavizado, fundo preto, sem sombra.
 */
export function highContrastOverride(enabled: boolean) {
  if (!enabled) return {};
  return {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
    borderWidth: 1,
  } as ViewStyle;
}

/**
 * Retorna cor de texto acessível baseada no contraste exigido.
 * Ratio mínimo WCAG AA: 4.5:1 para texto normal, 3:1 para texto grande.
 */
export function accessibleTextColor(
  highContrast: boolean,
  defaultColor: string,
): string {
  return highContrast ? '#FFFFFF' : defaultColor;
}
