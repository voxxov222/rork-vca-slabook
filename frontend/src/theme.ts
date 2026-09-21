import { useColorScheme, StyleSheet } from 'react-native';
import { useMemo } from 'react';

/**
 * VCA — Verified Card Authority design system.
 * Identity: Deep professional blue + white + authority red.
 * Premium, trusted, technical, sports-brand quality.
 */

export type ThemeColors = {
  // Surfaces
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  cardBorder: string;

  // Brand
  primary: string; // deep blue
  primaryDark: string;
  primarySoft: string; // tinted bg
  onPrimary: string;
  accent: string; // authority red
  accentDark: string;
  accentSoft: string;
  onAccent: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Lines
  border: string;
  divider: string;

  // Status
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;

  // Accents
  gold: string; // grade badge
  silver: string;
  holo: string; // holographic cyan hint

  // Tab bar
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Misc
  overlay: string;
  shimmer: string;
  skeleton: string;

  // Gradient stops
  heroStart: string;
  heroMid: string;
  heroEnd: string;
};

// VCA authority red — kept identical across light/dark as a brand constant.
export const VCA_RED = '#E01E37';
export const VCA_BLUE = '#0B3D91';

const light: ThemeColors = {
  background: '#EEF2F8',
  backgroundAlt: '#E4EAF3',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#DCE4EF',

  primary: '#0B3D91',
  primaryDark: '#082C6B',
  primarySoft: '#E4ECFA',
  onPrimary: '#FFFFFF',
  accent: VCA_RED,
  accentDark: '#B4152A',
  accentSoft: '#FCE4E7',
  onAccent: '#FFFFFF',

  text: '#0A1B2E',
  textSecondary: '#42566E',
  textMuted: '#8494A8',
  textInverse: '#FFFFFF',

  border: '#DCE4EF',
  divider: '#E7EDF5',

  success: '#0E9F6E',
  successSoft: '#DDF3EA',
  warning: '#D98A00',
  warningSoft: '#FBEFD6',
  danger: '#DC2B36',
  dangerSoft: '#FBE0E2',
  info: '#1E5BD6',

  gold: '#C99A24',
  silver: '#8895A6',
  holo: '#1BA6C4',

  tabBarBg: '#FFFFFF',
  tabBarActive: '#0B3D91',
  tabBarInactive: '#9AA8BB',

  overlay: 'rgba(6,13,26,0.55)',
  shimmer: 'rgba(255,255,255,0.6)',
  skeleton: '#DFE6F0',

  heroStart: '#0B3D91',
  heroMid: '#0A2C6B',
  heroEnd: '#061A40',
};

const dark: ThemeColors = {
  background: '#060B14',
  backgroundAlt: '#0A1120',
  surface: '#0D1626',
  surfaceElevated: '#132135',
  card: '#101B2E',
  cardBorder: '#1D2C44',

  primary: '#2C6BE8',
  primaryDark: '#1B4FBF',
  primarySoft: '#13233F',
  onPrimary: '#FFFFFF',
  accent: '#FF2E4D',
  accentDark: '#D21F3C',
  accentSoft: '#2A1420',
  onAccent: '#FFFFFF',

  text: '#F3F7FF',
  textSecondary: '#A9B8CE',
  textMuted: '#6C7C93',
  textInverse: '#0A1B2E',

  border: '#1D2C44',
  divider: '#172439',

  success: '#22C58B',
  successSoft: '#0E2A24',
  warning: '#F0A81E',
  warningSoft: '#2C2413',
  danger: '#FF4D5E',
  dangerSoft: '#2C1519',
  info: '#4C86F0',

  gold: '#F5C542',
  silver: '#B4C0D0',
  holo: '#38E0F0',

  tabBarBg: '#0A1120',
  tabBarActive: '#FFFFFF',
  tabBarInactive: '#5F7089',

  overlay: 'rgba(2,6,14,0.7)',
  shimmer: 'rgba(70,110,180,0.18)',
  skeleton: '#152238',

  heroStart: '#123A86',
  heroMid: '#0B2456',
  heroEnd: '#050D1E',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
  display: 44,
} as const;

export type Theme = {
  colors: ThemeColors;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light'; // default to dark (premium VCA vibe)
  return {
    colors: isDark ? dark : light,
    isDark,
    spacing,
    radius,
    fontSize,
  };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T
) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}

// Shared elevation presets (shadow color stays constant across schemes).
export const elevation = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  glow: {
    shadowColor: VCA_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
} as const;
