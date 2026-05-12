import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Colors, Typography } from '../../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return (
    <Ionicons
      name={name}
      size={22}
      color={focused ? Colors.gold : Colors.textMuted}
    />
  );
}

export default function TabsLayout() {
  const { session } = useAuth();
  if (!session) return <Redirect href="/auth/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgCard,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: Typography.display,
          fontSize: 9,
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon name="map-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="craft"
        options={{
          title: 'Craft',
          tabBarIcon: ({ focused }) => <TabIcon name="sparkles-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="spellbook"
        options={{
          title: 'Spellbook',
          tabBarIcon: ({ focused }) => <TabIcon name="book-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ focused }) => <TabIcon name="library-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="person-outline" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
