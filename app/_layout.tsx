import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { GroupProvider } from '@/context/GroupContext';
import { TNFProvider } from '@/context/TNFContext';
import Colors from '@/constants/colors';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="group-setup" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="manage-groups" options={{ title: 'Your Groups', presentation: 'modal' }} />
      <Stack.Screen name="manual-teams" options={{ title: 'Build Teams', presentation: 'modal' }} />
      <Stack.Screen name="match-result" options={{ title: 'Record Result', presentation: 'modal' }} />
      <Stack.Screen name="add-historical-result" options={{ title: 'Add Past Result', presentation: 'modal' }} />
      <Stack.Screen name="edit-result" options={{ title: 'Edit Result' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GroupProvider>
        <TNFProvider>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
            <StatusBar style="dark" />
            <RootLayoutNav />
          </GestureHandlerRootView>
        </TNFProvider>
      </GroupProvider>
    </QueryClientProvider>
  );
}
