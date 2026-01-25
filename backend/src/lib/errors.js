/**
 * ============================================
 * CUSTOM ERROR CLASSES
 * ============================================
 * 
 * Standard error hierarchy for consistent error handling
 * All errors inherit from AppError with statusCode
 * Enables centralized error middleware to handle gracefully
 */

export class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Distinguish from programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You don't have permission to access this resource") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", identifier = "") {
    const message = identifier 
      ? `${resource} with ID ${identifier} not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter = null) {
    const message = retryAfter
      ? `Too many requests. Try again in ${retryAfter} seconds`
      : "Too many requests. Please try again later";
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    this.retryAfter = retryAfter;
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(message, 500, "DATABASE_ERROR");
  }
}

export class FileUploadError extends AppError {
  constructor(message) {
    super(message, 400, "FILE_UPLOAD_ERROR");
  }
}

/**
 * ============================================
 * ERROR MIDDLEWARE
 * ============================================
 * Central error handler for Express
 * Usage: app.use(errorHandler)
 */

export const errorHandler = (err, req, res, next) => {
  // Log all errors with context
  console.error({
    timestamp: new Date().toISOString(),
    message: err.message,
    statusCode: err.statusCode || 500,
    path: req.path,
    method: req.method,
    userId: req.user?._id || "anonymous",
    requestId: req.id,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Operational errors (expected)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || undefined,
        retryAfter: err.retryAfter || undefined,
      },
    });
  }

  // Programming errors (unexpected)
  console.error("❌ Unexpected error:", err);
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isDevelopment 
        ? err.message 
        : "An unexpected error occurred. Please try again later.",
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};

/**
 * ============================================
 * ASYNC ERROR WRAPPER
 * ============================================
 * Wraps async route handlers to catch errors
 * Usage: router.post('/endpoint', asyncHandler(async (req, res) => { ... }))
 */

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
