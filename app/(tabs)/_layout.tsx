import { Tabs } from "expo-router";
import {
  Home,
  Package,
  PackagePlus,
  Settings,
  ShoppingCart,
} from "lucide-react-native";
import { COLORS } from "../../src/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          height:          80,
          paddingBottom:   16,
          paddingTop:      10,
          backgroundColor: COLORS.background,
          borderTopWidth:  0.5,
          borderTopColor:  COLORS.overlay,
          // Subtle elevation for the tab bar
          shadowColor:     "#000",
          shadowOffset:    { width: 0, height: -1 },
          shadowOpacity:   0.06,
          shadowRadius:    8,
          elevation:       8,
        },
        tabBarLabelStyle: {
          fontSize:   11,
          fontWeight: "600",
          marginTop:  2,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
          shadowColor:     "#000",
          shadowOpacity:   0.04,
          shadowRadius:    4,
          elevation:       2,
        },
        headerTitleStyle: {
          fontSize:      18,
          fontWeight:    "700",
          color:         COLORS.textPrimary,
          fontFamily:    "Inter_600SemiBold",
        },
        headerTintColor: COLORS.textPrimary,
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
        name="intake"
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
