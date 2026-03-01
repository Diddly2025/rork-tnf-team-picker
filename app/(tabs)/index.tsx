import { Redirect, RelativePathString } from 'expo-router';

export default function TabIndex() {
  return <Redirect href={'/players' as RelativePathString} />;
}
