import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../constants/theme";
import { useTheme } from "./ThemeContext";

const AlertContext = createContext({});

// Global reference holder for non-hook usages
export const CustomAlert = {
  alert: (title, message, buttons, options) => {},
  showSuccess: (title, message, onPress) => {},
  showError: (title, message, onPress) => {},
  showWarning: (title, message, onPress) => {},
  showConfirm: (title, message, onConfirm, onCancel, confirmText, cancelText, isDestructive) => {},
};

export const AlertProvider = ({ children }) => {
  const { colors, isDark } = useTheme();

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info", // 'success' | 'error' | 'warning' | 'info' | 'confirm'
    buttons: [],
    customContent: null,
  });

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showAlert = (config) => {
    let type = config.type || "info";
    let buttons = config.buttons || [];

    // If no buttons provided, default to OK
    if (!buttons || buttons.length === 0) {
      buttons = [
        {
          text: "OK",
          onPress: () => hideAlert(),
          style: "default",
        },
      ];
    }

    setAlertConfig({
      visible: true,
      title: config.title || "",
      message: config.message || "",
      type,
      buttons,
      customContent: config.customContent || null,
    });

    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideAlert = (callback) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAlertConfig((prev) => ({ ...prev, visible: false }));
      if (typeof callback === "function") {
        callback();
      }
    });
  };

  // Helper methods
  const showSuccess = (title, message, onPress) => {
    showAlert({
      title: title || "Success 🎉",
      message: message || "Operation completed successfully.",
      type: "success",
      buttons: [
        {
          text: "Continue",
          onPress: () => {
            hideAlert(onPress);
          },
        },
      ],
    });
  };

  const showError = (title, message, onPress) => {
    showAlert({
      title: title || "Something Went Wrong",
      message: message || "An unexpected error occurred. Please try again.",
      type: "error",
      buttons: [
        {
          text: "Dismiss",
          style: "cancel",
          onPress: () => {
            hideAlert(onPress);
          },
        },
      ],
    });
  };

  const showWarning = (title, message, onPress) => {
    showAlert({
      title: title || "Notice",
      message: message || "",
      type: "warning",
      buttons: [
        {
          text: "Understood",
          onPress: () => {
            hideAlert(onPress);
          },
        },
      ],
    });
  };

  const showConfirm = (
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false
  ) => {
    showAlert({
      title: title || "Confirmation Required",
      message: message || "Are you sure you want to proceed?",
      type: isDestructive ? "error" : "confirm",
      buttons: [
        {
          text: cancelText,
          style: "cancel",
          onPress: () => {
            hideAlert(onCancel);
          },
        },
        {
          text: confirmText,
          style: isDestructive ? "destructive" : "default",
          onPress: () => {
            hideAlert(onConfirm);
          },
        },
      ],
    });
  };

  // Connect global CustomAlert object
  useEffect(() => {
    CustomAlert.alert = (title, message, buttons = []) => {
      // Convert React Native Alert.alert buttons format
      const formattedButtons =
        buttons.length > 0
          ? buttons.map((btn) => ({
              text: btn.text || "OK",
              style: btn.style || "default",
              onPress: () => {
                hideAlert(btn.onPress);
              },
            }))
          : [
              {
                text: "OK",
                style: "default",
                onPress: () => hideAlert(),
              },
            ];

      const isDestructive = buttons.some((b) => b.style === "destructive");
      let type = "info";
      const titleLower = (title || "").toLowerCase();
      const msgLower = (message || "").toLowerCase();

      if (titleLower.includes("success") || titleLower.includes("congrat") || titleLower.includes("submitted")) {
        type = "success";
      } else if (
        isDestructive ||
        titleLower.includes("error") ||
        titleLower.includes("failed") ||
        titleLower.includes("delete") ||
        msgLower.includes("fail") ||
        msgLower.includes("cannot delete")
      ) {
        type = isDestructive ? "error" : "error";
      } else if (titleLower.includes("confirm") || titleLower.includes("warning") || titleLower.includes("alert")) {
        type = isDestructive ? "error" : "warning";
      }

      showAlert({
        title,
        message,
        type,
        buttons: formattedButtons,
      });
    };

    CustomAlert.showSuccess = showSuccess;
    CustomAlert.showError = showError;
    CustomAlert.showWarning = showWarning;
    CustomAlert.showConfirm = showConfirm;

    // Automatically route all native Alert.alert calls across the app to our professional custom modal
    const originalAlert = Alert.alert;
    Alert.alert = (title, message, buttons = [], options) => {
      CustomAlert.alert(title, message, buttons, options);
    };

    return () => {
      Alert.alert = originalAlert;
    };
  }, []);

  const getIconConfig = (type) => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark",
          color: COLORS.success,
          bg: COLORS.successBgLight,
        };
      case "error":
        return {
          icon: "close",
          color: COLORS.error,
          bg: COLORS.errorBgLight,
        };
      case "warning":
        return {
          icon: "alert",
          color: COLORS.warning,
          bg: COLORS.warningBgLight,
        };
      case "confirm":
        return {
          icon: "help",
          color: COLORS.primary,
          bg: COLORS.primaryBgLight,
        };
      case "info":
      default:
        return {
          icon: "information",
          color: COLORS.primary,
          bg: COLORS.primaryBgLight,
        };
    }
  };

  const iconInfo = getIconConfig(alertConfig.type);

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        hideAlert,
        showSuccess,
        showError,
        showWarning,
        showConfirm,
      }}
    >
      {children}

      <Modal
        visible={alertConfig.visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => hideAlert()}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => hideAlert()}
          />
          <Animated.View
            style={[
              styles.alertCard,
              {
                backgroundColor: colors.cardBg,
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            {/* Animated Icon Ring */}
            <View style={[styles.iconRing, { backgroundColor: iconInfo.bg }]}>
              <View style={[styles.iconCircle, { backgroundColor: iconInfo.color }]}>
                <Ionicons name={iconInfo.icon} size={32} color={COLORS.textContrast} />
              </View>
            </View>

            {/* Title */}
            {alertConfig.title ? (
              <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>
                {alertConfig.title}
              </Text>
            ) : null}

            {/* Message */}
            {alertConfig.message ? (
              <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>
                {alertConfig.message}
              </Text>
            ) : null}

            {/* Custom Content if provided */}
            {alertConfig.customContent}

            {/* Buttons Row */}
            <View
              style={[
                styles.buttonsContainer,
                alertConfig.buttons.length > 2 && styles.buttonsStacked,
              ]}
            >
              {alertConfig.buttons.map((btn, index) => {
                const isCancel = btn.style === "cancel";
                const isDestructive = btn.style === "destructive";
                const isSingle = alertConfig.buttons.length === 1;

                let btnBg = COLORS.primary;
                let textColor = COLORS.textContrast;
                let borderWidth = 0;
                let borderColor = "transparent";

                if (isCancel) {
                  btnBg = colors.backgroundAlt;
                  textColor = colors.textPrimary;
                  borderWidth = 1;
                  borderColor = colors.borderLight;
                } else if (isDestructive) {
                  btnBg = COLORS.error;
                  textColor = COLORS.textContrast;
                }

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    style={[
                      styles.btnBase,
                      isSingle && styles.btnFull,
                      !isSingle && alertConfig.buttons.length === 2 && styles.btnHalf,
                      alertConfig.buttons.length > 2 && styles.btnFull,
                      {
                        backgroundColor: btnBg,
                        borderWidth,
                        borderColor,
                      },
                    ]}
                    onPress={() => {
                      if (btn.onPress) {
                        btn.onPress();
                      } else {
                        hideAlert();
                      }
                    }}
                  >
                    <Text style={[styles.btnText, { color: textColor }]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext);

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  alertCard: {
    width: Math.min(width - 40, 360),
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  iconRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  alertMessage: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  buttonsContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  buttonsStacked: {
    flexDirection: "column",
    gap: 8,
  },
  btnBase: {
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnHalf: {
    flex: 1,
  },
  btnFull: {
    width: "100%",
  },
  btnText: {
    fontSize: 14.5,
    fontWeight: "700",
  },
});
