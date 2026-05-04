import { Tabs } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../src/theme/tokens';
import { Home, PackagePlus, ShoppingCart, List } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          ...TYPOGRAPHY.body,
          fontSize: 14,
          fontWeight: '700',
        },
        headerStyle: {
          height: 110,
        },
        headerTitleStyle: {
          ...TYPOGRAPHY.h2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Shop',
          tabBarIcon: ({ color }) => <Home color={color} size={30} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Stock',
          tabBarIcon: ({ color }) => <List color={color} size={30} />,
        }}
      />
      <Tabs.Screen
        name="intake"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <PackagePlus color={color} size={30} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'Sell',
          tabBarIcon: ({ color }) => <ShoppingCart color={color} size={30} />,
        }}
      />
    </Tabs>
  );
}
