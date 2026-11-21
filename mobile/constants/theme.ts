import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Design Tokens per DESIGN.md §2
 */

export const colors = {
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primarySoft: '#EEF2FF',
  secondary: '#0D9488',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  error: '#DC2626',
  errorSoft: '#FEE2E2',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  disabledBg: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.5)',
} as const;

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    color: colors.textPrimary,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: colors.textSecondary,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: colors.textOnPrimary,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  screenHorizontal: 16,
  cardPadding: 16,
  cardGap: 12,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const shadows: { card: ViewStyle; raised: ViewStyle } = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: {
      elevation: 1,
    },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
  }) as ViewStyle,
  raised: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: {
      elevation: 8,
    },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
  }) as ViewStyle,
};
