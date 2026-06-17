import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { getNetworkStateAsync } from "expo-network";
import { uploadReceipt } from "../api/client";
import { addToQueue, getQueueCount } from "../services/offlineQueue";
import { colors, typography, spacing, radii } from "../ui/theme";

type FlashMode = "off" | "on";

export function CaptureScreen({ navigation, route }: { navigation: any; route: any }) {
  const tripId: string | undefined = route.params?.tripId;
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    const state = await getNetworkStateAsync();
    setIsOffline(!(state.isConnected && state.isInternetReachable));
    const count = await getQueueCount();
    setQueueLength(count);
  }

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>&#x1F4F7;</Text>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Layover needs camera permission to scan your receipts and track expenses.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePhoto() {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (photo?.base64) {
        setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
      }
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].base64) {
      setCapturedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  async function submitReceipt() {
    if (!capturedImage) return;
    setUploading(true);

    const parts = capturedImage.split(",");
    const base64 = parts[1] || parts[0];
    const mimeType = capturedImage.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    try {
      await uploadReceipt(base64, mimeType, tripId);
      navigation.goBack();
    } catch (_err) {
      await addToQueue({
        id: Date.now().toString(),
        imageBase64: base64,
        mimeType,
        tripId,
      });
      Alert.alert("Queued", "Receipt saved offline. It will upload when you're back online.");
      navigation.goBack();
    } finally {
      setUploading(false);
    }
  }

  function retake() {
    setCapturedImage(null);
  }

  if (capturedImage) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: capturedImage }} style={styles.preview} />
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={retake}
            activeOpacity={0.7}
          >
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
            onPress={submitReceipt}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {uploading ? "Uploading..." : "Submit"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" flash={flashMode}>
        <View style={styles.cameraOverlay}>
          {isOffline && (
            <View style={styles.offlinePill}>
              <Text style={styles.offlinePillText}>Offline — queued{queueLength > 0 ? ` (${queueLength})` : ""}</Text>
            </View>
          )}
          <View style={styles.guideFrame}>
            <View style={styles.guideCornerTL} />
            <View style={styles.guideCornerTR} />
            <View style={styles.guideCornerBL} />
            <View style={styles.guideCornerBR} />
            <Text style={styles.guidanceText}>Align receipt within the frame</Text>
          </View>
          <View style={styles.captureRow}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickFromGallery}
              activeOpacity={0.7}
            >
              <Text style={styles.galleryButtonText}>&#x1F5BC;</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              activeOpacity={0.7}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.flashButton}
              onPress={() => setFlashMode((m) => (m === "off" ? "on" : "off"))}
              activeOpacity={0.7}
            >
              <Text style={styles.flashButtonText}>
                {flashMode === "on" ? "\u26A1" : "\u26A1"}
              </Text>
              <Text style={styles.flashLabel}>{flashMode === "on" ? "On" : "Off"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 40,
  },
  guideFrame: {
    position: "absolute",
    top: "20%",
    left: "10%",
    right: "10%",
    bottom: "30%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: radii.lg,
  },
  guideCornerTL: {
    position: "absolute",
    top: -1,
    left: -1,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
    borderTopLeftRadius: radii.md,
  },
  guideCornerTR: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.primary,
    borderTopRightRadius: radii.md,
  },
  guideCornerBL: {
    position: "absolute",
    bottom: -1,
    left: -1,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: colors.primary,
    borderBottomLeftRadius: radii.md,
  },
  guideCornerBR: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: colors.primary,
    borderBottomRightRadius: radii.md,
  },
  captureRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    borderWidth: 4,
    borderColor: colors.onPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.onPrimary,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryButtonText: {
    fontSize: 28,
    color: colors.onPrimary,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.textPrimary,
  },
  preview: {
    flex: 1,
    resizeMode: "contain",
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.md,
  },
  retakeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.tertiary,
    alignItems: "center",
  },
  retakeButtonText: {
    ...typography.labelMd,
    color: colors.tertiary,
  },
  submitButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  permissionText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  permissionButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
  },
  permissionButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: "600",
  },
  offlinePill: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: colors.statusProcessing,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    zIndex: 10,
  },
  offlinePillText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 12,
  },
  guidanceText: {
    position: "absolute",
    bottom: -24,
    alignSelf: "center",
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "500",
  },
  flashButton: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    justifyContent: "center",
    alignItems: "center",
  },
  flashButtonText: {
    fontSize: 24,
    color: colors.onPrimary,
  },
  flashLabel: {
    ...typography.labelSm,
    color: colors.onPrimary,
    marginTop: 2,
  },
});
