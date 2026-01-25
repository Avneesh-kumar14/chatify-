import { ValidationError } from "../lib/errors.js";

/**
 * ============================================
 * INPUT VALIDATION SERVICE
 * ============================================
 * 
 * Validates all user inputs before processing
 * Prevents:
 * - XSS attacks (script injection)
 * - Database injection
 * - Invalid data types
 * - Oversized payloads
 * - Business logic violations
 * 
 * Philosophy: Fail fast, fail loudly
 * Invalid input → 400 immediately
 */

/**
 * Email validation
 * RFC 5322 simplified (not 100% compliant, but sufficient for real apps)
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || typeof email !== "string") {
    throw new ValidationError("Email is required");
  }

  if (email.length > 254) {
    throw new ValidationError("Email is too long (max 254 characters)");
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }

  return email.toLowerCase().trim();
};

/**
 * Password validation
 * Minimum strength: 8 chars, 1 uppercase, 1 number
 * 
 * Why these rules?
 * - 8+ chars: Prevents simple brute force
 * - Uppercase: Rules out all-lowercase passwords (common weak ones)
 * - Number: Rules out dictionary attacks
 * 
 * NOT required: Special chars (controversial, but UX-friendly)
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    throw new ValidationError("Password is required");
  }

  if (password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }

  if (password.length > 128) {
    throw new ValidationError("Password is too long (max 128 characters)");
  }

  if (!/[A-Z]/.test(password)) {
    throw new ValidationError("Password must contain at least one uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    throw new ValidationError("Password must contain at least one number");
  }

  // Prevent common passwords
  const commonPasswords = ["password123", "qwerty123", "admin123", "12345678"];
  if (commonPasswords.includes(password.toLowerCase())) {
    throw new ValidationError("This password is too common. Please choose something else");
  }

  return password;
};

/**
 * Full name validation
 */
export const validateFullName = (fullName) => {
  if (!fullName || typeof fullName !== "string") {
    throw new ValidationError("Full name is required");
  }

  const trimmed = fullName.trim();

  if (trimmed.length < 2) {
    throw new ValidationError("Full name must be at least 2 characters");
  }

  if (trimmed.length > 100) {
    throw new ValidationError("Full name is too long (max 100 characters)");
  }

  // Check for valid characters (allow letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
    throw new ValidationError("Full name contains invalid characters");
  }

  return trimmed;
};

/**
 * Message text validation
 */
export const validateMessageText = (text) => {
  if (!text || typeof text !== "string") {
    return null; // Optional if image exists
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return null; // Empty after trim
  }

  if (trimmed.length > 5000) {
    throw new ValidationError("Message is too long (max 5000 characters)");
  }

  // Sanitize: remove control characters but keep newlines
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized;
};

/**
 * Image validation
 * Checks: format, size, MIME type
 */
export const validateImage = (imageBase64, maxSizeMB = 5) => {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return null; // Optional
  }

  // Base64 size estimation (4/3 of actual size)
  const estimatedSize = (imageBase64.length * 3) / 4 / 1024 / 1024;
  
  if (estimatedSize > maxSizeMB) {
    throw new ValidationError(
      `Image is too large (max ${maxSizeMB}MB). Actual: ${estimatedSize.toFixed(2)}MB`
    );
  }

  // Check if valid base64
  if (!/^data:image\/(jpeg|png|webp|gif);base64,/.test(imageBase64)) {
    throw new ValidationError("Invalid image format. Must be JPEG, PNG, WebP, or GIF");
  }

  return imageBase64;
};

/**
 * Bio validation
 */
export const validateBio = (bio) => {
  if (!bio) return null;

  if (typeof bio !== "string") {
    throw new ValidationError("Bio must be a string");
  }

  const trimmed = bio.trim();

  if (trimmed.length > 500) {
    throw new ValidationError("Bio is too long (max 500 characters)");
  }

  // Remove control characters
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized;
};

/**
 * User ID validation (MongoDB ObjectId)
 */
export const validateUserId = (userId) => {
  if (!userId) {
    throw new ValidationError("User ID is required");
  }

  // MongoDB ObjectId: 24 hex characters
  if (!/^[0-9a-f]{24}$/i.test(userId.toString())) {
    throw new ValidationError("Invalid user ID format");
  }

  return userId;
};

/**
 * Conversation ID validation
 */
export const validateConversationId = (conversationId) => {
  if (!conversationId) {
    throw new ValidationError("Conversation ID is required");
  }

  if (!/^[0-9a-f]{24}$/i.test(conversationId.toString())) {
    throw new ValidationError("Invalid conversation ID format");
  }

  return conversationId;
};

/**
 * Pagination validation
 */
export const validatePagination = (limit, cursor) => {
  const parsedLimit = parseInt(limit) || 20;

  // Prevent abuse: max 100 items per page
  if (parsedLimit < 1 || parsedLimit > 100) {
    throw new ValidationError("Limit must be between 1 and 100");
  }

  // Cursor is optional, but if provided must be valid MongoDB ObjectId
  if (cursor && !/^[0-9a-f]{24}$/i.test(cursor.toString())) {
    throw new ValidationError("Invalid cursor format");
  }

  return { limit: parsedLimit, cursor };
};

/**
 * Batch validation helper
 * Validates object against schema
 */
export const validateObject = (obj, schema) => {
  const errors = {};

  Object.keys(schema).forEach((key) => {
    const validator = schema[key];
    try {
      if (validator) {
        validator(obj[key]);
      }
    } catch (err) {
      errors[key] = err.message;
    }
  });

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed", errors);
  }
};

/**
 * Sanitize user input for XSS prevention
 * Remove HTML tags and dangerous characters
 */
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

/**
 * Validation schemas for common operations
 */
export const validationSchemas = {
  signup: {
    email: validateEmail,
    password: validatePassword,
    fullName: validateFullName,
  },
  
  login: {
    email: validateEmail,
    password: (pwd) => {
      // Don't validate strength for login, just presence
      if (!pwd || typeof pwd !== "string") {
        throw new ValidationError("Password is required");
      }
    },
  },
  
  sendMessage: {
    text: validateMessageText,
    image: validateImage,
  },
  
  updateProfile: {
    fullName: (name) => {
      if (name !== undefined) validateFullName(name);
    },
    bio: validateBio,
  },
};
