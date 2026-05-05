export const COLORS = {
  primary: "#007AFF",
  secondary: "#FFFFFF",
  success: "#30D158",
  danger: "#FF453A",
  background: "#000000",
  surface: "#111111",
  textPrimary: "#FFFFFF",
  textSecondary: "#B3B3B3",
  white: "#FFFFFF",
  overlay: "#222222",
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
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
    color: COLORS.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700" as const,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.textPrimary,
  },
  bodyLarge: {
    fontSize: 20,
    fontWeight: "600" as const,
    fontFamily: "Inter_500Medium",
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    color: COLORS.textSecondary,
  },
  buttonLabel: {
    fontSize: 22,
    fontWeight: "700" as const,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.white,
  },
};
