import { Stack } from 'expo-router';
import React from 'react';
import Colors from '@/constants/colors';

export default function MatchdayLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Match Day',

        }} 
      />
    </Stack>
  );
}
