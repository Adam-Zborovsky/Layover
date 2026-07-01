import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchSettings, updateSettings, checkHealth, fetchReceipts, fetchTrips } from "../api/client";
import { setBaseUrl, setAuthToken, getBaseUrl, getAuthToken } from "../api/auth";
import { showErrorAlert } from "../utils/errors";
import { colors, typography, spacing, radii } from "../ui/theme";

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState("");
  const [authTokenLocal, setAuthTokenLocal] = useState("");
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [aiModel, setAiModel] = useState("gemini-2.5-flash");
  const [receiptCount, setReceiptCount] = useState<number | null>(null);
  const [trips, setTrips] = useState<{ id: string; name: string }[]>([]);
  const [tripPickerVisible, setTripPickerVisible] = useState(false);
  const templateInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = (await fetchSettings()) as Record<string, string>;
      setSettings(data);
      if (data.aiModel) setAiModel(data.aiModel as string);
    } catch {}
    try {
      const url = await getBaseUrl();
      const token = await getAuthToken();
      setServerUrl(url);
      setAuthTokenLocal(token);
    } catch {}
    try {
      const result = (await fetchReceipts({ pageSize: 1 })) as any;
      const count = typeof result?.total === "number" ? result.total : (Array.isArray(result) ? result.length : null);
      setReceiptCount(count);
    } catch {}
    try {
      const tripsData = (await fetchTrips()) as { id: string; name: string }[];
      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch {}
    setLoading(false);
  }

  async function handleSave() {
    try {
      await updateSettings({ ...settings, aiModel });
      await setBaseUrl(serverUrl);
      await setAuthToken(authTokenLocal);
      Alert.alert("Saved", "Settings updated successfully");
    } catch (err: any) {
      showErrorAlert("Error", err, "Failed to save settings");
    }
  }

  async function handleConnectTest() {
    await setBaseUrl(serverUrl);
    await setAuthToken(authTokenLocal);
    const ok = await checkHealth();
    setHealthStatus(ok);
    Alert.alert(
      ok ? "Connected" : "Failed",
      ok ? "Server is reachable" : "Could not reach server"
    );
  }

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function insertTemplateVariable(variable: string) {
    const current = settings.namingTemplate || "{date}_{merchant}_{category}_{total}";
    updateSetting("namingTemplate", current + variable);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.syncIndicator}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>Cloud Sync Active</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Server Connection</Text>
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="https://your-server.com"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Auth Token</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={authTokenLocal}
              onChangeText={setAuthTokenLocal}
              placeholder="Enter auth token"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showToken}
            />
            <TouchableOpacity
              onPress={() => setShowToken(!showToken)}
              style={styles.visibilityBtn}
            >
              <Text style={styles.visibilityBtnText}>
                {showToken ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.connectionRow}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    healthStatus === null
                      ? colors.textTertiary
                      : healthStatus
                        ? colors.statusConfirmed
                        : colors.error,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {healthStatus === null
                ? "Not tested"
                : healthStatus
                  ? "Connected"
                  : "Failed"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleConnectTest}
            activeOpacity={0.7}
          >
            <Text style={styles.testButtonText}>Test Connection</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Naming Template</Text>
      <View style={styles.card}>
        <View style={styles.templatePreview}>
          <TextInput
            ref={templateInputRef}
            style={[styles.input, { fontFamily: "monospace", color: colors.primary }]}
            value={settings.namingTemplate || "{date}_{merchant}_{category}_{total}"}
            onChangeText={(v) => updateSetting("namingTemplate", v)}
            placeholder="{date}_{merchant}_{category}_{total}"
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={styles.templateExample}>
            e.g. 2026-06-14_Hertz_CarService_$84.20
          </Text>
        </View>
        <View style={styles.variableChips}>
          {["{date}", "{merchant}", "{category}", "{total}", "{currency}"].map((v) => (
            <TouchableOpacity
              key={v}
              style={styles.varChip}
              activeOpacity={0.7}
              onPress={() => insertTemplateVariable(v)}
            >
              <Text style={styles.varChipText}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>AI Processing</Text>
      <View style={styles.card}>
        <View style={styles.segmentControl}>
          <TouchableOpacity
            style={[styles.segment, aiModel === "gemini-2.5-flash" && styles.segmentActive]}
            activeOpacity={0.7}
            onPress={() => setAiModel("gemini-2.5-flash")}
          >
            <Text style={aiModel === "gemini-2.5-flash" ? styles.segmentActiveText : styles.segmentText}>
              Gemini 2.5 Flash
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, aiModel === "gemini-2.5-pro" && styles.segmentActive]}
            activeOpacity={0.7}
            onPress={() => setAiModel("gemini-2.5-pro")}
          >
            <Text style={aiModel === "gemini-2.5-pro" ? styles.segmentActiveText : styles.segmentText}>
              Gemini 3.1 Pro
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.field}>
          <View style={styles.sliderHeader}>
            <Text style={styles.fieldLabel}>Confidence Threshold</Text>
            <Text style={styles.sliderValue}>
              {settings.escalationThreshold
                ? `${Math.round((parseFloat(settings.escalationThreshold) || 0.6) * 100)}%`
                : "60%"}
            </Text>
          </View>
          <TextInput
            style={styles.input}
            value={settings.escalationThreshold || "0.6"}
            onChangeText={(v) => updateSetting("escalationThreshold", v)}
            keyboardType="decimal-pad"
            placeholder="0.6"
            placeholderTextColor={colors.textTertiary}
          />
          <Text style={styles.hint}>
            Receipts below this threshold will be flagged for review to ensure expense accuracy.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.card}>
        <View style={styles.prefRow}>
          <Text style={styles.fieldLabel}>Default Currency</Text>
          <TextInput
            style={[styles.input, { flex: 1, maxWidth: 100, textAlign: "center" }]}
            value={settings.defaultCurrency || "USD"}
            onChangeText={(v) => updateSetting("defaultCurrency", v.toUpperCase())}
            maxLength={3}
            placeholder="USD"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={[styles.divider, { marginVertical: spacing.md }]} />
        <View style={styles.prefRow}>
          <Text style={styles.fieldLabel}>Default Trip</Text>
          <TouchableOpacity
            onPress={() => setTripPickerVisible(true)}
            style={{ flex: 1, alignItems: "flex-end" }}
          >
            <Text style={[styles.input, { color: settings.defaultTripId ? colors.primary : colors.textTertiary }]}>
              {settings.defaultTripId
                ? trips.find((t) => t.id === settings.defaultTripId)?.name || "Unknown"
                : "None"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Data &amp; Backup</Text>
      <View style={styles.card}>
        <View style={styles.dataRow}>
          <View>
            <Text style={styles.dataLabel}>Storage Usage</Text>
            <Text style={styles.dataValue}>
              {receiptCount !== null ? `${receiptCount} receipt${receiptCount !== 1 ? "s" : ""}` : "Loading..."}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.backupButton}
            activeOpacity={0.7}
            onPress={() => Alert.alert("Coming Soon", "Backup export will be available in a future update.")}
          >
            <Text style={styles.backupButtonText}>Export Backup</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={tripPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: spacing.xxxl + insets.bottom }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Default Trip</Text>
            <Text style={styles.modalSubtitle}>
              New receipts will be auto-assigned to this trip
            </Text>
            <TouchableOpacity
              style={[styles.tripOption, !settings.defaultTripId && styles.tripOptionActive]}
              onPress={() => {
                updateSetting("defaultTripId", "");
                setTripPickerVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tripOptionText, !settings.defaultTripId && styles.tripOptionTextActive]}>
                None
              </Text>
            </TouchableOpacity>
            {trips.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tripOption, settings.defaultTripId === t.id && styles.tripOptionActive]}
                onPress={() => {
                  updateSetting("defaultTripId", t.id);
                  setTripPickerVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tripOptionText, settings.defaultTripId === t.id && styles.tripOptionTextActive]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setTripPickerVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Layover v2.4.1 (Stable Build)</Text>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        activeOpacity={0.8}
      >
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...typography.displaySm,
    color: colors.textPrimary,
  },
  syncIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusConfirmed,
  },
  syncText: {
    ...typography.labelSm,
    color: colors.secondary,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.lg + spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.bodyMd,
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  visibilityBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  visibilityBtnText: {
    ...typography.labelSm,
    color: colors.tertiary,
  },
  connectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  testButton: {
    borderWidth: 2,
    borderColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  testButtonText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: "700",
  },
  templatePreview: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  templateExample: {
    ...typography.bodySm,
    color: colors.textTertiary,
    fontStyle: "italic",
    marginTop: spacing.sm,
  },
  variableChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  varChip: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  varChipText: {
    ...typography.labelSm,
    color: colors.primary,
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  segmentActiveText: {
    ...typography.labelSm,
    color: colors.onPrimary,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sliderValue: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: "700",
  },
  hint: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  prefRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dataLabel: {
    ...typography.labelMd,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  dataValue: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  backupButton: {
    borderWidth: 2,
    borderColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  backupButtonText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.bodySm,
    color: colors.textTertiary,
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl + 12,
    borderTopRightRadius: radii.xl + 12,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalHandle: {
    width: 48,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.displaySm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  tripOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.borderLight,
  },
  tripOptionActive: {
    backgroundColor: colors.primaryDim,
  },
  tripOptionText: {
    ...typography.bodyMd,
    color: colors.textPrimary,
  },
  tripOptionTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  modalCancelButton: {
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  modalCancelText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
  },
});
