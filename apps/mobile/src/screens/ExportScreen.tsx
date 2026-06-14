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
import type { ReceiptListItem, PaginatedResponse } from "@recipts/shared";

export function ExportScreen() {
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

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

  async function doExport(format: "zip" | "pdf" | "csv") {
    const ids = Array.from(selected);
    if (!ids.length) {
      Alert.alert("No receipts selected", "Select at least one receipt to export.");
      return;
    }

    setExporting(true);
    try {
      const result = (await exportReceipts(ids, [format])) as {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.selectAllButton} onPress={selectAll}>
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
            >
              <View style={[styles.checkbox, isSel && styles.checkboxChecked]}>
                {isSel && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemMerchant}>{item.merchant || "Processing..."}</Text>
                <Text style={styles.itemMeta}>
                  {item.category} · {item.currency} {item.total.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.exportActions}>
        {exporting ? (
          <ActivityIndicator size="large" color="#111827" />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: "#10B981" }]}
              onPress={() => doExport("zip")}
            >
              <Text style={styles.exportButtonText}>Export ZIP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: "#8B5CF6" }]}
              onPress={() => doExport("pdf")}
            >
              <Text style={styles.exportButtonText}>Export PDF Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: "#06B6D4" }]}
              onPress={() => doExport("csv")}
            >
              <Text style={styles.exportButtonText}>Export CSV</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  selectAllButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  itemSelected: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  itemBody: {
    flex: 1,
  },
  itemMerchant: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  itemMeta: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  exportActions: {
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  exportButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
