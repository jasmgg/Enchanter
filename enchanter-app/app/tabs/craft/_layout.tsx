/**
 * app/tabs/craft/_layout.tsx
 * Stack navigator for the 3-step craft flow.
 */
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function CraftLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="express" />
      <Stack.Screen name="seal" />
    </Stack>
  );
}
