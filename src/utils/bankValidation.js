/**
 * DeeBazar Seller - Bank Validation Utility
 * Enforces strict validation and sanitization for Indian Banking Details.
 */

/**
 * Strips non-digits and truncates to max 20 digits
 */
export const sanitizeAccountNumber = (value) => {
  if (!value) return "";
  return String(value).replace(/[^0-9]/g, "").slice(0, 20);
};

/**
 * Converts to uppercase, strips non-alphanumeric chars, and truncates to max 11 chars
 */
export const sanitizeIfscCode = (value) => {
  if (!value) return "";
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 11);
};

/**
 * Validates Bank Account Number
 * - Must contain only digits
 * - Min length: 9 digits
 * - Max length: 20 digits
 */
export const validateAccountNumber = (value, isRequired = true) => {
  const trimmed = (value || "").trim();

  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: "Bank account number is required" };
    }
    return { isValid: true, error: null };
  }

  if (!/^[0-9]+$/.test(trimmed)) {
    return { isValid: false, error: "Account number must contain only numbers (0-9)" };
  }

  if (trimmed.length < 9) {
    return { isValid: false, error: `Account number is too short (${trimmed.length}/9-20 digits)` };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: "Account number cannot exceed 20 digits" };
  }

  return { isValid: true, error: null };
};

/**
 * Validates Indian IFSC Code (RBI Standard)
 * - Exactly 11 characters
 * - First 4 characters: Alphabetic (Bank Code, e.g. SBIN, HDFC, ICIC)
 * - 5th character: '0' (Reserved zero)
 * - Last 6 characters: Alphanumeric branch code
 */
export const validateIfscCode = (value, isRequired = true) => {
  const trimmed = (value || "").trim().toUpperCase();

  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: "IFSC code is required" };
    }
    return { isValid: true, error: null };
  }

  if (trimmed.length !== 11) {
    return {
      isValid: false,
      error: `IFSC code must be exactly 11 characters (${trimmed.length}/11). Example: SBIN0001234`,
    };
  }

  if (!/^[A-Z]{4}/.test(trimmed)) {
    return {
      isValid: false,
      error: "First 4 characters of IFSC code must be bank letters (e.g. SBIN)",
    };
  }

  if (trimmed.charAt(4) !== "0") {
    return {
      isValid: false,
      error: "5th character of IFSC code must be '0' (zero)",
    };
  }

  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(trimmed)) {
    return {
      isValid: false,
      error: "Invalid IFSC code format. Example: SBIN0001234",
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates Account Holder Name
 */
export const validateAccountHolderName = (value, isRequired = true) => {
  const trimmed = (value || "").trim();

  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: "Account holder name is required" };
    }
    return { isValid: true, error: null };
  }

  if (trimmed.length > 255) {
    return { isValid: false, error: "Account holder name cannot exceed 255 characters" };
  }

  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: "Account holder name should only contain letters and spaces",
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates Bank Name
 */
export const validateBankName = (value, isRequired = true) => {
  const trimmed = (value || "").trim();

  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: "Bank name is required" };
    }
    return { isValid: true, error: null };
  }

  if (trimmed.length > 255) {
    return { isValid: false, error: "Bank name cannot exceed 255 characters" };
  }

  return { isValid: true, error: null };
};

