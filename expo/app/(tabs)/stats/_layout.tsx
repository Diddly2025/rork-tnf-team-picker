import { Stack } from 'expo-router';
import React from 'react';
import Colors from '@/constants/colors';

export default function StatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.cardBackground },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Statistics' }} />
    </Stack>
  );
}
