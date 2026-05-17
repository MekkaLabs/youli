/**
 * Youli — Accessible Theme Overrides
 * Usado quando o usuário ativa alto contraste.
 * WCAG AA mínimo: 4.5:1 para texto normal, 3:1 para texto grande e UI.
 */

export const accessibleColors = {
  // Fundos (preto puro — máximo contraste)
  bg: '#000000',
  bgCard: '#0A0A0A',
  bgElevated: '#111111',

  // Texto (branco puro)
  textPrimary: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textMuted: '#AAAAAA',

  // Bordas visíveis (sempre brancas em alto contraste)
  border: '#FFFFFF',
  borderMuted: '#888888',

  // Accent — violeta mais brilhante para manter identidade + contraste
  primary: '#A78BFA',       // WCAG AA on black: 7.2:1
  primaryText: '#C4B5FD',   // para texto sobre fundo escuro

  // Status
  success: '#4ADE80',       // 8.9:1 on black
  warning: '#FBBF24',       // 9.4:1 on black
  danger: '#F87171',        // 5.5:1 on black

  // Desativado
  disabled: '#555555',
};

/**
 * Aplica overrides de alto contraste a um objeto de estilos.
 * Substitui backgroundColor e color de forma segura.
 */
export function withHighContrast<T extends Record<string, unknown>>(
  style: T,
  enabled: boolean,
): T {
  if (!enabled) return style;
  const overrides: Record<string, unknown> = {};
  if ('backgroundColor' in style && style.backgroundColor !== 'transparent') {
    overrides.backgroundColor = accessibleColors.bgCard;
  }
  if ('borderColor' in style) {
    overrides.borderColor = accessibleColors.border;
    overrides.borderWidth = Math.max((style.borderWidth as number) ?? 1, 1);
  }
  if ('color' in style) {
    overrides.color = accessibleColors.textPrimary;
  }
  return { ...style, ...overrides } as T;
}
