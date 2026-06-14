import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { fetchSettings, updateSettings, checkHealth } from "../api/client";
import { setBaseUrl, setAuthToken } from "../api/auth";

export function SettingsScreen() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState("");
  const [authTokenLocal, setAuthTokenLocal] = useState("");
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = (await fetchSettings()) as Record<string, string>;
      setSettings(data);
    } catch {}
    setLoading(false);
  }

  async function handleSave() {
    try {
      await updateSettings(settings);
      Alert.alert("Saved", "Settings updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save settings");
    }
  }

  async function handleConnectTest() {
    await setBaseUrl(serverUrl);
    await setAuthToken(authTokenLocal);
    const ok = await checkHealth();
    setHealthStatus(ok);
    Alert.alert(ok ? "Connected" : "Failed", ok ? "Server is reachable" : "Could not reach server");
  }

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Connection */}
      <Text style={styles.sectionTitle}>Connection</Text>
      <View style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="https://your-server.com"
            placeholderTextColor="#D1D5DB"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Auth Token</Text>
          <TextInput
            style={styles.input}
            value={authTokenLocal}
            onChangeText={setAuthTokenLocal}
            placeholder="Enter auth token"
            placeholderTextColor="#D1D5DB"
            secureTextEntry
          />
        </View>
        <TouchableOpacity style={styles.testButton} onPress={handleConnectTest}>
          <Text style={styles.testButtonText}>Test Connection</Text>
        </TouchableOpacity>
        {healthStatus !== null && (
          <Text
            style={[
              styles.healthStatus,
              { color: healthStatus ? "#10B981" : "#EF4444" },
            ]}
          >
            {healthStatus ? "Connected" : "Not reachable"}
          </Text>
        )}
      </View>

      {/* Naming Template */}
      <Text style={styles.sectionTitle}>Naming Template</Text>
      <View style={styles.card}>
        <View style={styles.fieldGroup}>
          <TextInput
            style={styles.input}
            value={settings.namingTemplate || "YYYY-MM-DD_Merchant_Category_$Total"}
            onChangeText={(v) => updateSetting("namingTemplate", v)}
            placeholder="YYYY-MM-DD_Merchant_Category_$Total"
            placeholderTextColor="#D1D5DB"
          />
        </View>
        <Text style={styles.hint}>
          Available: YYYY-MM-DD, Merchant, Category, $Total
        </Text>
      </View>

      {/* AI Settings */}
      <Text style={styles.sectionTitle}>AI Extraction</Text>
      <View style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Escalation Threshold</Text>
          <TextInput
            style={styles.input}
            value={settings.escalationThreshold || "0.6"}
            onChangeText={(v) => updateSetting("escalationThreshold", v)}
            keyboardType="decimal-pad"
            placeholder="0.6"
            placeholderTextColor="#D1D5DB"
          />
          <Text style={styles.hint}>
            Confidence below this triggers a Pro model retry (0.0 - 1.0)
          </Text>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Default Currency</Text>
          <TextInput
            style={styles.input}
            value={settings.defaultCurrency || "USD"}
            onChangeText={(v) => updateSetting("defaultCurrency", v.toUpperCase())}
            maxLength={3}
            placeholder="USD"
            placeholderTextColor="#D1D5DB"
          />
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  testButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  testButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  healthStatus: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
