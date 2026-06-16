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
import { colors, typography, spacing, radii } from "../ui/theme";
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

  const totalAmount = receipts.reduce((sum, r) => sum + Number(r.total || 0), 0);
  const totalCurrency = receipts[0]?.currency || "USD";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.appTitle}>Layover</Text>
            <Text style={styles.subtitle}>
              {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
              {totalAmount > 0 && `  \u00B7  ${totalCurrency} ${totalAmount.toFixed(2)}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.captureFab}
            onPress={() => navigation.navigate("CaptureModal")}
            activeOpacity={0.8}
          >
            <Text style={styles.captureFabIcon}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>&#x1F50D;</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search receipts..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            returnKeyType="search"
          />
        </View>
        <View style={styles.filterRow}>
          {filters.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key || "all"}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReceiptCard
            id={item.id}
            merchant={item.merchant}
            total={Number(item.total || 0)}
            currency={item.currency}
            category={item.category}
            status={item.status}
            capturedAt={item.capturedAt}
            thumbnailPath=""
            onPress={(id) => navigation.navigate("ReceiptDetail", { id })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>&#x1F4F7;</Text>
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptySubtitle}>
              Capture your first receipt to start tracking expenses
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
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  appTitle: {
    ...typography.displaySm,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  captureFab: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  captureFabIcon: {
    fontSize: 24,
    fontWeight: "400",
    color: colors.onPrimary,
    marginTop: -2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.borderLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
  },
  list: {
    paddingVertical: spacing.sm,
    paddingBottom: 80,
  },
  empty: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
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
  },
});
