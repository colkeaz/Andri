// ─────────────────────────────────────────────
//  Stocker – "Productive Minimalism" Theme
//  Apple / Lofree white palette
// ─────────────────────────────────────────────

export const COLORS = {
  // Core accent – iOS blue
  primary: "#007AFF",
  // Status
  success: "#34C759",
  danger:  "#FF3B30",
  warning: "#FF9500",

  // Backgrounds
  background: "#FFFFFF",        // Pure white canvas
  surface:    "#F5F5F7",        // Apple soft-gray card surface
  surfaceAlt: "#FAFAFA",        // Slightly warmer card variant
  overlay:    "#E5E5E7",        // Ultra-thin border / divider

  // Text
  textPrimary:   "#1D1D1F",     // Near-black – Apple headline
  textSecondary: "#86868B",     // Apple system gray

  // Convenience
  white: "#FFFFFF",
  black: "#1D1D1F",
};

export const SPACING = {
  xs:  8,
  sm:  16,
  md:  24,
  lg:  32,
  xl:  48,
};

export const RADIUS = {
  sm:  12,
  md:  16,
  lg:  20,
  xl:  24,
};

export const SHADOW = {
  // Barely-there shadow for white surfaces
  card: {
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     2,
  },
  // Slightly lifted for modals / bottom sheets
  modal: {
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius:  16,
    elevation:     8,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize:   34,
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
    color:      COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize:   22,
    fontWeight: "700" as const,
    fontFamily: "Inter_600SemiBold",
    color:      COLORS.textPrimary,
  },
  bodyLarge: {
    fontSize:   18,
    fontWeight: "600" as const,
    fontFamily: "Inter_500Medium",
    color:      COLORS.textPrimary,
  },
  body: {
    fontSize:   15,
    fontFamily: "Inter_400Regular",
    color:      COLORS.textSecondary,
  },
  caption: {
    fontSize:   13,
    fontFamily: "Inter_400Regular",
    color:      COLORS.textSecondary,
  },
  buttonLabel: {
    fontSize:   18,
    fontWeight: "700" as const,
    fontFamily: "Inter_600SemiBold",
    color:      COLORS.white,
    letterSpacing: 0.3,
  },
};
