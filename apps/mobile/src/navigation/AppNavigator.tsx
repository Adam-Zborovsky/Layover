import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { HomeScreen } from "../screens/HomeScreen";
import { CaptureScreen } from "../screens/CaptureScreen";
import { ReceiptDetailScreen } from "../screens/ReceiptDetailScreen";
import { TripDetailScreen } from "../screens/TripDetailScreen";
import { TripsScreen } from "../screens/TripsScreen";
import { ExportScreen } from "../screens/ExportScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: "🏠",
    Trips: "✈",
    Export: "📦",
    Settings: "⚙",
  };
  return (
    <View style={tabStyles.icon}>
      <Text style={[tabStyles.emoji, focused && tabStyles.emojiActive]}>
        {icons[label] || "📋"}
      </Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  icon: { alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 20, opacity: 0.5 },
  emojiActive: { opacity: 1 },
});

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTitleStyle: {
          fontWeight: "700",
          color: "#111827",
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: "Receipts",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate("CaptureModal")}
              style={{ marginRight: 16 }}
            >
              <Text style={{ fontSize: 24 }}>📷</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{ title: "Trips" }}
      />
      <Tab.Screen
        name="Export"
        component={ExportScreen}
        options={{ title: "Export" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTitleStyle: { fontWeight: "700", color: "#111827" },
        headerTintColor: "#111827",
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
          title: "Scan Receipt",
          presentation: "modal",
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}
