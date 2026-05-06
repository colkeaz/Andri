// ─────────────────────────────────────────────
//  Stocker – "Tindahan" Filipino Elder-Friendly Theme
//  Warm cream & gold palette inspired by Philippine heritage
// ─────────────────────────────────────────────

export const COLORS = {
  // Core accent – Philippine flag deep blue
  primary:   "#1B4B8A",
  // Secondary accent – Philippine sun gold
  secondary: "#D4A843",

  // Status
  success: "#2E7D32",
  danger:  "#C62828",
  error:   "#C62828",        // Alias for danger (used across codebase)
  warning: "#F57C00",

  // Backgrounds – warm cream tones
  background: "#FFF8F0",     // Warm cream canvas
  surface:    "#FFF2E6",     // Slightly deeper cream for cards
  surfaceAlt: "#FFEDD5",     // Warm accent card variant
  overlay:    "#E8D5BE",     // Warm tan border / divider

  // Text – warm brown tones for readability
  textPrimary:   "#2C1810",  // Rich dark brown – easier on older eyes
  textSecondary: "#7A6557",  // Medium brown – warm secondary text

  // Convenience
  white: "#FFFFFF",
  black: "#2C1810",

  // Filipino accent colors
  accent:    "#D4A843",      // Sun gold
  accentSoft:"#FFF3D6",      // Soft gold for backgrounds
  accentVibrant: "#E53935",  // Fiesta Red
  accentJeepney: "#FFCA28",  // Jeepney Yellow
};

export const SPACING = {
  xs:  10,
  sm:  18,
  md:  26,
  lg:  34,
  xl:  52,
};

export const RADIUS = {
  sm:  14,
  md:  18,
  lg:  22,
  xl:  28,
};

export const SHADOW = {
  // Warm subtle shadow for cream surfaces
  card: {
    shadowColor:   "#8B6914",
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius:  10,
    elevation:     3,
  },
  // Slightly lifted for modals / bottom sheets
  modal: {
    shadowColor:   "#8B6914",
    shadowOffset:  { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius:  20,
    elevation:     10,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize:      40,
    fontWeight:    "800" as const,
    fontFamily:    "Inter_700Bold",
    color:         COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize:      28,
    fontWeight:    "700" as const,
    fontFamily:    "Inter_600SemiBold",
    color:         COLORS.textPrimary,
  },
  h3: {
    fontSize:      24,
    fontWeight:    "700" as const,
    fontFamily:    "Inter_600SemiBold",
    color:         COLORS.textPrimary,
  },
  bodyLarge: {
    fontSize:      22,
    fontWeight:    "600" as const,
    fontFamily:    "Inter_500Medium",
    color:         COLORS.textPrimary,
  },
  body: {
    fontSize:      19,
    fontFamily:    "Inter_400Regular",
    color:         COLORS.textSecondary,
  },
  bodyBold: {
    fontSize:      19,
    fontWeight:    "700" as const,
    fontFamily:    "Inter_600SemiBold",
    color:         COLORS.textPrimary,
  },
  caption: {
    fontSize:      16,
    fontFamily:    "Inter_400Regular",
    color:         COLORS.textSecondary,
  },
  buttonLabel: {
    fontSize:      22,
    fontWeight:    "700" as const,
    fontFamily:    "Inter_600SemiBold",
    color:         COLORS.white,
    letterSpacing: 0.3,
  },
};
