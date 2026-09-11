import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";

export default function Test2() {
  const [currentStep, setCurrentStep] = useState(0);

  const getprofile = () => {
    setCurrentStep(0); // Upload
  };

  useEffect(() => {
    getprofile();
  }, []);

  const aiSteps = [
    { icon: "cloud-upload-outline", title: "Uploading Image...", color: COLORS.primary },
    { icon: "cut-outline", title: "Removing Background...", color: COLORS.error },
    { icon: "sparkles-outline", title: "AI Enhancing Product...", color: COLORS.menuBank },
    { icon: "sunny-outline", title: "Applying Studio Lighting...", color: COLORS.warning },
    { icon: "scan-outline", title: "Upscaling to HD...", color: COLORS.success },
    { icon: "image-outline", title: "Generating White Background...", color: COLORS.info },
    { icon: "ellipse-outline", title: "Creating Realistic Shadow...", color: COLORS.textSlate },
    { icon: "color-filter-outline", title: "Correcting Colors...", color: COLORS.menuPassword },
    { icon: "crop-outline", title: "Smart Cropping...", color: COLORS.primaryDark },
    { icon: "checkmark-circle", title: "Product Photo Ready!", color: COLORS.success },
  ];

  return (
    <View style={styles.container}>
      {/* AI Tools */}
      <View style={styles.toolsCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Editing Tools</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolsGrid}>
          <TouchableOpacity style={styles.toolItem}>
            <View style={[styles.toolIcon, styles.iconBlueBg]}>
              <Ionicons name="cut-outline" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.toolText}>Remove BG</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem}>
            <View style={[styles.toolIcon, styles.iconPurpleBg]}>
              <Ionicons name="sparkles-outline" size={28} color={COLORS.menuBank} />
            </View>
            <Text style={styles.toolText}>AI Enhance</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem}>
            <View style={[styles.toolIcon, styles.iconAmberBg]}>
              <Ionicons name="sunny-outline" size={28} color={COLORS.warning} />
            </View>
            <Text style={styles.toolText}>Studio Light</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem}>
            <View style={[styles.toolIcon, styles.iconGreenBg]}>
              <Ionicons name="scan-outline" size={28} color={COLORS.success} />
            </View>
            <Text style={styles.toolText}>HD Upscale</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem}>
            <View style={[styles.toolIcon, styles.iconCyanBg]}>
              <Ionicons name="image-outline" size={28} color={COLORS.infoText} />
            </View>
            <Text style={styles.toolText}>White BG</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem}>
            <View style={[styles.toolIcon, styles.iconGrayBg]}>
              <Ionicons name="ellipse-outline" size={28} color={COLORS.textSlate} />
            </View>
            <Text style={styles.toolText}>Auto Shadow</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem}>
            <View style={[styles.toolIcon, styles.iconRoseBg]}>
              <Ionicons name="color-filter-outline" size={28} color={COLORS.error} />
            </View>
            <Text style={styles.toolText}>Color Fix</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolItem}>
            <View style={[styles.toolIcon, styles.iconIndigoBg]}>
              <Ionicons name="crop-outline" size={28} color={COLORS.primaryDark} />
            </View>
            <Text style={styles.toolText}>Smart Crop</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Processing Card */}
      <View style={styles.processingCard}>
        <View style={styles.processingHeader}>
          <View>
            <Text style={styles.processingTitle}>AI Processing</Text>
            <Text style={styles.processingSub}>Optimizing your product photo</Text>
          </View>

          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>72%</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressFill, styles.progress72]} />
        </View>

        {/* Current Step */}
        <View style={styles.currentStepCard}>
          <Ionicons name="sparkles" color={COLORS.menuBank} size={22} />
          <View style={styles.stepInfoContainer}>
            <Text style={styles.stepTitle}>Current Step</Text>
            <Text style={styles.stepValue}>AI Enhancing Product</Text>
          </View>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Ionicons name="time-outline" color={COLORS.primary} size={22} />
            <Text style={styles.infoLabel}>Estimated</Text>
            <Text style={styles.infoValue}>18 sec</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="layers-outline" color={COLORS.success} size={22} />
            <Text style={styles.infoLabel}>Completed</Text>
            <Text style={styles.infoValue}>5 / 8</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="flash-outline" color={COLORS.warning} size={22} />
            <Text style={styles.infoLabel}>Quality</Text>
            <Text style={styles.infoValue}>HD</Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={aiSteps[currentStep].icon}
              size={26}
              color={aiSteps[currentStep].color}
            />
          </View>

          <View style={styles.statusTextContainer}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text style={styles.statusValue}>{aiSteps[currentStep].title}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0) + 15,
  },
  statusContainer: {
    marginTop: 20,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryBgLight,
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  statusLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  toolsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    padding: 18,
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  seeAll: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  toolItem: {
    width: "23%",
    alignItems: "center",
    marginBottom: 20,
  },
  toolIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  iconBlueBg: {
    backgroundColor: COLORS.primaryBgLight,
  },
  iconPurpleBg: {
    backgroundColor: "#F3E8FF",
  },
  iconAmberBg: {
    backgroundColor: COLORS.warningBgLight,
  },
  iconGreenBg: {
    backgroundColor: COLORS.successBgLight,
  },
  iconCyanBg: {
    backgroundColor: COLORS.infoBgLight,
  },
  iconGrayBg: {
    backgroundColor: COLORS.borderLight,
  },
  iconRoseBg: {
    backgroundColor: COLORS.errorBgLight,
  },
  iconIndigoBg: {
    backgroundColor: COLORS.primaryBgLight,
  },
  toolText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSlate,
    textAlign: "center",
  },
  processingCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 22,
    padding: 18,
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  processingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  processingSub: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  percentBadge: {
    backgroundColor: COLORS.primaryBgLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
  },
  percentText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  progressBarTrack: {
    marginTop: 18,
    height: 10,
    backgroundColor: COLORS.borderLight,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  progress72: {
    width: "72%",
  },
  currentStepCard: {
    marginTop: 20,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  stepInfoContainer: {
    marginLeft: 12,
    flex: 1,
  },
  stepTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  stepValue: {
    fontWeight: "700",
    fontSize: 15,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  infoBox: {
    width: "31%",
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 15,
  },
  infoLabel: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoValue: {
    marginTop: 4,
    fontWeight: "700",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
});