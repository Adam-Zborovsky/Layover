import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchTrips, createTrip, deleteTrip, fetchSettings } from "../api/client";
import { colors, typography, spacing, radii } from "../ui/theme";
import { formatDateInput } from "../utils/format";

interface TripItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  receiptCount: number;
  totalAmount?: number;
  currency?: string;
}

export function TripsScreen({ navigation }: { navigation: any }) {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [defaultTripId, setDefaultTripId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      setError(null);
      const [data, settings] = await Promise.all([
        fetchTrips() as Promise<TripItem[]>,
        fetchSettings() as Promise<Record<string, string>>,
      ]);
      setTrips(Array.isArray(data) ? data : []);
      setDefaultTripId(settings.defaultTripId || null);
    } catch (err: any) {
      setError(err.message || "Failed to load trips");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const retry = () => {
    setIsLoading(true);
    load();
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleCreate() {
    if (!newName.trim() || !newStart.trim() || !newEnd.trim()) {
      Alert.alert("Missing fields", "Please fill in trip name, start date, and end date");
      return;
    }

    try {
      await createTrip({
        name: newName,
        startDate: newStart,
        endDate: newEnd,
        notes: newNotes,
      });
      setModalVisible(false);
      setNewName("");
      setNewStart("");
      setNewEnd("");
      setNewNotes("");
      load();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create trip");
    }
  }

  async function handleDelete(item: TripItem) {
    const hasReceipts = item.receiptCount > 0;
    Alert.alert("Delete Trip", hasReceipts
      ? `"${item.name}" has ${item.receiptCount} receipt${item.receiptCount !== 1 ? "s" : ""}. Keep them or delete everything?`
      : `Delete "${item.name}"?`,
      hasReceipts
        ? [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete Trip Only",
              onPress: () => confirmDelete(item.id, false),
            },
            {
              text: "Delete All",
              style: "destructive",
              onPress: () => {
                Alert.alert(
                  "Delete Everything?",
                  `This will permanently delete ${item.receiptCount} receipt${item.receiptCount !== 1 ? "s" : ""} and "${item.name}". This cannot be undone.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete All",
                      style: "destructive",
                      onPress: () => confirmDelete(item.id, true),
                    },
                  ]
                );
              },
            },
          ]
        : [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => confirmDelete(item.id, false),
            },
          ]
    );
  }

  async function confirmDelete(id: string, deleteReceipts: boolean) {
    try {
      await deleteTrip(id, deleteReceipts);
      load();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete trip");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        <Text style={styles.subtitle}>
          {trips.length} active trip{trips.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={trips || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tripCard}
            onPress={() => navigation.navigate("TripDetail", { id: item.id })}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <View style={styles.accentBar} />
            <View style={styles.tripCardBody}>
              <View style={styles.tripHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripName}>{item.name}</Text>
                  <Text style={styles.tripDates}>
                    {item.startDate} \u2014 {item.endDate}
                  </Text>
                  {item.id === defaultTripId && (
                    <View style={styles.defaultChip}>
                      <Text style={styles.defaultChipText}>DEFAULT</Text>
                    </View>
                  )}
                </View>
                <View style={styles.tripAmountCol}>
                  <Text style={styles.tripAmount}>
                    ${(item.totalAmount || 0).toFixed(2)}
                  </Text>
                  <View style={styles.receiptBadge}>
                    <Text style={styles.receiptBadgeText}>
                      {item.receiptCount || 0} receipt{(item.receiptCount || 0) !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.empty}>
              <Ionicons name="warning-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>Something went wrong</Text>
              <Text style={styles.emptySubtitle}>{error}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={retry}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="airplane-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptySubtitle}>
                Start a new trip to begin tracking your expenses automatically with AI.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyButtonText}>Create Trip</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} style={{ marginTop: -2 }} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalContent, { paddingBottom: spacing.xxxl + insets.bottom }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create New Trip</Text>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Trip Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. JFK\u2192LHR June"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.modalFieldRow}>
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Start Date</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newStart}
                  onChangeText={(v) => setNewStart(formatDateInput(v))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>End Date</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newEnd}
                  onChangeText={(v) => setNewEnd(formatDateInput(v))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={newNotes}
                onChangeText={setNewNotes}
                placeholder="Project code or client name..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreate}
              activeOpacity={0.8}
            >
              <Text style={styles.createButtonText}>Create Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    ...typography.displaySm,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  list: {
    paddingVertical: spacing.sm,
    paddingBottom: 80,
  },
  tripCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: 6,
    borderRadius: radii.lg,
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: {
    width: 3,
    backgroundColor: colors.primary,
  },
  tripCardBody: {
    flex: 1,
    padding: spacing.lg,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tripName: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tripDates: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  tripAmountCol: {
    alignItems: "flex-end",
  },
  tripAmount: {
    ...typography.displaySm,
    color: colors.primary,
  },
  receiptBadge: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginTop: spacing.xs,
  },
  receiptBadgeText: {
    ...typography.labelSm,
    color: colors.primary,
    textTransform: "uppercase",
  },
  defaultChip: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  defaultChipText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  empty: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
    color: colors.textTertiary,
  },
  emptyTitle: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.textTertiary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  emptyButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
  },
  emptyButtonText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: "400",
    color: colors.onPrimary,
    marginTop: -2,
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
    marginBottom: spacing.xl,
  },
  modalField: {
    marginBottom: spacing.lg,
  },
  modalFieldRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  modalInput: {
    ...typography.headlineMd,
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 16,
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
  centered: {
    alignItems: "center",
    paddingTop: 120,
  },
});
