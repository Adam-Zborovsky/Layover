import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchTrip, updateTrip, fetchSettings, updateSettings } from "../api/client";
import { ReceiptCard } from "../components/ReceiptCard";
import { CategoryChip } from "../components/Badges";
import { colors, typography, spacing, radii } from "../ui/theme";
import { formatDateInput } from "../utils/format";
import type { ReceiptListItem } from "@recipts/shared";

type SortBy = "date" | "amount";

export function TripDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { id } = route.params;
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [defaultTripId, setDefaultTripId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadTrip();
  }, [id]);

  useEffect(() => {
    loadDefaultTrip();
  }, [id]);

  useEffect(() => {
    if (!trip) return;
    const isDefault = trip.id === defaultTripId;
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <TouchableOpacity
            onPress={toggleDefault}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDefault ? "bookmark" : "bookmark-outline"}
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, trip, defaultTripId]);

  async function loadDefaultTrip() {
    try {
      const settings = (await fetchSettings()) as Record<string, string>;
      setDefaultTripId(settings.defaultTripId || null);
    } catch {}
  }

  function openEditModal() {
    if (!trip) return;
    setEditName(trip.name || "");
    setEditStart(trip.startDate || "");
    setEditEnd(trip.endDate || "");
    setEditNotes(trip.notes || "");
    setEditModalVisible(true);
  }

  async function handleSaveEdit() {
    if (!editName.trim() || !editStart.trim() || !editEnd.trim()) {
      Alert.alert("Missing fields", "Please fill in trip name, start date, and end date");
      return;
    }
    try {
      await updateTrip(trip.id, { name: editName, startDate: editStart, endDate: editEnd, notes: editNotes });
      setEditModalVisible(false);
      loadTrip();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save trip");
    }
  }

  async function toggleDefault() {
    const newDefaultId = defaultTripId === trip.id ? "" : trip.id;
    await updateSettings({ defaultTripId: newDefaultId });
    setDefaultTripId(newDefaultId === "" ? null : newDefaultId);
  }

  async function loadTrip() {
    try {
      setError(null);
      const data = await fetchTrip(id);
      setTrip(data);
    } catch (err: any) {
      setError(err.message || "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }

  const sortedReceipts = useMemo(() => {
    const receipts = trip?.receipts || [];
    return [...receipts].sort((a: ReceiptListItem, b: ReceiptListItem) => {
      if (sortBy === "amount") {
        return (Number(b.total) || 0) - (Number(a.total) || 0);
      }
      return new Date(b.capturedAt || 0).getTime() - new Date(a.capturedAt || 0).getTime();
    });
  }, [trip?.receipts, sortBy]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            loadTrip();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Trip not found</Text>
      </View>
    );
  }

  const grandTotal = trip.totals?._grandTotal || 0;
  const currency = trip.receipts?.[0]?.currency || "USD";
  const categories = trip.totals
    ? Object.entries(trip.totals)
        .filter(([k]) => !k.startsWith("_"))
        .map(([cat, total]) => ({ category: cat, total: total as number }))
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tripName}>{trip.name}</Text>
            <Text style={styles.dateRange}>
              {trip.startDate} \u2014 {trip.endDate}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{trip.receiptCount || 0}</Text>
            <Text style={styles.statLabel}>Receipts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {currency} {grandTotal.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Expenses</Text>
          </View>
        </View>
      </View>

      {categories.length > 0 && (
        <View style={styles.categoryBreakdown}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <View style={styles.categoryRow}>
            {categories.map((c) => (
              <View key={c.category} style={styles.categoryStat}>
                <CategoryChip category={c.category} size="sm" />
                <Text style={styles.categoryAmount}>
                  {currency}                   {(typeof c.total === 'number' ? c.total : 0).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === "date" && styles.sortChipActive]}
          onPress={() => setSortBy("date")}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortChipText, sortBy === "date" && styles.sortChipTextActive]}>
            Date
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === "amount" && styles.sortChipActive]}
          onPress={() => setSortBy("amount")}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortChipText, sortBy === "amount" && styles.sortChipTextActive]}>
            Amount
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedReceipts}
        keyExtractor={(item: ReceiptListItem) => item.id}
        renderItem={({ item }: { item: ReceiptListItem }) => (
          <ReceiptCard
            id={item.id}
            merchant={item.merchant}
            total={Number(item.total || 0)}
            currency={item.currency}
            category={item.category}
            status={item.status}
            capturedAt={item.capturedAt}
            thumbnailPath=""
            onPress={(receiptId) =>
              navigation.navigate("ReceiptDetail", { id: receiptId })
            }
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: 80 + insets.bottom }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No receipts in this trip</Text>
            <TouchableOpacity
              style={styles.emptyCaptureButton}
              onPress={() => navigation.navigate("CaptureModal", { tripId: id })}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyCaptureButtonText}>Capture a receipt</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => navigation.navigate("CaptureModal", { tripId: id })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} style={{ fontWeight: "300" }} />
      </TouchableOpacity>

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: spacing.xxxl + insets.bottom }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Edit Trip</Text>

              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Trip Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. JFK→LHR June"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.modalFieldRow}>
                <View style={[styles.modalField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Start Date</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editStart}
                    onChangeText={(v) => setEditStart(formatDateInput(v))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={10}
                    selectTextOnFocus
                  />
                </View>
                <View style={[styles.modalField, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>End Date</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editEnd}
                    onChangeText={(v) => setEditEnd(formatDateInput(v))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={10}
                    selectTextOnFocus
                  />
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Project code or client name..."
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleSaveEdit}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>Save Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.bodyMd,
    color: colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  retryButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "700",
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  tripName: {
    ...typography.displaySm,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dateRange: {
    ...typography.bodyMd,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  statValue: {
    ...typography.headlineLg,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryBreakdown: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  categoryStat: {
    alignItems: "center",
    gap: spacing.xs,
  },
  categoryAmount: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  list: {
    paddingVertical: spacing.sm,
    paddingBottom: 80,
  },
  empty: {
    padding: spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.textTertiary,
  },
  emptyCaptureButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  emptyCaptureButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "600",
  },
  sortRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.onPrimary,
  },
  editButton: {
    ...typography.labelMd,
    color: colors.primary,
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
    elevation: 6,
    shadowColor: colors.shadowStrong,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.onPrimary,
    fontWeight: "300",
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
});
