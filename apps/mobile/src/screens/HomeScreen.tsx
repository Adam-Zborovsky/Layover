import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ReceiptCard } from "../components/ReceiptCard";
import { TripSectionHeader } from "../components/TripSectionHeader";
import { fetchReceipts, fetchTrips } from "../api/client";
import { getAuthToken } from "../api/auth";
import { processQueue } from "../services/queueProcessor";
import { useCollapsedTrips } from "../hooks/useCollapsedTrips";
import { colors, typography, spacing, radii } from "../ui/theme";
import type { PaginatedResponse, ReceiptListItem } from "@recipts/shared";

interface TripSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

const UNTAGGED_SECTION_ID = "__untagged__";

export function HomeScreen({ navigation }: { navigation: any }) {
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef(search);
  searchRef.current = search;

  const load = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      setNeedsSetup(true);
      setIsLoading(false);
      return;
    }
    setNeedsSetup(false);
    try {
      setError(null);
      const params: Record<string, string | number | boolean | undefined> = {
        page: 1,
        pageSize: 100,
      };
      if (searchRef.current) params.search = searchRef.current;
      if (activeFilter === "needs_review") params.needsReview = true;
      else if (activeFilter) params.status = activeFilter;

      const [data, tripsData] = await Promise.all([
        fetchReceipts(params) as Promise<PaginatedResponse<ReceiptListItem>>,
        fetchTrips() as Promise<TripSummary[]>,
      ]);
      setReceipts(data.items);
      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (err: any) {
      setError(err.message || "Failed to load receipts");
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      load();
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, load]);

  useFocusEffect(
    useCallback(() => {
      load();
      processQueue();
    }, [load])
  );

  useEffect(() => {
    const hasProcessing = receipts.some((r) => r.status === "PROCESSING");
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      load();
    }, 3000);
    return () => clearInterval(interval);
  }, [receipts, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const retry = () => {
    setIsLoading(true);
    load();
  };

  const filters = [
    { key: null, label: "All" },
    { key: "needs_review", label: "Needs Review" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PROCESSING", label: "Processing" },
  ];

  const totalAmount = (receipts || []).reduce((sum, r) => sum + Number(r.total || 0), 0);
  const totalCurrency = receipts?.[0]?.currency || "USD";

  const { collapsedIds, toggle } = useCollapsedTrips();

  const tripsById = new Map(trips.map((t) => [t.id, t]));

  const receiptsByTrip = new Map<string, ReceiptListItem[]>();
  for (const r of receipts || []) {
    const key = r.tripId || UNTAGGED_SECTION_ID;
    const list = receiptsByTrip.get(key) || [];
    list.push(r);
    receiptsByTrip.set(key, list);
  }

  const sortedTripIds = Array.from(receiptsByTrip.keys())
    .filter((id) => id !== UNTAGGED_SECTION_ID)
    .sort((a, b) => {
      const dateA = tripsById.get(a)?.startDate || "";
      const dateB = tripsById.get(b)?.startDate || "";
      return dateB.localeCompare(dateA);
    });

  const orderedSectionIds = receiptsByTrip.has(UNTAGGED_SECTION_ID)
    ? [UNTAGGED_SECTION_ID, ...sortedTripIds]
    : sortedTripIds;

  const sections = orderedSectionIds.map((sectionId) => {
    const sectionReceipts = receiptsByTrip.get(sectionId) || [];
    const isUntagged = sectionId === UNTAGGED_SECTION_ID;
    const trip = isUntagged ? null : tripsById.get(sectionId) || null;
    const isCollapsed = collapsedIds.has(sectionId);
    const sectionTotal = sectionReceipts.reduce((sum, r) => sum + Number(r.total || 0), 0);
    const sectionCurrency = sectionReceipts[0]?.currency || "USD";

    return {
      id: sectionId,
      title: isUntagged ? "No trip" : trip?.name || "Unknown trip",
      dateRange: isUntagged || !trip ? null : `${trip.startDate} — ${trip.endDate}`,
      receiptCount: sectionReceipts.length,
      totalAmount: sectionTotal,
      currency: sectionCurrency,
      collapsed: isCollapsed,
      data: isCollapsed ? [] : sectionReceipts,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.appTitle}>Layover</Text>
            <Text style={styles.subtitle}>
              {(receipts || []).length} receipt{(receipts || []).length !== 1 ? "s" : ""}
              {totalAmount > 0 && `  \u00B7  ${totalCurrency} ${totalAmount.toFixed(2)}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.captureFab}
            onPress={() => navigation.navigate("CaptureModal")}
            activeOpacity={0.8}
            accessibilityLabel="Capture new receipt"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={28} color={colors.onPrimary} style={{ marginTop: -2 }} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={14} color={colors.textTertiary} style={{ marginRight: spacing.sm }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search receipts..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            returnKeyType="search"
            accessibilityLabel="Search receipts"
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
                accessibilityLabel={`Filter by ${f.label}`}
                accessibilityRole="button"
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

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <TripSectionHeader
            title={section.title}
            dateRange={section.dateRange}
            receiptCount={section.receiptCount}
            totalAmount={section.totalAmount}
            currency={section.currency}
            collapsed={section.collapsed}
            onToggle={() => toggle(section.id)}
          />
        )}
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
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
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
                accessibilityLabel="Retry loading receipts"
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : needsSetup ? (
            <View style={styles.empty}>
              <Ionicons name="settings-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>Welcome to Layover</Text>
              <Text style={styles.emptySubtitle}>
                Set up your server connection in Settings to start tracking receipts.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("Settings")}
                activeOpacity={0.7}
                accessibilityLabel="Open Settings"
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonText}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          ) : search ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>
                No receipts match "{search}"
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptySubtitle}>
                Capture your first receipt to start tracking expenses
              </Text>
            </View>
          )
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
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.secondary,
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
  emptyButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  emptyButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "700",
  },
  centered: {
    alignItems: "center",
    paddingTop: 120,
  },
});
