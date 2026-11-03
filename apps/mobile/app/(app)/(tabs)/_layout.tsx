import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useColors } from '@/components/theme';
import { useHaptics } from '@/lib/motion';

type TabIcon = 'keypad' | 'person-circle' | 'settings';
const icon = (name: TabIcon) => {
  function Icon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return (
      <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color as string} />
    );
  }
  return Icon;
};

/** Bottom tabs: Codes, Profile, Settings. Secondary screens push on the parent stack. */
export default function TabsLayout() {
  const c = useColors();
  const haptic = useHaptics();
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic('tap') }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="codes" options={{ title: 'Codes', tabBarIcon: icon('keypad') }} />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: icon('person-circle') }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
