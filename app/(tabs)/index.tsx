import { Redirect, RelativePathString } from 'expo-router';
import { useGroup } from '@/context/GroupContext';
import { View, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';

export default function TabIndex() {
  const { groups, isLoading } = useGroup();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  if (groups.length === 0) {
    return <Redirect href={'/group-setup' as RelativePathString} />;
  }

  return <Redirect href={'/players' as RelativePathString} />;
}
