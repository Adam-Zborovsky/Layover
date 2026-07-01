import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  fetchReceipts,
  exportReceipts,
  getExportUrl,
  fetchTrips,
  fetchExportLog,
} from "../api/client";
import { getAuthToken } from "../api/auth";
import { showErrorAlert } from "../utils/errors";
import * as Sharing from "expo-sharing";
import { Paths, File } from "expo-file-system";
import { colors, typography, spacing, radii } from "../ui/theme";
import type {
  ReceiptListItem,
  PaginatedResponse,
  ExportResult,
} from "@recipts/shared";

type ExportFormat = "zip" | "pdf" | "csv";

interface TripItem {
  id: string;
  name: string;
}

export function ExportScreen() {
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Set<ExportFormat>>(
    new Set(["zip"])
  );
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [exportLog, setExportLog] = useState<ExportResult[]>([]);

  useEffect(() => {
    loadReceipts();
    loadTrips();
    loadExportLog();
  }, []);

  async function loadReceipts() {
    try {
      const data = (await fetchReceipts({
        pageSize: 500,
      })) as PaginatedResponse<ReceiptListItem>;
      setReceipts(data.items || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadTrips() {
    try {
      const data = (await fetchTrips()) as TripItem[];
      setTrips(Array.isArray(data) ? data : []);
    } catch {}
  }

  async function loadExportLog() {
    try {
      const data = (await fetchExportLog()) as ExportResult[];
      setExportLog(Array.isArray(data) ? data : []);
    } catch {}
  }

  const filteredReceipts = useMemo(() => {
    if (!activeTripId) return receipts;
    return (receipts || []).filter((r) => r.tripId === activeTripId);
  }, [receipts, activeTripId]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filteredReceipts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredReceipts.map((r) => r.id)));
    }
  }

  function toggleFormat(fmt: ExportFormat) {
    setSelectedFormats((prev) => {
      const next = new Set(prev);
      if (next.has(fmt)) next.delete(fmt);
      else next.add(fmt);
      return next;
    });
  }

  async function doExport() {
    const ids = Array.from(selected);
    if (!ids.length) {
      Alert.alert("No receipts selected", "Select at least one receipt to export.");
      return;
    }
    if (selectedFormats.size === 0) {
      Alert.alert("No format selected", "Select at least one export format.");
      return;
    }

    setExporting(true);
    try {
      const result = (await exportReceipts(
        ids,
        Array.from(selectedFormats)
      )) as {
        results: { format: string; path: string }[];
      };

      if (result.results?.length) {
        const exportPath = result.results[0].path;
        const filePart = exportPath.split(/[\\/]/).pop();
        if (!filePart) throw new Error("Invalid export path");

        const url = await getExportUrl(filePart);
        const token = await getAuthToken();
        const file = await File.downloadFileAsync(url, Paths.document, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        } else {
          Alert.alert("Export saved", `File saved to ${file.uri}`);
        }

        loadExportLog();
      }
    } catch (err: any) {
      showErrorAlert("Export failed", err, "Unknown error");
    } finally {
      setExporting(false);
    }
  }

  const formats: { key: ExportFormat; label: string; desc: string }[] = [
    { key: "zip", label: "ZIP", desc: "Images with custom names" },
    { key: "pdf", label: "PDF", desc: "Expense report, one per page" },
    { key: "csv", label: "CSV", desc: "Spreadsheet rows" },
  ];

  function formatDate(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export</Text>
        <TouchableOpacity
          style={styles.selectAllBtn}
          onPress={selectAll}
          activeOpacity={0.7}
        >
          <Text style={styles.selectAllText}>
            {selected.size === filteredReceipts.length
              ? "Deselect All"
              : "Select All"}{" "}
            ({selected.size}/{filteredReceipts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredReceipts || []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          trips.length > 0 ? (
            <View style={styles.tripFilterSection}>
              <Text style={styles.sectionLabel}>Filter by Trip</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tripChipRow}
              >
                <TouchableOpacity
                  style={[
                    styles.tripChip,
                    !activeTripId && styles.tripChipActive,
                  ]}
                  onPress={() => setActiveTripId(null)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tripChipText,
                      !activeTripId && styles.tripChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {(trips || []).map((t) => {
                  const isActive = activeTripId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.tripChip,
                        isActive && styles.tripChipActive,
                      ]}
                      onPress={() => setActiveTripId(t.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.tripChipText,
                          isActive && styles.tripChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null
        }
        ListFooterComponent={
          exportLog.length > 0 ? (
            <View style={styles.exportHistorySection}>
              <Text style={styles.sectionLabel}>Previous Exports</Text>
              {exportLog.map((entry) => (
                <View key={entry.id} style={styles.exportHistoryItem}>
                  <View style={styles.exportHistoryLeft}>
                    <Text style={styles.exportHistoryDate}>
                      {formatDate(entry.createdAt)}
                    </Text>
                    <Text style={styles.exportHistoryFormats}>
                      {(entry.files || []).map((f) => f.format.toUpperCase()).join(", ")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          entry.status === "complete"
                            ? colors.statusConfirmed
                            : entry.status === "failed"
                              ? colors.error
                              : colors.statusProcessing,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isSel = selected.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.item, isSel && styles.itemSelected]}
              onPress={() => toggleSelect(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isSel && styles.checkboxChecked]}>
                {isSel && <Text style={styles.checkmark}>&#x2713;</Text>}
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemMerchant}>
                  {item.merchant || "Processing..."}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.category} · {item.currency}{" "}
                  {(Number(item.total) || 0).toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />

      <View style={styles.exportPanel}>
        <View style={styles.formatRow}>
          {formats.map((f) => {
            const active = selectedFormats.has(f.key);
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.formatCard, active && styles.formatCardActive]}
                onPress={() => toggleFormat(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.formatLabel,
                    active && styles.formatLabelActive,
                  ]}
                >
                  {f.label}
                </Text>
                <Text style={styles.formatDesc}>{f.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {exporting ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ padding: spacing.lg }}
          />
        ) : (
          <TouchableOpacity
            style={styles.exportButton}
            onPress={doExport}
            activeOpacity={0.8}
          >
            <Text style={styles.exportButtonText}>Export & Share</Text>
          </TouchableOpacity>
        )}
      </View>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    ...typography.displaySm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  selectAllBtn: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.primaryDim,
  },
  selectAllText: {
    ...typography.labelSm,
    color: colors.primary,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tripFilterSection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tripChipRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  tripChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tripChipActive: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  tripChipText: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  tripChipTextActive: {
    color: colors.primary,
  },
  list: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  itemSelected: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  itemBody: {
    flex: 1,
  },
  itemMerchant: {
    ...typography.headlineMd,
    color: colors.textPrimary,
  },
  itemMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exportPanel: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  formatRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  formatCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  formatCardActive: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  formatLabel: {
    ...typography.labelMd,
    color: colors.textSecondary,
    fontWeight: "700",
    marginBottom: 2,
  },
  formatLabelActive: {
    color: colors.primary,
  },
  formatDesc: {
    ...typography.bodySm,
    color: colors.textTertiary,
    textAlign: "center",
  },
  exportButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exportButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  exportHistorySection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  exportHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
  },
  exportHistoryLeft: {
    flex: 1,
  },
  exportHistoryDate: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  exportHistoryFormats: {
    ...typography.labelSm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: spacing.sm,
  },
});
