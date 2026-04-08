import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GroupProvider } from '@/context/GroupContext';
import { TNFProvider } from '@/context/TNFContext';
import Colors from '@/constants/colors';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function useProtectedRoute() {
  const { isAuthenticated, isLoading, initialCheckDone } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialCheckDone || isLoading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'forgot-password';

    if (!isAuthenticated && !inAuthGroup) {
      console.log('[AuthGuard] Not authenticated, redirecting to login');
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('[AuthGuard] Authenticated, redirecting to home');
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, initialCheckDone, segments, router]);
}

function RootLayoutNav() {
  const { isLoading, initialCheckDone } = useAuth();

  useProtectedRoute();

  useEffect(() => {
    if (initialCheckDone) {
      void SplashScreen.hideAsync();
    }
  }, [initialCheckDone]);

  if (!initialCheckDone || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }} testID="loading-screen">
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="group-setup" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="manage-groups" options={{ title: 'Your Groups', presentation: 'modal' }} />
      <Stack.Screen name="manual-teams" options={{ title: 'Build Teams', presentation: 'modal' }} />
      <Stack.Screen name="match-result" options={{ title: 'Record Result', presentation: 'modal' }} />
      <Stack.Screen name="add-historical-result" options={{ title: 'Add Past Result', presentation: 'modal' }} />
      <Stack.Screen name="edit-result" options={{ title: 'Edit Result' }} />
      <Stack.Screen name="match-report" options={{ title: 'Match Report' }} />
      <Stack.Screen name="price-history" options={{ title: 'Subs Price History' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GroupProvider>
          <TNFProvider>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }} testID="root-layout">
              <StatusBar style="dark" />
              <RootLayoutNav />
            </GestureHandlerRootView>
          </TNFProvider>
        </GroupProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
