import { DarkTheme, DefaultTheme } from 'expo-router';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export const palette = {
  cream: '#FAF4EA',
  warmBeige: '#EFE1CF',
  olive: '#556B45',
  sage: '#A8B89A',
  coral: '#E9896A',
  ink: '#2A241F',
  warmDark: '#171713',
  darkCard: '#24231E',
  lightText: '#F8F1E8',
  muted: '#766B5E',
  borderLight: '#DDCCB8',
  borderDark: '#39372F',
} as const;

export const themeColors = {
  light: {
    background: palette.cream,
    surface: '#FFF9F0',
    surfaceAlt: palette.warmBeige,
    text: palette.ink,
    mutedText: palette.muted,
    primary: palette.olive,
    primaryText: '#FFFFFF',
    secondary: palette.sage,
    accent: palette.coral,
    border: palette.borderLight,
    danger: '#A74434',
    shadow: 'rgba(42, 36, 31, 0.12)',
  },
  dark: {
    background: palette.warmDark,
    surface: palette.darkCard,
    surfaceAlt: '#302E27',
    text: palette.lightText,
    mutedText: '#CFC5B7',
    primary: palette.sage,
    primaryText: '#171713',
    secondary: palette.olive,
    accent: '#F0A085',
    border: palette.borderDark,
    danger: '#FFB3A1',
    shadow: 'rgba(0, 0, 0, 0.26)',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
} as const;

export const shadow = {
  soft: '0 8px 22px rgba(42, 36, 31, 0.08)',
} as const;

export function useThemeMode(): ThemeMode {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useThemeColors() {
  return themeColors[useThemeMode()];
}

export function getNavigationTheme(mode: ThemeMode) {
  const colors = themeColors[mode];
  const baseTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      border: colors.border,
      card: colors.surface,
      notification: colors.accent,
      primary: colors.primary,
      text: colors.text,
    },
  };
}
