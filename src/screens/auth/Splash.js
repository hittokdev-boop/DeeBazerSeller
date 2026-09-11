import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  Easing,
  DeviceEventEmitter,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import COLORS from "../../constants/theme";

const { width } = Dimensions.get("window");
const TRACK_WIDTH = width * 0.72;

// Background Floating Stars & Particles Configuration
const PARTICLES = [
  { top: "10%", left: "15%", size: 14, type: "sparkle", duration: 2200, delay: 0 },
  { top: "18%", left: "80%", size: 10, type: "star", duration: 1800, delay: 300 },
  { top: "26%", left: "8%", size: 6, type: "dot", duration: 2400, delay: 600 },
  { top: "34%", left: "88%", size: 16, type: "sparkle", duration: 2000, delay: 200 },
  { top: "46%", left: "10%", size: 12, type: "star", duration: 2600, delay: 500 },
  { top: "56%", left: "84%", size: 8, type: "dot", duration: 1900, delay: 100 },
  { top: "66%", left: "16%", size: 14, type: "sparkle", duration: 2300, delay: 400 },
  { top: "76%", left: "78%", size: 10, type: "star", duration: 2100, delay: 700 },
  { top: "12%", left: "55%", size: 7, type: "dot", duration: 2500, delay: 350 },
  { top: "84%", left: "28%", size: 12, type: "sparkle", duration: 1700, delay: 250 },
  { top: "22%", left: "32%", size: 6, type: "dot", duration: 2000, delay: 450 },
  { top: "62%", left: "42%", size: 10, type: "star", duration: 2300, delay: 150 },
];

const TwinkleParticle = ({ item }) => {
  const anim = useRef(new Animated.Value(0.2)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.95,
          duration: item.duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.2,
          duration: item.duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: item.duration * 1.2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: item.duration * 1.2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const timer = setTimeout(() => {
      twinkle.start();
      float.start();
    }, item.delay);

    return () => {
      clearTimeout(timer);
      twinkle.stop();
      float.stop();
    };
  }, [anim, floatAnim, item.delay, item.duration]);

  return (
    <Animated.View
      style={[
        styles.particleBase,
        {
          top: item.top,
          left: item.left,
          opacity: anim,
          transform: [{ translateY: floatAnim }],
        },
      ]}
    >
      {item.type === "sparkle" && (
        <Ionicons name="sparkles" size={item.size} color="rgba(147, 197, 253, 0.9)" />
      )}
      {item.type === "star" && (
        <Ionicons name="star" size={item.size} color="rgba(224, 231, 255, 0.85)" />
      )}
      {item.type === "dot" && (
        <View
          style={{
            width: item.size,
            height: item.size,
            borderRadius: item.size / 2,
            backgroundColor: "rgba(96, 165, 250, 0.8)",
          }}
        />
      )}
    </Animated.View>
  );
};

const Splash = ({ navigation }) => {
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.4)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleScale = useRef(new Animated.Value(0.85)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bgPulseAnim = useRef(new Animated.Value(0)).current;
  const iconPulseAnim = useRef(new Animated.Value(1)).current;

  // Status message state
  const [statusMessage, setStatusMessage] = useState("Initializing Seller Engine...");

  useEffect(() => {
    let isMounted = true;

    // 1. Ambient background pulse loop
    const bgPulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bgPulseAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bgPulseAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    bgPulseLoop.start();

    // 2. Icon breathing loop
    const iconBreathingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulseAnim, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconPulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    iconBreathingLoop.start();

    // Reset progress value
    progressAnim.setValue(0);

    // 3. Main entrance animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 25,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleScale, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Helper to animate progress bar to a specific target value
    const animateProgressTo = (toValue, duration = 400) => {
      return new Promise((resolve) => {
        Animated.timing(progressAnim, {
          toValue,
          duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start(resolve);
      });
    };

    // 4. Data Loading Dependent Progress Flow
    const initializeApp = async () => {
      try {
        // Stage 1: Engine Initialization (0% -> 35%)
        setStatusMessage("Initializing Seller Engine...");
        await animateProgressTo(0.35, 600);

        // Stage 2: Data & Session Fetching from AsyncStorage (35% -> 75%)
        setStatusMessage("Securing Merchant Connection...");
        const [token, isLoggedIn] = await Promise.all([
          AsyncStorage.getItem("token"),
          AsyncStorage.getItem("isLoggedIn"),
          new Promise((resolve) => setTimeout(resolve, 400)), // Smooth minimum load window
        ]);
        await animateProgressTo(0.75, 700);

        // Stage 3: Preparing Console & Finalizing (75% -> 100%)
        setStatusMessage("Preparing Store Console...");
        await animateProgressTo(1.0, 500);

        if (!isMounted) return;

        // Stage 4: Navigate to Destination based on token presence
        setTimeout(() => {
          if (token && token.trim().length > 0 && isLoggedIn === "true") {
            DeviceEventEmitter.emit("authStateChanged", token);
          } else {
            DeviceEventEmitter.emit("authStateChanged", null);
            navigation.replace("SellerRegistration");
          }
        }, 200);
      } catch (err) {
        console.log("Splash initializeApp error:", err);
        await animateProgressTo(1.0, 300);
        if (isMounted) navigation.replace("SellerRegistration");
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      bgPulseLoop.stop();
      iconBreathingLoop.stop();
    };
  }, [
    fadeAnim,
    logoScaleAnim,
    titleTranslateY,
    subtitleScale,
    progressAnim,
    bgPulseAnim,
    iconPulseAnim,
    navigation,
  ]);

  // Interpolations for background ambient light
  const ring1Scale = bgPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.28],
  });

  const ring1Opacity = bgPulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.12, 0.25, 0.12],
  });

  const ring2Scale = bgPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });

  const ring2Opacity = bgPulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.18, 0.35, 0.18],
  });

  // Progress Bar width interpolation (pixel-based for 100% smooth rendering)
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Deep Royal Midnight Gradient Background */}
      <LinearGradient
        colors={COLORS.splashGradient}
        style={styles.gradientContainer}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        {/* Background Twinkling Stars & Particles */}
        {PARTICLES.map((particle, idx) => (
          <TwinkleParticle key={idx} item={particle} />
        ))}

        {/* Concentric Ambient Light Rings */}
        <Animated.View
          style={[
            styles.ambientRingOuter,
            {
              transform: [{ scale: ring1Scale }],
              opacity: ring1Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ambientRingInner,
            {
              transform: [{ scale: ring2Scale }],
              opacity: ring2Opacity,
            },
          ]}
        />

        {/* Main Center Content Box */}
        <Animated.View
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Logo Card */}
          <Animated.View
            style={[
              styles.logoCardOuter,
              {
                transform: [{ scale: logoScaleAnim }],
              },
            ]}
          >
            {/* Soft Glow Underlay */}
            <View style={styles.logoGlowUnderlay} />

            <View style={styles.glassBorder}>
              <LinearGradient
                colors={COLORS.splashGlassGradient}
                style={styles.logoCardInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Animated.View
                  style={[
                    styles.iconPulseWrapper,
                    {
                      transform: [{ scale: iconPulseAnim }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={COLORS.splashIconGradient}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="storefront-sharp" size={46} color={COLORS.textContrast} />
                  </LinearGradient>
                </Animated.View>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Animated App Title */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            <View style={styles.titleRow}>
              <Text style={styles.brandTitleText}>DeeBazer</Text>
              <View style={styles.proDot} />
            </View>
          </Animated.View>

          {/* Subtitle Merchant Badge */}
          <Animated.View
            style={[
              styles.badgeContainer,
              {
                transform: [{ scale: subtitleScale }],
              },
            ]}
          >
            <LinearGradient
              colors={COLORS.splashBadgeGradient}
              style={styles.badgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="shield-checkmark" size={14} color={COLORS.splashBadgeIcon} style={styles.badgeIcon} />
              <Text style={styles.subtitleBadgeText}>SELLER CENTER</Text>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* Bottom Loading Progress Section */}
        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.statusText}>{statusMessage}</Text>

          {/* Custom Animated Progress Bar Track */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressWidth,
                },
              ]}
            >
              <LinearGradient
                colors={["#38BDF8", "#2563EB", "#60A5FA"]}
                style={styles.progressGradientFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </Animated.View>
          </View>

          {/* Merchant Trust Footer */}
          <View style={styles.footerTrustRow}>
            <Ionicons name="lock-closed" size={12} color={COLORS.splashFooterIcon} style={styles.footerIcon} />
            <Text style={styles.footerTrustText}>256-BIT ENCRYPTED MERCHANT NETWORK</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.splashBackground,
  },
  gradientContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Background Twinkling Particles
  particleBase: {
    position: "absolute",
    zIndex: 1,
  },
  // Ambient Glowing Rings
  ambientRingOuter: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: COLORS.splashAmbientOuter,
  },
  ambientRingInner: {
    position: "absolute",
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: (width * 0.65) / 2,
    backgroundColor: COLORS.splashAmbientInner,
  },
  // Main Center Content Box
  mainContent: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  // Logo Card Aesthetics
  logoCardOuter: {
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlowUnderlay: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.splashGlowUnderlay,
    opacity: 0.45,
    elevation: 20,
    shadowColor: COLORS.splashAmbientOuter,
    shadowOpacity: 0.8,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
  },
  glassBorder: {
    borderRadius: 36,
    padding: 2,
    backgroundColor: COLORS.splashGlassBorder,
  },
  logoCardInner: {
    width: 106,
    height: 106,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.splashGlassInnerBorder,
    overflow: "hidden",
  },
  iconPulseWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 78,
    height: 78,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  // Title & Subtitle Styling
  titleContainer: {
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  brandTitleText: {
    fontSize: 38,
    fontWeight: "900",
    color: COLORS.textContrast,
    letterSpacing: 1.2,
  },
  proDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.splashDot,
    marginLeft: 4,
  },
  badgeContainer: {
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.splashBadgeBorder,
  },
  badgeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: {
    marginRight: 6,
  },
  subtitleBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.splashBadgeText,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  // Bottom Progress & Footer Section
  bottomSection: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  statusText: {
    fontSize: 13,
    color: COLORS.splashStatusText,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  progressTrack: {
    width: TRACK_WIDTH,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 24,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressGradientFill: {
    width: TRACK_WIDTH,
    height: "100%",
  },
  footerTrustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerIcon: {
    marginRight: 5,
  },
  footerTrustText: {
    fontSize: 10,
    color: COLORS.splashFooterText,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
});
