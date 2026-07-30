import React, {useState} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import {launchImageLibrary, launchCamera} from "react-native-image-picker";

const AIProductStudio = ({navigation}) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("Ready for AI editing");
  const [activeTool, setActiveTool] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [compareTab, setCompareTab] = useState("after");

  const handlePickImage = () => {
    Alert.alert(
      "Upload Product Image",
      "Choose source to pick image for AI Studio",
      [
        {
          text: "Camera",
          onPress: () => {
            launchCamera({ mediaType: 'photo', quality: 0.8 }, response => {
              if (!response.didCancel && response.assets && response.assets.length > 0) {
                setSelectedImage(response.assets[0].uri);
                setProcessedImage(null);
                setCompareTab("before");
              }
            });
          }
        },
        {
          text: "Gallery",
          onPress: () => {
            launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
              if (!response.didCancel && response.assets && response.assets.length > 0) {
                setSelectedImage(response.assets[0].uri);
                setProcessedImage(null);
                setCompareTab("before");
              }
            });
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
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
      style={{ flex: 1, backgroundColor: "#F6F7FB", paddingTop: 15 }}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back"
            size={22}
            color="#222"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          AI Product Studio
        </Text>

        <TouchableOpacity onPress={() => handleApplyTool("Auto AI Studio")}>
          <Ionicons
            name="sparkles"
            size={26}
            color="#7C3AED"
          />
        </TouchableOpacity>
      </View>

      {/* Upload Box */}
      <View style={styles.uploadCard}>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={handlePickImage}>
          <Ionicons
            name="cloud-upload-outline"
            size={55}
            color="#2E7DFF"
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
            color="#fff"
          />
          <Text style={styles.badgeText}>
            {compareTab === 'after' && processedImage ? "BG Removed (Studio HD)" : "Original Image"}
          </Text>
        </View>

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.overlayText}>Processing AI Edit...</Text>
          </View>
        )}
      </View>

      {/* Compare Row / Tab Switcher */}
      <View style={styles.compareRow}>
        <TouchableOpacity
          style={[styles.compareBox, compareTab === "before" && styles.compareBoxActive]}
          onPress={() => setCompareTab("before")}>
          <Text style={[styles.compareTitle, compareTab === "before" && styles.compareTitleActive]}>
            Before (Original)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.compareBox, compareTab === "after" && styles.compareBoxActive]}
          onPress={() => setCompareTab("after")}>
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
            onPress={() => handleApplyTool('Remove BG')}>
            <Ionicons
              name="cut-outline"
              size={28}
              color="#2E7DFF"
            />
            <Text style={styles.toolText}>
              Remove BG
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'AI Enhance' && styles.toolItemActive]}
            onPress={() => handleApplyTool('AI Enhance')}>
            <Ionicons
              name="sparkles-outline"
              size={28}
              color="#7C3AED"
            />
            <Text style={styles.toolText}>
              AI Enhance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'HD Upscale' && styles.toolItemActive]}
            onPress={() => handleApplyTool('HD Upscale')}>
            <Ionicons
              name="scan-outline"
              size={28}
              color="#16A34A"
            />
            <Text style={styles.toolText}>
              HD Upscale
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'Studio Light' && styles.toolItemActive]}
            onPress={() => handleApplyTool('Studio Light')}>
            <Ionicons
              name="sunny-outline"
              size={28}
              color="#FF9800"
            />
            <Text style={styles.toolText}>
              Studio Light
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'White BG' && styles.toolItemActive]}
            onPress={() => handleApplyTool('White BG')}>
            <Ionicons
              name="image-outline"
              size={28}
              color="#009688"
            />
            <Text style={styles.toolText}>
              White BG
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'Auto Color' && styles.toolItemActive]}
            onPress={() => handleApplyTool('Auto Color')}>
            <Ionicons
              name="contrast-outline"
              size={28}
              color="#E91E63"
            />
            <Text style={styles.toolText}>
              Auto Color
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'Magic Eraser' && styles.toolItemActive]}
            onPress={() => handleApplyTool('Magic Eraser')}>
            <Ionicons
              name="brush-outline"
              size={28}
              color="#F44336"
            />
            <Text style={styles.toolText}>
              Magic Eraser
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolItem, activeTool === 'Smart Crop' && styles.toolItemActive]}
            onPress={() => handleApplyTool('Smart Crop')}>
            <Ionicons
              name="crop-outline"
              size={28}
              color="#3F51B5"
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
          showsHorizontalScrollIndicator={false}>
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
              onPress={() => handleApplyPreset(item)}>
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
          onPress={handleReset}>
          <Ionicons
            name="refresh-outline"
            size={22}
            color="#E53935"
          />
          <Text style={styles.resetText}>
            Reset
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={handleDownload}>
          <Ionicons
            name="download-outline"
            size={22}
            color="#fff"
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
        onPress={handleUsePhoto}>
        <Ionicons
          name="checkmark-circle"
          size={24}
          color="#fff"
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
  header: {
    height: 60,
    backgroundColor: "#fff",
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
    color: "#222",
  },
  uploadCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    elevation: 2,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: "#D0E1FF",
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F8FF",
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7DFF",
    marginTop: 10,
  },
  uploadSub: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  previewCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    position: "relative",
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
    backgroundColor: "#16A34A",
  },
  badgeDefault: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#7C3AED",
  },
  compareRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    justifyContent: "space-between",
  },
  compareBox: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  compareBoxActive: {
    borderColor: "#7C3AED",
    backgroundColor: "#F3E8FF",
  },
  compareTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  compareTitleActive: {
    color: "#7C3AED",
    fontWeight: "700",
  },
  toolsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 14,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  toolItem: {
    width: "23%",
    backgroundColor: "#F7F8FB",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  toolItemActive: {
    borderColor: "#7C3AED",
    backgroundColor: "#F3E8FF",
  },
  toolText: {
    marginTop: 8,
    fontSize: 11,
    color: "#444",
    fontWeight: "600",
    textAlign: "center",
  },
  processingCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    elevation: 3,
  },
  processingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C3AED",
  },
  progressBg: {
    height: 10,
    backgroundColor: "#ECECEC",
    borderRadius: 10,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7C3AED",
    borderRadius: 10,
  },
  processingStatus: {
    marginTop: 12,
    color: "#666",
    fontSize: 13,
    fontWeight: "500",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    elevation: 3,
  },
  presetChip: {
    backgroundColor: "#EEF5FF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  presetChipActive: {
    backgroundColor: "#7C3AED",
  },
  presetText: {
    color: "#2E7DFF",
    fontWeight: "700",
  },
  presetTextActive: {
    color: "#fff",
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
    borderColor: "#E53935",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  resetText: {
    color: "#E53935",
    marginLeft: 6,
    fontWeight: "700",
  },
  downloadBtn: {
    width: "66%",
    height: 52,
    borderRadius: 15,
    backgroundColor: "#2E7DFF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  downloadText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "700",
  },
  usePhotoBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 40,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  usePhotoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});