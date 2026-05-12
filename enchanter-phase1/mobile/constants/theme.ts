/**
 * Enchanter design tokens
 *
 * Aesthetic direction: dark arcane — deep midnight purples and navies,
 * gold/amber accents, parchment text. Feels like a grimoire, not a game app.
 */

export const Colors = {
  // Backgrounds
  bg: '#0e0b18',        // deepest midnight
  bgCard: '#161228',    // card surfaces
  bgElevated: '#1e1935',// modals, sheets

  // Primary accent — amber gold
  gold: '#c9a84c',
  goldDim: '#8a6d2e',
  goldGlow: 'rgba(201,168,76,0.15)',

  // Secondary — muted violet
  violet: '#7b5ea7',
  violetDim: '#4a3a6b',

  // Status / site type
  coastal: '#4a9ebb',     // sea blue
  landlocked: '#7a9e4a',  // earth green

  // Text
  textPrimary: '#e8dfc8',   // warm parchment
  textSecondary: '#9d9088', // aged parchment
  textMuted: '#5c544c',

  // Utility
  border: '#2e2840',
  error: '#c75b5b',
  success: '#5b8c5a',
  white: '#ffffff',
};

export const Typography = {
  // Display — use for titles, spell names
  display: 'Cinzel',          // serif, classical, Roman inscriptions vibe
  displayItalic: 'Cinzel',

  // Body — use for descriptions, lore
  body: 'CormorantGaramond',  // elegant serif
  bodyWeight: '400',

  // Mono — use for stats, scores, fingerprint data
  mono: 'SpaceMono',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 999,
};

export const Shadow = {
  card: {
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
