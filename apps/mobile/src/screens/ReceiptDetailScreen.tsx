import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  fetchReceipt,
  updateReceipt,
  reprocessReceipt,
  deleteReceipt,
  getReceiptImageUrl,
  fetchTrips,
} from "../api/client";
import { ConfidenceIndicator, StatusBadge } from "../components/Badges";
import { RECEIPT_CATEGORIES, type Receipt } from "@recipts/shared";

export function ReceiptDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { id } = route.params;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [trips, setTrips] = useState<{ id: string; name: string }[]>([]);
  const [edited, setEdited] = useState<Record<string, any>>({});

  useEffect(() => {
    loadReceipt();
    loadTrips();
  }, [id]);

  async function loadReceipt() {
    try {
      const data = (await fetchReceipt(id)) as Receipt;
      setReceipt(data);
      setEdited({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getReceiptImageUrl(id).then(setImageUrl);
  }, [id]);

  async function loadTrips() {
    try {
      const data = (await fetchTrips()) as { id: string; name: string }[];
      setTrips(data);
    } catch {}
  }

  function updateField(field: string, value: any) {
    setEdited((prev) => ({ ...prev, [field]: value }));
  }

  async function saveChanges() {
    if (!receipt) return;
    try {
      await updateReceipt(id, edited);
      setEditing(false);
      loadReceipt();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save");
    }
  }

  async function handleReprocess() {
    Alert.alert("Re-run AI", "Choose model:", [
      {
        text: "Flash (Default)",
        onPress: async () => {
          await reprocessReceipt(id);
          loadReceipt();
        },
      },
      {
        text: "Pro (Better accuracy)",
        onPress: async () => {
          await reprocessReceipt(id, "pro");
          loadReceipt();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleDelete() {
    Alert.alert("Delete Receipt", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteReceipt(id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.centered}>
        <Text>Receipt not found</Text>
      </View>
    );
  }

  const display = { ...receipt, ...edited };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
      ) : null}

      <View style={styles.statusRow}>
        <StatusBadge status={receipt.status} />
        {receipt.aiConfidence > 0 && (
          <ConfidenceIndicator confidence={receipt.aiConfidence} />
        )}
      </View>

      {/* Editable Fields */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Merchant</Text>
        <TextInput
          style={styles.input}
          value={display.merchant}
          onChangeText={(v) => updateField("merchant", v)}
          editable={editing}
          placeholder="Merchant name"
          placeholderTextColor="#D1D5DB"
        />
      </View>

      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Total</Text>
          <TextInput
            style={styles.input}
            value={display.total?.toString()}
            onChangeText={(v) => updateField("total", parseFloat(v) || 0)}
            editable={editing}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#D1D5DB"
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Currency</Text>
          <TextInput
            style={styles.input}
            value={display.currency}
            onChangeText={(v) => updateField("currency", v.toUpperCase())}
            editable={editing}
            maxLength={3}
            placeholder="USD"
            placeholderTextColor="#D1D5DB"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Category</Text>
        {editing ? (
          <View style={styles.chipRow}>
            {RECEIPT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  display.category === cat && styles.categoryChipActive,
                ]}
                onPress={() => updateField("category", cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    display.category === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.readonlyValue}>{display.category}</Text>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Date</Text>
        <TextInput
          style={styles.input}
          value={display.purchaseDate}
          onChangeText={(v) => updateField("purchaseDate", v)}
          editable={editing}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#D1D5DB"
        />
      </View>

      <View style={styles.fieldRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Subtotal</Text>
          <TextInput
            style={styles.input}
            value={display.subtotal?.toString()}
            onChangeText={(v) => updateField("subtotal", parseFloat(v) || 0)}
            editable={editing}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#D1D5DB"
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Tax</Text>
          <TextInput
            style={styles.input}
            value={display.tax?.toString()}
            onChangeText={(v) => updateField("tax", parseFloat(v) || 0)}
            editable={editing}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#D1D5DB"
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Tip</Text>
          <TextInput
            style={styles.input}
            value={display.tip?.toString()}
            onChangeText={(v) => updateField("tip", parseFloat(v) || 0)}
            editable={editing}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#D1D5DB"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Payment Method</Text>
        <TextInput
          style={styles.input}
          value={display.paymentMethod}
          onChangeText={(v) => updateField("paymentMethod", v)}
          editable={editing}
          placeholder="Visa, Cash, etc."
          placeholderTextColor="#D1D5DB"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Location</Text>
        <TextInput
          style={styles.input}
          value={display.locationCity}
          onChangeText={(v) => updateField("locationCity", v)}
          editable={editing}
          placeholder="City"
          placeholderTextColor="#D1D5DB"
        />
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          value={display.locationAddress}
          onChangeText={(v) => updateField("locationAddress", v)}
          editable={editing}
          placeholder="Address"
          placeholderTextColor="#D1D5DB"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Trip</Text>
        {editing ? (
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !display.tripId && styles.categoryChipActive,
              ]}
              onPress={() => updateField("tripId", null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  !display.tripId && styles.categoryChipTextActive,
                ]}
              >
                None
              </Text>
            </TouchableOpacity>
            {trips.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.categoryChip,
                  display.tripId === t.id && styles.categoryChipActive,
                ]}
                onPress={() => updateField("tripId", t.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    display.tripId === t.id && styles.categoryChipTextActive,
                  ]}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.readonlyValue}>
            {trips.find((t) => t.id === receipt.tripId)?.name || "None"}
          </Text>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={display.notes}
          onChangeText={(v) => updateField("notes", v)}
          editable={editing}
          placeholder="Add notes..."
          placeholderTextColor="#D1D5DB"
          multiline
        />
      </View>

      {/* File name preview */}
      <View style={styles.fileNameRow}>
        <Text style={styles.fieldLabel}>File:</Text>
        <Text style={styles.fileName}>{receipt.fileName}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {editing ? (
          <>
            <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditing(false);
                setEdited({});
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reprocessButton} onPress={handleReprocess}>
              <Text style={styles.reprocessButtonText}>Re-run AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  readonlyValue: {
    fontSize: 15,
    color: "#111827",
    paddingVertical: 10,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickerWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  fileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  fileName: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "monospace",
  },
  actions: {
    gap: 10,
  },
  editButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  reprocessButton: {
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  reprocessButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
});
