// ─── YOULI DESIGN TOKENS ────────────────────────────────────────────────────
export const colors = {
  primary: '#0d3b2e',
  primaryMid: '#1a5c47',
  primaryLight: '#2F6B5E',
  accentSoft: '#D7ECD8',
  accentGreen: '#86efac',

  success: '#22c55e',
  successBg: '#dcfce7',
  warning: '#f59e0b',
  warningBg: '#fef9c3',
  danger: '#ef4444',
  dangerBg: '#fee2e2',
  info: '#3b82f6',
  infoBg: '#dbeafe',
  purple: '#8b5cf6',
  purpleBg: '#ede9fe',

  income: '#1E6548',
  incomeBg: '#133E35',
  expense: '#8A2F3E',
  expenseBg: '#4A1F24',
  creditBg: '#46361F',
  savingsBg: '#174A3E',

  bg: '#F6F4EE',
  bgAlt: '#F2EFE7',
  card: '#FFFFFF',
  cardAlt: '#F9FAFB',
  overlay: 'rgba(0,0,0,0.45)',
  border: '#E5E7EB',
  borderLight: '#F0F0EC',

  text: '#1E2329',
  textSub: '#374151',
  muted: '#6A737D',
  subtle: '#9CA3AF',
  inverse: '#FFFFFF',
  accent: '#2F6B5E',
} as const;

export const spacing = {
  xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
} as const;

export const radii = {
  xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32, full: 9999,
} as const;

export const fontSize = {
  xs: 11, sm: 12, base: 14, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 32, display: 40,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const shadows = {
  sm: { shadowColor: '#0B2D25', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#0B2D25', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  lg: { shadowColor: '#0B2D25', shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
} as const;

export const animation = { fast: 200, normal: 300, slow: 500 } as const;

export type Color = keyof typeof colors;
