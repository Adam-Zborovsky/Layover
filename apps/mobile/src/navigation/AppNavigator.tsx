import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "../screens/HomeScreen";
import { CaptureScreen } from "../screens/CaptureScreen";
import { ReceiptDetailScreen } from "../screens/ReceiptDetailScreen";
import { TripDetailScreen } from "../screens/TripDetailScreen";
import { TripsScreen } from "../screens/TripsScreen";
import { ExportScreen } from "../screens/ExportScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { colors, typography } from "../ui/theme";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: "receipt",
  Trips: "airplane",
  Export: "share",
  Settings: "settings",
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const base = TAB_ICONS[label] || "ellipse";
  const name = focused ? base : (`${base}-outline` as any);
  return (
    <Ionicons
      name={name}
      size={22}
      color={focused ? colors.primary : colors.secondary}
    />
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          ...typography.labelSm,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          ...typography.headlineMd,
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Export"
        component={ExportScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: {
          ...typography.headlineMd,
          color: colors.textPrimary,
        },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReceiptDetail"
        component={ReceiptDetailScreen}
        options={{ title: "Receipt" }}
      />
      <Stack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ title: "Trip" }}
      />
      <Stack.Screen
        name="CaptureModal"
        component={CaptureScreen}
        options={{
          title: "Capture Receipt",
          presentation: "modal",
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}
