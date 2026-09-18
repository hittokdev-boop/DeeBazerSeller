import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LIGHT_COLORS, DARK_COLORS } from "../constants/theme";

export const ThemeContext = createContext({
  themeMode: "light",
  isDarkMode: false,
  isDark: false,
  colors: LIGHT_COLORS,
  toggleTheme: () => {},
  setTheme: (mode) => {},
});

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState("light");

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("@theme_mode");
        if (savedTheme === "dark" || savedTheme === "light") {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.error("Error loading theme mode preference:", error);
      }
    };

    loadSavedTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(newTheme);
    try {
      await AsyncStorage.setItem("@theme_mode", newTheme);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const setTheme = async (mode) => {
    if (mode !== "light" && mode !== "dark") return;
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem("@theme_mode", mode);
    } catch (error) {
      console.error("Error saving theme mode:", error);
    }
  };

  const isDarkMode = themeMode === "dark";
  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDarkMode,
        isDark: isDarkMode,
        colors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
