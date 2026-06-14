import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ReceiptCard } from "../components/ReceiptCard";
import { fetchReceipts } from "../api/client";
import type { PaginatedResponse, ReceiptListItem } from "@recipts/shared";

export function HomeScreen({ navigation }: { navigation: any }) {
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page: 1,
        pageSize: 100,
      };
      if (search) params.search = search;
      if (activeFilter === "needs_review") params.needsReview = true;
      else if (activeFilter) params.status = activeFilter;

      const data = (await fetchReceipts(params)) as PaginatedResponse<ReceiptListItem>;
      setReceipts(data.items);
    } catch (err) {
      console.error("Failed to load receipts:", err);
    }
  }, [search, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filters = [
    { key: null, label: "All" },
    { key: "needs_review", label: "Needs Review" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PROCESSING", label: "Processing" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search receipts..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
        />
        {/* Filter chips */}
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key || "all"}
              style={[
                styles.filterChip,
                activeFilter === f.key && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === f.key && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReceiptCard
            id={item.id}
            merchant={item.merchant}
            total={item.total}
            currency={item.currency}
            category={item.category}
            status={item.status}
            capturedAt={item.capturedAt}
            thumbnailPath=""
            onPress={(id) => navigation.navigate("ReceiptDetail", { id })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the camera button to scan your first receipt
            </Text>
          </View>
        }
      />
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
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterChipActive: {
    backgroundColor: "#111827",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  list: {
    paddingVertical: 8,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
