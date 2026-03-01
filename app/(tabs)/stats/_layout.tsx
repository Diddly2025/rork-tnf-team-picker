import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function StatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.cardBackground },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Statistics' }} />
    </Stack>
  );
}
