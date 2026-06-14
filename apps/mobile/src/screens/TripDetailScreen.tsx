import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { fetchTrip, updateTrip } from "../api/client";
import { ReceiptCard } from "../components/ReceiptCard";
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
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centered}>
        <Text>Trip not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{trip.name}</Text>
        <Text style={styles.dateRange}>
          {trip.startDate} — {trip.endDate}
        </Text>
        {trip.notes ? <Text style={styles.notes}>{trip.notes}</Text> : null}
        <Text style={styles.count}>
          {trip.receiptCount} receipt{trip.receiptCount !== 1 ? "s" : ""}
        </Text>
        {trip.totals?._grandTotal > 0 && (
          <Text style={styles.grandTotal}>
            Total: {trip.receipts[0]?.currency || "USD"}{" "}
            {trip.totals._grandTotal.toFixed(2)}
          </Text>
        )}
      </View>

      {/* Category totals */}
      {trip.totals && (
        <View style={styles.totals}>
          {Object.entries(trip.totals)
            .filter(([k]) => !k.startsWith("_"))
            .map(([cat, total]) => (
              <View key={cat} style={styles.totalRow}>
                <Text style={styles.totalCategory}>{cat}</Text>
                <Text style={styles.totalValue}>${(total as number).toFixed(2)}</Text>
              </View>
            ))}
        </View>
      )}

      <FlatList
        data={trip.receipts}
        keyExtractor={(item: ReceiptListItem) => item.id}
        renderItem={({ item }: { item: ReceiptListItem }) => (
          <ReceiptCard
            id={item.id}
            merchant={item.merchant}
            total={item.total}
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
    backgroundColor: "#F9FAFB",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  notes: {
    fontSize: 14,
    color: "#374151",
    marginTop: 8,
    fontStyle: "italic",
  },
  count: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  grandTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
    marginTop: 4,
  },
  totals: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalCategory: {
    fontSize: 14,
    color: "#374151",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
});
