import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import COLORS from "../../constants/theme";

const Account = ({ navigation }) => {
  const [profile, setProfile] = React.useState(null);
  const isFocused = useIsFocused();

  const loadProfile = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem("sellerProfile");
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
    } catch (e) {
      console.log("Error loading profile", e);
    }
  };

  React.useEffect(() => {
    if (isFocused) {
      loadProfile();
    }
  }, [isFocused]);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out of your seller account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("isLoggedIn");
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            } catch (err) {
              Alert.alert("Error", "Unable to log out at this time.");
            }
          }
        }
      ]
    );
  };

  const handleMenuPress = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen);
    } else if (item.onPress) {
      item.onPress();
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.backgroundAlt , paddingTop: 15 }}
      contentContainerStyle={{ paddingBottom: 100 }}>

      {/* Profile */}

      <View style={styles.profileCard}>

        <Image
          source={{
            uri: profile?.logoUri || "https://i.pravatar.cc/300?img=12",
          }}
          style={styles.profileImage}
        />

        <Text style={styles.name}>
          {profile?.storeName || "Hittok Store"}
        </Text>

        <Text style={styles.email}>
          {profile?.email || "seller@deebazar.com"}
        </Text>

        <View style={styles.ratingRow}>

          <Ionicons
            name="star"
            size={18}
            color="#FFC107"
          />

          <Text style={styles.rating}>
            4.9 Seller Rating
          </Text>

        </View>

      </View>

      {/* Menu */}

      {[
        {
          icon: "storefront-outline",
          title: "Store Information",
          color: COLORS.menuStore,
          screen: "StoreInfo",
        },
        {
          icon: "person-outline",
          title: "Edit Profile",
          color: COLORS.menuProfile,
          screen: "EditProfile",
        },
        {
          icon: "call-outline",
          title: "Contact Number",
          color: COLORS.menuContact,
          screen: "ContactNumber",
        },
        {
          icon: "card-outline",
          title: "Bank Details",
          color: COLORS.menuBank,
          screen: "BankDetails",
        },
        {
          icon: "lock-closed-outline",
          title: "Change Password",
          color: COLORS.menuPassword,
          screen: "ChangePassword",
        },
        {
          icon: "settings-outline",
          title: "Settings",
          color: COLORS.menuSettings,
          onPress: () => Alert.alert("Settings", "App settings configuration will be available in the next release."),
        },
        {
          icon: "help-circle-outline",
          title: "Help & Support",
          color: COLORS.menuHelp,
          onPress: () => Alert.alert("Help & Support", "Support ticket system will be active soon. Please contact us at support@deebazar.com."),
        },
      ].map((item, index) => (

        <TouchableOpacity
          key={index}
          activeOpacity={0.9}
          onPress={() => handleMenuPress(item)}
          style={styles.menuCard}>

          <View
            style={[
              styles.menuIcon,
              {
                backgroundColor: item.color,
              },
            ]}>

            <Ionicons
              name={item.icon}
              color="#fff"
              size={22}
            />

          </View>

          <Text style={styles.menuTitle}>
            {item.title}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#999"
          />

        </TouchableOpacity> 

      ))}

      {/* Logout */}

      <TouchableOpacity
        style={styles.logoutBtn}
        activeOpacity={0.9}
        onPress={handleLogout}
      >

        <Ionicons
          name="log-out-outline"
          size={22}
          color="#fff"
        />

        <Text style={styles.logoutText}>
          Logout
        </Text>

      </TouchableOpacity>

    </ScrollView>
  );
};

export default Account;
const styles = StyleSheet.create({
  profileCard: {
    margin: 16,
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    paddingVertical: 28,
    alignItems: "center",
    elevation: 5,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },

  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },

  name: {
    marginTop: 15,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textGrayDark,
  },

  email: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textGrayLight,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: COLORS.warningBgLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },

  rating: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.warningText,
  },

  menuCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  menuTitle: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textGrayDark,
  },

  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 25,
    marginBottom: 30,
    height: 58,
    backgroundColor: COLORS.error,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    elevation: 4,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  logoutText: {
    color: COLORS.textContrast,
    fontSize: 17,
    fontWeight: "700",
    marginLeft: 10,
  },
});