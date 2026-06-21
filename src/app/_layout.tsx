import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/features/auth/auth-provider';
import { getNavigationTheme, themeColors, useThemeMode } from '@/lib/theme';

export default function RootLayout() {
  const mode = useThemeMode();
  const colors = themeColors[mode];

  return (
    <ThemeProvider value={getNavigationTheme(mode)}>
      <AuthProvider>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" options={{ headerShown: true, presentation: 'modal', title: 'Sign in' }} />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
