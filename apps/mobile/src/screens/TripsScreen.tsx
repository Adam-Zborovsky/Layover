import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchTrips, createTrip, deleteTrip } from "../api/client";

interface TripItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  receiptCount: number;
}

export function TripsScreen({ navigation }: { navigation: any }) {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const load = useCallback(async () => {
    try {
      const data = (await fetchTrips()) as TripItem[];
      setTrips(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleCreate() {
    if (!newName.trim() || !newStart.trim() || !newEnd.trim()) {
      Alert.alert("Missing fields", "Please fill in all fields");
      return;
    }

    try {
      await createTrip({ name: newName, startDate: newStart, endDate: newEnd });
      setModalVisible(false);
      setNewName("");
      setNewStart("");
      setNewEnd("");
      load();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create trip");
    }
  }

  async function handleDelete(id: string) {
    Alert.alert("Delete Trip", "Receipts in this trip will be unassigned.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTrip(id);
          load();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tripCard}
            onPress={() => navigation.navigate("TripDetail", { id: item.id })}
            onLongPress={() => handleDelete(item.id)}
          >
            <View style={styles.tripCardBody}>
              <Text style={styles.tripName}>{item.name}</Text>
              <Text style={styles.tripDates}>
                {item.startDate} — {item.endDate}
              </Text>
              <Text style={styles.tripCount}>
                {item.receiptCount} receipt{item.receiptCount !== 1 ? "s" : ""}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a trip to group related receipts together
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Trip</Text>

            <Text style={styles.fieldLabel}>Trip Name</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. JFK→LHR June"
              placeholderTextColor="#D1D5DB"
            />

            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={newStart}
              onChangeText={setNewStart}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#D1D5DB"
            />

            <Text style={styles.fieldLabel}>End Date</Text>
            <TextInput
              style={styles.input}
              value={newEnd}
              onChangeText={setNewEnd}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#D1D5DB"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tripCardBody: {
    flex: 1,
  },
  tripName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  tripDates: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  tripCount: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  chevron: {
    fontSize: 24,
    color: "#D1D5DB",
    fontWeight: "300",
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "400",
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
