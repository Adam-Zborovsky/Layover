import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { fetchReceipts, exportReceipts, getExportUrl } from "../api/client";
import * as Sharing from "expo-sharing";
import { Paths, File } from "expo-file-system";
import { colors, typography, spacing, radii } from "../ui/theme";
import type { ReceiptListItem, PaginatedResponse } from "@recipts/shared";

type ExportFormat = "zip" | "pdf" | "csv";

export function ExportScreen() {
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("zip");

  useEffect(() => {
    loadReceipts();
  }, []);

  async function loadReceipts() {
    try {
      const data = (await fetchReceipts({ pageSize: 500 })) as PaginatedResponse<ReceiptListItem>;
      setReceipts(data.items);
    } catch (err) {
      console.error(err);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === receipts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(receipts.map((r) => r.id)));
    }
  }

  async function doExport() {
    const ids = Array.from(selected);
    if (!ids.length) {
      Alert.alert("No receipts selected", "Select at least one receipt to export.");
      return;
    }

    setExporting(true);
    try {
      const result = (await exportReceipts(ids, [activeFormat])) as {
        results: { format: string; path: string }[];
      };

      if (result.results?.length) {
        const exportPath = result.results[0].path;
        const filePart = exportPath.split(/[\\/]/).pop();
        if (!filePart) throw new Error("Invalid export path");

        const url = await getExportUrl(filePart);
        const file = await File.downloadFileAsync(url, Paths.document);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        } else {
          Alert.alert("Export saved", `File saved to ${file.uri}`);
        }
      }
    } catch (err: any) {
      Alert.alert("Export failed", err.message || "Unknown error");
    } finally {
      setExporting(false);
    }
  }

  const formats: { key: ExportFormat; label: string; desc: string }[] = [
    { key: "zip", label: "ZIP", desc: "Images with custom names" },
    { key: "pdf", label: "PDF", desc: "Expense report, one per page" },
    { key: "csv", label: "CSV", desc: "Spreadsheet rows" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export</Text>
        <TouchableOpacity style={styles.selectAllBtn} onPress={selectAll} activeOpacity={0.7}>
          <Text style={styles.selectAllText}>
            {selected.size === receipts.length ? "Deselect All" : "Select All"} ({selected.size}/{receipts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
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
                <Text style={styles.itemMerchant}>{item.merchant || "Processing..."}</Text>
                <Text style={styles.itemMeta}>
                  {item.category} \u00B7 {item.currency} {Number(item.total).toFixed(2)}
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
            const active = activeFormat === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.formatCard, active && styles.formatCardActive]}
                onPress={() => setActiveFormat(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.formatLabel, active && styles.formatLabelActive]}>
                  {f.label}
                </Text>
                <Text style={styles.formatDesc}>{f.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {exporting ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ padding: spacing.lg }} />
        ) : (
          <TouchableOpacity
            style={styles.exportButton}
            onPress={doExport}
            activeOpacity={0.8}
          >
            <Text style={styles.exportButtonText}>Export &amp; Share</Text>
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
});
