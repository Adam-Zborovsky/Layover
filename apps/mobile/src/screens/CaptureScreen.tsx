import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { uploadReceipt } from "../api/client";
import { addToQueue } from "../services/offlineQueue";
import { checkHealth } from "../api/client";

export function CaptureScreen({ navigation }: { navigation: any }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          Grant camera permissions to scan receipts
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
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
      setCapturedImage(
        `data:image/jpeg;base64,${result.assets[0].base64}`
      );
    }
  }

  async function submitReceipt() {
    if (!capturedImage) return;
    setUploading(true);

    try {
      const online = await checkHealth();
      const parts = capturedImage.split(",");
      const base64 = parts[1] || parts[0];
      const mimeType = capturedImage.startsWith("data:image/png") ? "image/png" : "image/jpeg";

      if (online) {
        await uploadReceipt(base64, mimeType);
        navigation.goBack();
      } else {
        await addToQueue({
          id: Date.now().toString(),
          imageBase64: base64,
          mimeType,
        });
        Alert.alert("Queued", "Receipt saved offline. It will upload when you're back online.");
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload receipt");
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
          <TouchableOpacity style={styles.retakeButton} onPress={retake}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
            onPress={submitReceipt}
            disabled={uploading}
          >
            <Text style={styles.submitButtonText}>
              {uploading ? "Uploading..." : "Submit Receipt"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraOverlay}>
          <View style={styles.captureRow}>
            <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
              <Text style={styles.galleryButtonText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <View style={styles.galleryButton} />
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
  captureRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
  },
  galleryButton: {
    width: 80,
    alignItems: "center",
  },
  galleryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  preview: {
    flex: 1,
    resizeMode: "contain",
  },
  previewActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#111827",
  },
  retakeButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#374151",
  },
  retakeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#10B981",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F9FAFB",
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
