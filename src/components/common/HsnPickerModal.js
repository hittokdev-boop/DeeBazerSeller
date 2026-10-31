import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import COLORS from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { searchHsnCodes } from "../../api/auth";

const HsnPickerModal = ({
  visible,
  onClose,
  onSelect,
  onSelectHsn,
  selectedHsnCode = "",
  selectedHsnId = null,
}) => {
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceTimeout = useRef(null);

  // Perform search (strictly 4 to 8 digits)
  const performSearch = useCallback(async (query) => {
    const digits = String(query || "").replace(/\D/g, "").slice(0, 8);
    if (!digits || digits.length < 4) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const data = await searchHsnCodes(digits);
      const list = Array.isArray(data) ? data : (data?.data || []);
      setResults(list);
    } catch (err) {
      console.warn("[HsnPickerModal] search error:", err?.message || err);
      setErrorMessage(err?.message || "Failed to search HSN codes. Please check network.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle typing with debounce (numbers only, max 8 digits)
  const handleQueryChange = (text) => {
    const digits = (text || "").replace(/\D/g, "").slice(0, 8);
    setSearchQuery(digits);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (!digits) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      setErrorMessage(null);
      return;
    }

    if (digits.length < 4) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      setErrorMessage(null);
      return;
    }

    debounceTimeout.current = setTimeout(() => {
      performSearch(digits);
    }, 350);
  };

  // When modal opens, pre-fill search query if selectedHsnCode exists or load initial sample
  useEffect(() => {
    if (visible) {
      const digits = (selectedHsnCode || "").replace(/\D/g, "").slice(0, 8);
      if (digits.length >= 4) {
        setSearchQuery(digits);
        performSearch(digits);
      } else {
        setSearchQuery("");
        setResults([]);
        setHasSearched(false);
        setErrorMessage(null);
        // Load default popular HSN prefix e.g. "0101"
        performSearch("0101");
      }
    } else {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    }
  }, [visible, selectedHsnCode, performSearch]);

  const handleSearchPress = () => {
    const digits = (searchQuery || "").replace(/\D/g, "").slice(0, 8);
    if (digits.length >= 4) {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      performSearch(digits);
    } else {
      setErrorMessage("Please enter at least 4 digits of the HSN code (e.g. 0101, 6109)");
    }
  };

  const handleChipPress = (code) => {
    setSearchQuery(code);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    performSearch(code);
  };

  const handleSelectItem = (item) => {
    if (typeof onSelect === "function") {
      onSelect(item);
    }
    if (typeof onSelectHsn === "function") {
      onSelectHsn(item);
    }
    onClose();
  };

  const handleManualUse = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const item = {
      id: null,
      hsn_code: trimmed,
      description: "Custom HSN Code",
    };
    if (typeof onSelect === "function") {
      onSelect(item);
    }
    if (typeof onSelectHsn === "function") {
      onSelectHsn(item);
    }
    onClose();
  };

  const renderItem = ({ item }) => {
    const isSelected =
      (selectedHsnCode && String(item.hsn_code).trim() === String(selectedHsnCode).trim()) ||
      (selectedHsnId && String(item.id) === String(selectedHsnId).trim());

    return (
      <TouchableOpacity
        style={[
          styles.itemRow,
          {
            backgroundColor: isSelected
              ? isDark ? "#1e3a5f" : "#EFF6FF"
              : colors.cardBg,
            borderBottomColor: colors.borderLight,
          },
        ]}
        onPress={() => handleSelectItem(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          <View style={styles.codeRow}>
            <View
              style={[
                styles.codeBadge,
                {
                  backgroundColor: isSelected
                    ? COLORS.primary
                    : isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              <Ionicons
                name="barcode-outline"
                size={13}
                color={isSelected ? "#fff" : colors.textPrimary}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.codeBadgeText,
                  { color: isSelected ? "#fff" : colors.textPrimary },
                ]}
              >
                {item.hsn_code}
              </Text>
            </View>

            {isSelected && (
              <View style={[styles.selectedPill, { backgroundColor: COLORS.successBgLight }]}>
                <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                <Text style={[styles.selectedPillText, { color: COLORS.success }]}>Selected</Text>
              </View>
            )}
          </View>

          {item.description ? (
            <Text
              style={[styles.itemDesc, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
        </View>

        <Ionicons
          name={isSelected ? "checkmark-circle" : "chevron-forward"}
          size={18}
          color={isSelected ? COLORS.primary : colors.textSecondary}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalDismissArea}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select HSN Code
              </Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                Harmonized System of Nomenclature for GST & tax rates
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.backgroundAlt,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Enter 4-8 digit HSN code (e.g. 0101)..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleQueryChange}
              keyboardType="number-pad"
              maxLength={8}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearchPress}
            />
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
            ) : searchQuery ? (
              <TouchableOpacity
                onPress={() => handleQueryChange("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginRight: 6 }}
              >
                <Ionicons name="close-circle-sharp" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={handleSearchPress}
              disabled={isLoading || searchQuery.length < 4}
              style={[
                styles.searchBtn,
                {
                  backgroundColor: searchQuery.length >= 4 ? COLORS.primary : colors.borderLight,
                  opacity: searchQuery.length >= 4 ? 1 : 0.6,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* Digit count helper */}
          {searchQuery.length > 0 && searchQuery.length < 4 ? (
            <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginTop: 4 }}>
              <Ionicons name="information-circle-outline" size={13} color={COLORS.warning || "#F59E0B"} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, color: COLORS.warning || "#F59E0B" }}>
                Enter at least 4 digits ({searchQuery.length}/4)
              </Text>
            </View>
          ) : null}

          {/* Quick Suggestions / Info banner */}
          <View style={styles.quickBar}>
            <Text style={[styles.quickBarLabel, { color: colors.textSecondary }]}>
              Popular:
            </Text>
            {["0101", "6109", "6203", "8517", "6403"].map((code) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: searchQuery === code ? COLORS.primaryBgLight : colors.backgroundAlt,
                    borderColor: searchQuery === code ? COLORS.primary : colors.borderLight,
                  },
                ]}
                onPress={() => handleChipPress(code)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    { color: searchQuery === code ? COLORS.primary : colors.textPrimary },
                  ]}
                >
                  {code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={[styles.errorBanner, { backgroundColor: COLORS.errorBgLight }]}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} style={{ marginRight: 6 }} />
              <Text style={[styles.errorText, { color: COLORS.error }]}>{errorMessage}</Text>
              <TouchableOpacity
                onPress={() => performSearch(searchQuery)}
                style={styles.retryBtn}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Results List */}
          <FlatList
            data={results}
            keyExtractor={(item, index) => String(item.id || item.hsn_code || index)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            style={{ maxHeight: 360 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !isLoading && (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name={hasSearched ? "search-outline" : "barcode-outline"}
                    size={36}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {hasSearched ? "No HSN codes found" : "Type to search HSN codes"}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {hasSearched
                      ? `No results matching "${searchQuery}". You can still use it manually below.`
                      : "Search by 4, 6 or 8-digit HSN code or description."}
                  </Text>

                  {searchQuery.trim().length >= 4 && (
                    <TouchableOpacity
                      style={[styles.manualBtn, { backgroundColor: COLORS.primary }]}
                      onPress={handleManualUse}
                    >
                      <Ionicons name="checkmark-done" size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.manualBtnText}>
                        Use "{searchQuery.trim()}" as HSN Code
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            }
          />

          {/* Manual Entry Footer if results exist but user has custom code */}
          {searchQuery.trim().length >= 4 && results.length > 0 && (
            <View style={[styles.modalFooter, { borderTopColor: colors.borderLight }]}>
              <TouchableOpacity
                style={styles.manualFooterBtn}
                onPress={handleManualUse}
              >
                <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.manualFooterText, { color: COLORS.primary }]}>
                  Can't find exact match? Use "{searchQuery.trim()}" directly
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "85%",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 6,
  },
  searchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  quickBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    gap: 6,
  },
  quickBarLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginRight: 2,
  },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.error,
    borderRadius: 4,
    marginLeft: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  listContent: {
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemContent: {
    flex: 1,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  selectedPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  itemDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  manualBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  manualBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  modalFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: "center",
  },
  manualFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  manualFooterText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default HsnPickerModal;
