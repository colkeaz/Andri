export const COLORS = {
  background: "#F6F8FC",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF4FF",
  surfaceMuted: "#F1F5F9",
  overlay: "#DDE5F0",

  primary: "#164B8F",
  primaryDark: "#0B2F5B",
  primarySoft: "#E8F1FF",
  secondary: "#D9A441",
  secondarySoft: "#FFF4D8",

  success: "#16803C",
  successSoft: "#E8F7EE",
  danger: "#C92A2A",
  error: "#C92A2A",
  dangerSoft: "#FCEAEA",
  warning: "#B7791F",
  warningSoft: "#FFF2D8",

  textPrimary: "#111827",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",

  white: "#FFFFFF",
  black: "#020617",
  accent: "#D9A441",
  accentSoft: "#FFF4D8",
  accentVibrant: "#E94B35",
  accentJeepney: "#F6C445",
};

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 44,
};

export const RADIUS = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const SHADOW = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  soft: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  modal: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 34,
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
  h2: {
    fontSize: 24,
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
  h3: {
    fontSize: 20,
    fontWeight: "700" as const,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
    letterSpacing: 0,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: "700" as const,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
    letterSpacing: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
    color: COLORS.primary,
    letterSpacing: 0,
    textTransform: "uppercase" as const,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
    color: COLORS.white,
    letterSpacing: 0,
  },
  number: {
    fontSize: 28,
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
    letterSpacing: 0,
  },
};

export const LAYOUT = {
  screenPadding: SPACING.md,
  bottomTabInset: 112,
  minTouch: 48,
};
