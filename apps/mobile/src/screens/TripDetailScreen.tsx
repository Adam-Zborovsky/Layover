import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from "react-native";
import { fetchTrip } from "../api/client";
import { ReceiptCard } from "../components/ReceiptCard";
import { CategoryChip } from "../components/Badges";
import { colors, typography, spacing, radii } from "../ui/theme";
import type { ReceiptListItem } from "@recipts/shared";

export function TripDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { id } = route.params;
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrip();
  }, [id]);

  async function loadTrip() {
    try {
      const data = await fetchTrip(id);
      setTrip(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
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
            <Text style={styles.statValue}>{trip.receiptCount}</Text>
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
                  {currency} {(c.total as number).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={trip.receipts}
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
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No receipts in this trip</Text>
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
});
