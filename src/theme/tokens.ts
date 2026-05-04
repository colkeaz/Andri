// Theme tokens for Elder-Friendly UI
export const COLORS = {
  primary: '#003366', // Deep Navy (High Contrast)
  secondary: '#FFD700', // Gold (Attention)
  success: '#2E7D32', // Dark Green
  danger: '#D32F2F', // High Visibility Red
  background: '#F5F7FA',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#4A4A4A',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.05)',
};

export const SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: COLORS.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  bodyLarge: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  buttonLabel: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
};
