import { Tabs } from "expo-router";
import {
  Home,
  List,
  PackagePlus,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import { COLORS, TYPOGRAPHY } from "../../src/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.overlay,
        },
        tabBarLabelStyle: {
          ...TYPOGRAPHY.body,
          fontSize: 14,
          fontWeight: "700",
        },
        headerStyle: {
          height: 110,
          backgroundColor: COLORS.surface,
        },
        headerTitleStyle: {
          ...TYPOGRAPHY.h2,
        },
        headerTintColor: COLORS.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "My Shop",
          tabBarIcon: ({ color }) => <Home color={color} size={30} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Stock",
          tabBarIcon: ({ color }) => <List color={color} size={30} />,
        }}
      />
      <Tabs.Screen
        name="intake"
        options={{
          title: "Add",
          tabBarIcon: ({ color }) => <PackagePlus color={color} size={30} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: "Sell",
          tabBarIcon: ({ color }) => <ShoppingCart color={color} size={30} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings color={color} size={30} />,
        }}
      />
    </Tabs>
  );
}
