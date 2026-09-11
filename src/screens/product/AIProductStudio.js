import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  PermissionsAndroid,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

const AIProductStudio = ({ navigation }) => {
  const { colors } = useTheme();
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("Ready for AI editing");
  const [activeTool, setActiveTool] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [compareTab, setCompareTab] = useState("after");

  const requestCameraPermission = async () => {
    if (Platform.OS !== "android") return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "DeeBazar Seller needs camera access to capture product photos for AI Studio.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const handlePickImage = async (source) => {
    if (source === "camera") {
      const hasPerm = await requestCameraPermission();
      if (!hasPerm) {
        Alert.alert("Permission Required", "Camera permission is needed to take product photos.");
        return;
      }
    }

    const launcher = source === "camera" ? launchCamera : launchImageLibrary;
    launcher(
      {
        mediaType: "photo",
        quality: 0.9,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert("Error", "Could not pick image.");
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri;
          setSelectedImage(uri);
          setProcessedImage(null);
          setCompareTab("before");
          setProcessingStatus("Image uploaded. Select an AI tool below.");
        }
      }
    );
  };

  const handleApplyTool = (toolName) => {
    const sourceImg = selectedImage || "https://picsum.photos/600?random=31";
    if (!selectedImage) {
      setSelectedImage(sourceImg);
    }

    setActiveTool(toolName);
    setIsProcessing(true);
    setProgress(15);
    setProcessingStatus(`AI is applying ${toolName}...`);

    setTimeout(() => {
      setProgress(45);
      setProcessingStatus("Detecting product boundaries & subject...");
    }, 400);

    setTimeout(() => {
      setProgress(85);
      setProcessingStatus("Removing background & refining studio light...");
    }, 900);

    setTimeout(() => {
      setProgress(100);
      setProcessingStatus(`${toolName} completed successfully!`);
      setIsProcessing(false);
      
      const bgRemovedVariant = "https://picsum.photos/600?random=88";
      setProcessedImage(bgRemovedVariant);
      setCompareTab("after");

      Alert.alert("AI Studio Success", `${toolName} processed successfully!`);
    }, 1400);
  };

  const handleApplyPreset = (presetName) => {
    setActivePreset(presetName);
    handleApplyTool(`Preset: ${presetName}`);
  };

  const handleReset = () => {
    setProcessedImage(null);
    setActiveTool(null);
    setActivePreset(null);
    setProgress(0);
    setCompareTab("before");
    Alert.alert("Reset Done", "Restored to original image.");
  };

  const handleDownload = () => {
    Alert.alert("Success", "Studio processed image downloaded to gallery!");
  };

  const handleUsePhoto = () => {
    const finalPhoto = processedImage || selectedImage || "https://picsum.photos/600?random=31";
    Alert.alert(
      "Photo Selected",
      "Use this studio photo for your product listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use Photo",
          onPress: () => {
            navigation.navigate("AddProductScreen", { newImage: finalPhoto });
          }
        }
      ]
    );
  };

  const currentDisplayImage = compareTab === "before"
    ? (selectedImage || "https://picsum.photos/600?random=31")
    : (processedImage || selectedImage || "https://picsum.photos/600?random=31");

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={COLORS.textGrayDark}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          AI Product Studio
        </Text>

        <TouchableOpacity onPress={() => handleApplyTool("Auto AI Studio")}>
          <Ionicons
            name="sparkles"
            size={26}
            color={COLORS.menuBank}
          />
        </TouchableOpacity>
      </View>

      {/* Upload Box */}
      <View style={styles.uploadCard}>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={handlePickImage}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={55}
            color={COLORS.primary}
          />
          <Text style={styles.uploadTitle}>
            Upload Product Image
          </Text>
          <Text style={styles.uploadSub}>
            PNG / JPG / WEBP • Tap to select photo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Preview Card */}
      <View style={styles.previewCard}>
        <Image
          source={{ uri: currentDisplayImage }}
          style={styles.previewImage}
        />
        
        {/* Status Badge */}
        <View style={[styles.badge, compareTab === 'after' && processedImage ? styles.badgeSuccess : styles.badgeDefault]}>
          <Ionicons
            name={compareTab === 'after' && processedImage ? "checkmark-circle" : "image-outline"}
            size={14}
            color={COLORS.textContrast}
          />
          <Text style={styles.badgeText}>
            {compareTab === 'after' && processedImage ? "BG Removed (Studio HD)" : "Original Image"}
          </Text>
        </View>

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={COLORS.menuBank} />
            <Text style={styles.overlayText}>Processing AI Edit...</Text>
          </View>
        )}
      </View>

      {/* Compare Row / Tab Switcher */}
      <View style={styles.compareRow}>
        <TouchableOpacity
          style={[styles.compareBox, compareTab === "before" && styles.compareBoxActive]}
          onPress={() => setCompareTab("before")}
        >
          <Text style={[styles.compareTitle, compareTab === "before" && styles.compareTitleActive]}>
            Before (Original)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.compareBox, compareTab === "after" && styles.compareBoxActive]}
          onPress={() => setCompareTab("after")}
        >
          <Text style={[styles.compareTitle, compareTab === "after" && styles.compareTitleActive]}>
            After (BG Removed)
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Tools Grid */}
      <View style={styles.toolsCard}>
        <Text style={styles.sectionTitle}>
          AI Editing Tools
        </Text>

        <View style={styles.toolsGrid}>
          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'Remove BG' && styles.toolItemActive]}
            onPress={() => handleApplyTool('Remove BG')}
          >
            <Ionicons
              name="cut-outline"
              size={28}
              color={COLORS.primary}
            />
            <Text style={styles.toolText}>
              Remove BG
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'AI Enhance' && styles.toolItemActive]}
            onPress={() => handleApplyTool('AI Enhance')}
          >
            <Ionicons
              name="sparkles-outline"
              size={28}
              color={COLORS.menuBank}
            />
            <Text style={styles.toolText}>
              AI Enhance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'HD Upscale' && styles.toolItemActive]}
            onPress={() => handleApplyTool('HD Upscale')}
          >
            <Ionicons
              name="scan-outline"
              size={28}
              color={COLORS.success}
            />
            <Text style={styles.toolText}>
              HD Upscale
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'Studio Light' && styles.toolItemActive]}
            onPress={() => handleApplyTool('Studio Light')}
          >
            <Ionicons
              name="sunny-outline"
              size={28}
              color={COLORS.menuContact}
            />
            <Text style={styles.toolText}>
              Studio Light
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'White BG' && styles.toolItemActive]}
            onPress={() => handleApplyTool('White BG')}
          >
            <Ionicons
              name="image-outline"
              size={28}
              color={COLORS.infoText}
            />
            <Text style={styles.toolText}>
              White BG
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'Auto Color' && styles.toolItemActive]}
            onPress={() => handleApplyTool('Auto Color')}
          >
            <Ionicons
              name="contrast-outline"
              size={28}
              color={COLORS.menuPassword}
            />
            <Text style={styles.toolText}>
              Auto Color
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'Magic Eraser' && styles.toolItemActive]}
            onPress={() => handleApplyTool('Magic Eraser')}
          >
            <Ionicons
              name="brush-outline"
              size={28}
              color={COLORS.error}
            />
            <Text style={styles.toolText}>
              Magic Eraser
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'Smart Crop' && styles.toolItemActive]}
            onPress={() => handleApplyTool('Smart Crop')}
          >
            <Ionicons
              name="crop-outline"
              size={28}
              color={COLORS.primaryDark}
            />
            <Text style={styles.toolText}>
              Smart Crop
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Processing Progress */}
      {(isProcessing || progress > 0) && (
        <View style={styles.processingCard}>
          <View style={styles.processingHeader}>
            <Text style={styles.sectionTitle}>
              AI Processing
            </Text>
            <Text style={styles.progressText}>
              {progress}%
            </Text>
          </View>

          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>

          <Text style={styles.processingStatus}>
            {processingStatus}
          </Text>
        </View>
      )}

      {/* AI Presets */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          AI E-Commerce Presets
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {[
            "Amazon",
            "Flipkart",
            "Blinkit",
            "Meesho",
            "White BG",
            "Luxury",
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.presetChip, activePreset === item && styles.presetChipActive]}
              onPress={() => handleApplyPreset(item)}
            >
              <Text style={[styles.presetText, activePreset === item && styles.presetTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleReset}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={COLORS.error}
          />
          <Text style={styles.resetText}>
            Reset
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={handleDownload}
        >
          <Ionicons
            name="download-outline"
            size={22}
            color={COLORS.textContrast}
          />
          <Text style={styles.downloadText}>
            Download
          </Text>
        </TouchableOpacity>
      </View>

      {/* Use Photo Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.usePhotoBtn}
        onPress={handleUsePhoto}
      >
        <Ionicons
          name="checkmark-circle"
          size={24}
          color={COLORS.textContrast}
        />
        <Text style={styles.usePhotoText}>
          Use This Photo
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AIProductStudio;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0) + 10,
  },
  header: {
    height: 60,
    backgroundColor: COLORS.cardBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },
  uploadCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryBgLight,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 10,
  },
  uploadSub: {
    fontSize: 12,
    color: COLORS.textGrayLight,
    marginTop: 4,
  },
  previewCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    position: "relative",
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  previewImage: {
    width: "100%",
    height: 280,
    resizeMode: "cover",
  },
  badge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeSuccess: {
    backgroundColor: COLORS.success,
  },
  badgeDefault: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  badgeText: {
    color: COLORS.textContrast,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.cardBgOverlay,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.menuBank,
  },
  compareRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    justifyContent: "space-between",
  },
  compareBox: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
  },
  compareBoxActive: {
    borderColor: COLORS.menuBank,
    backgroundColor: COLORS.menuBankLight,
  },
  compareTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  compareTitleActive: {
    color: COLORS.menuBank,
    fontWeight: "700",
  },
  toolsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 18,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textGrayDark,
    marginBottom: 14,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  toolItem: {
    width: "23%",
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  toolItemActive: {
    borderColor: COLORS.menuBank,
    backgroundColor: COLORS.menuBankLight,
  },
  toolText: {
    marginTop: 8,
    fontSize: 11,
    color: COLORS.textGrayMedium,
    fontWeight: "600",
    textAlign: "center",
  },
  processingCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 18,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  processingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.menuBank,
  },
  progressBg: {
    height: 10,
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.menuBank,
    borderRadius: 10,
  },
  processingStatus: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 18,
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  presetChip: {
    backgroundColor: COLORS.primaryBgLight,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  presetChipActive: {
    backgroundColor: COLORS.menuBank,
  },
  presetText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  presetTextActive: {
    color: COLORS.textContrast,
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
  },
  resetBtn: {
    width: "30%",
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  resetText: {
    color: COLORS.error,
    marginLeft: 6,
    fontWeight: "700",
  },
  downloadBtn: {
    width: "66%",
    height: 52,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  downloadText: {
    color: COLORS.textContrast,
    marginLeft: 8,
    fontWeight: "700",
  },
  usePhotoBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 40,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  usePhotoText: {
    color: COLORS.textContrast,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});