import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/theme";

const { width } = Dimensions.get("window");

const Splash = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Run intro animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 15,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Check login state and navigate after delay
    const checkState = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
        // Simulated network/API load delay
        setTimeout(() => {
          if (isLoggedIn === "true") {
            navigation.replace("SellerTabs");
          } else {
            navigation.replace("Login");
          }
        }, 2200);
      } catch (err) {
        console.log("Splash state error:", err);
        setTimeout(() => navigation.replace("Login"), 2200);
      }
    };

    checkState();
  }, [fadeAnim, scaleAnim, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={COLORS.primaryGradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Circular Logo Card */}
          <View style={styles.logoCard}>
            <LinearGradient
              colors={COLORS.primaryGradient}
              style={styles.logoIconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="storefront" size={42} color={COLORS.textContrast} />
            </LinearGradient>
          </View>

          {/* Typography */}
          <Text style={styles.titleText}>DeeBazar</Text>
          <Text style={styles.subtitleText}>Seller Center</Text>
        </Animated.View>

        {/* Loading Indicator */}
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={COLORS.textContrast} style={{ marginBottom: 10 }} />
          <Text style={styles.loadingText}>Initializing Seller Portal...</Text>
        </View>

        {/* Brand Footer */}
        <Text style={styles.footerText}>Secure Merchant Network</Text>
      </LinearGradient>
    </View>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  logoCard: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.cardBg,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 20,
  },
  logoIconGradient: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.textContrast,
    letterSpacing: 1.5,
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryLight,
    letterSpacing: 3,
    marginTop: 5,
    textTransform: "uppercase",
  },
  loaderContainer: {
    position: "absolute",
    bottom: 90,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.primaryLight,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  footerText: {
    position: "absolute",
    bottom: 30,
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
