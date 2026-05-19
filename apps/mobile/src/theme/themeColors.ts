/**
 * Youli — Theme Color Palettes
 * Dois temas completos: dark (padrão) e light.
 * Consumidos via useTheme() hook.
 */

export interface ThemePalette {
  // ── Backgrounds ──────────────────────────────────
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceAlt: string;
  surfaceDim: string;
  card: string;
  overlay: string;

  // ── Text ─────────────────────────────────────────
  text: string;
  textSub: string;
  textMuted: string;
  textSecondary: string;
  inverse: string;

  // ── Borders ──────────────────────────────────────
  border: string;
  borderLight: string;

  // ── Brand ────────────────────────────────────────
  primary: string;
  primaryMid: string;
  primaryLight: string;
  accentSoft: string;
  accent: string;

  // ── Semantic ─────────────────────────────────────
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  purple: string;
  purpleBg: string;

  // ── Financial ────────────────────────────────────
  income: string;
  incomeBg: string;
  expense: string;
  expenseBg: string;

  // ── Misc ─────────────────────────────────────────
  muted: string;
  subtle: string;
}

export const darkPalette: ThemePalette = {
  bg:          '#030712',
  bgAlt:       '#0D1117',
  surface:     '#111827',
  surfaceAlt:  '#1A2234',
  surfaceDim:  '#0D1117',
  card:        '#111827',
  overlay:     'rgba(0,0,0,0.60)',

  text:        '#F9FAFB',
  textSub:     '#E5E7EB',
  textMuted:   '#9CA3AF',
  textSecondary: '#6B7280',
  inverse:     '#030712',

  border:      '#1F2937',
  borderLight: '#1A2234',

  primary:     '#7C3AED',
  primaryMid:  '#6D28D9',
  primaryLight:'#A78BFA',
  accentSoft:  '#1E0D3B',
  accent:      '#A78BFA',

  success:    '#22C55E',
  successBg:  '#0D2818',
  warning:    '#F59E0B',
  warningBg:  '#1C1307',
  danger:     '#EF4444',
  dangerBg:   '#1F0A0A',
  info:       '#3B82F6',
  infoBg:     '#0B1629',
  purple:     '#8B5CF6',
  purpleBg:   '#1E0D3B',

  income:     '#4ADE80',
  incomeBg:   '#052E16',
  expense:    '#F87171',
  expenseBg:  '#1F0A0A',

  muted:      '#6B7280',
  subtle:     '#4B5563',
};

export const lightPalette: ThemePalette = {
  bg:          '#F6F4EE',
  bgAlt:       '#EEEADE',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F9FAFB',
  surfaceDim:  '#F3F4F6',
  card:        '#FFFFFF',
  overlay:     'rgba(0,0,0,0.40)',

  text:        '#111827',
  textSub:     '#374151',
  textMuted:   '#6B7280',
  textSecondary: '#9CA3AF',
  inverse:     '#F9FAFB',

  border:      '#E5E7EB',
  borderLight: '#F3F4F6',

  primary:     '#7C3AED',
  primaryMid:  '#6D28D9',
  primaryLight:'#8B5CF6',
  accentSoft:  '#EDE9FE',
  accent:      '#7C3AED',

  success:    '#16A34A',
  successBg:  '#DCFCE7',
  warning:    '#D97706',
  warningBg:  '#FEF3C7',
  danger:     '#DC2626',
  dangerBg:   '#FEE2E2',
  info:       '#2563EB',
  infoBg:     '#DBEAFE',
  purple:     '#7C3AED',
  purpleBg:   '#EDE9FE',

  income:     '#16A34A',
  incomeBg:   '#DCFCE7',
  expense:    '#DC2626',
  expenseBg:  '#FEE2E2',

  muted:      '#9CA3AF',
  subtle:     '#D1D5DB',
};
