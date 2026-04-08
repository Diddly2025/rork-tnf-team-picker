import { Stack } from 'expo-router';
import React from 'react';
import Colors from '@/constants/colors';

export default function FinanceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.cardBackground },
        headerTitleStyle: { color: Colors.text, fontWeight: '700' },
        headerTintColor: Colors.gold,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Finance' }} />
    </Stack>
  );
}
