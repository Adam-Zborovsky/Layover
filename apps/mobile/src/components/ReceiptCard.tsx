import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { CategoryChip, StatusBadge } from "./Badges";
import { getReceiptThumbnailUrl } from "../api/client";

interface ReceiptCardProps {
  id: string;
  merchant: string;
  total: number;
  currency: string;
  category: string;
  status: string;
  capturedAt: string;
  thumbnailPath: string;
  onPress: (id: string) => void;
}

export function ReceiptCard({
  id,
  merchant,
  total,
  currency,
  category,
  status,
  capturedAt,
  thumbnailPath,
  onPress,
}: ReceiptCardProps) {
  const [thumbUrl, setThumbUrl] = React.useState<string>("");

  React.useEffect(() => {
    getReceiptThumbnailUrl(id).then(setThumbUrl).catch(() => {});
  }, [id]);

  const date =
    capturedAt
      ? new Date(capturedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "";

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(id)} activeOpacity={0.7}>
      {thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderText}>REC</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.merchant} numberOfLines={1}>
            {merchant || "Processing..."}
          </Text>
          <Text style={styles.amount}>
            {currency} {total.toFixed(2)}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardMeta}>
            <CategoryChip category={category} size="sm" />
            {date ? <Text style={styles.date}>{date}</Text> : null}
          </View>
          <StatusBadge status={status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  thumb: {
    width: 80,
    height: 80,
    backgroundColor: "#F3F4F6",
  },
  thumbPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  thumbPlaceholderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  cardBody: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  merchant: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  date: {
    fontSize: 12,
    color: "#6B7280",
  },
});
