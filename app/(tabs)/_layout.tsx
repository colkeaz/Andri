import { Tabs } from "expo-router";
import {
  Home,
  Package,
  PackagePlus,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import { COLORS, RADIUS } from "../../src/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 14,
          height: 74,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: COLORS.surface,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: COLORS.overlay,
          borderRadius: RADIUS.xl,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.14,
          shadowRadius: 24,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:        "Home",
          tabBarIcon:   ({ color }) => <Home color={color} size={24} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title:        "Inventory",
          tabBarIcon:   ({ color }) => <Package color={color} size={24} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="addstock"
        options={{
          title:        "Add Stock",
          tabBarIcon:   ({ color }) => <PackagePlus color={color} size={24} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title:        "Sell",
          tabBarIcon:   ({ color }) => <ShoppingCart color={color} size={24} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title:        "Settings",
          tabBarIcon:   ({ color }) => <Settings color={color} size={24} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
