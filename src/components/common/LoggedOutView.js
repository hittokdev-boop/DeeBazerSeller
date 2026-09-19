import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

const { width } = Dimensions.get("window");

const LoggedOutView = ({
  iconName = "lock-closed-outline",
  title = "You Are Logged Out",
  subtitle = "Please log in to access your account.",
  features = [],
  onLoginPress,
  onRegisterPress,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Ambient background glow */}
      <View
        style={[
          styles.ambientGlow,
          {
            backgroundColor: isDark
              ? "rgba(46, 125, 255, 0.12)"
              : "rgba(46, 125, 255, 0.08)",
          },
        ]}
      />

      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.borderLight }]}>
        {/* Status Icon with Glowing Rings */}
        <View
          style={[
            styles.iconOuterRing,
            {
              backgroundColor: isDark ? "rgba(46, 125, 255, 0.15)" : "#EFF6FF",
              borderColor: isDark ? "rgba(46, 125, 255, 0.3)" : "#BFDBFE",
            },
          ]}
        >
          <View style={[styles.iconInner, { backgroundColor: COLORS.primary }]}>
            <Ionicons name={iconName} size={38} color="#FFFFFF" />
          </View>
        </View>

        {/* Pill Badge */}
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
              borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A",
            },
          ]}
        >
          <Ionicons
            name="lock-closed"
            size={13}
            color={isDark ? "#FBBF24" : "#D97706"}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.badgeText,
              { color: isDark ? "#FBBF24" : "#D97706" },
            ]}
          >
            Login Required
          </Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>

        {/* Feature Points (if provided) */}
        {features && features.length > 0 && (
          <View
            style={[
              styles.featuresBox,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.03)"
                  : colors.backgroundAlt || "#F8FAFC",
                borderColor: colors.borderLight,
              },
            ]}
          >
            {features.map((item, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={COLORS.primary}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text
                  style={[
                    styles.featureText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: COLORS.primary }]}
          onPress={onLoginPress}
          activeOpacity={0.88}
        >
          <Ionicons
            name="log-in-outline"
            size={22}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.loginBtnText}>Log In to Your Account</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#FFFFFF"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>

        {onRegisterPress && (
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={onRegisterPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.registerBtnText, { color: COLORS.primary }]}>
              New seller? <Text style={styles.registerHighlight}>Register here</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  ambientGlow: {
    position: "absolute",
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    top: "20%",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: "center",
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  iconOuterRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  featuresBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 22,
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  loginBtn: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  registerBtn: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  registerBtnText: {
    fontSize: 13,
    fontWeight: "500",
  },
  registerHighlight: {
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});

export default LoggedOutView;
