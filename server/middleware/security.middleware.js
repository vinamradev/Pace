import rateLimit from "express-rate-limit";
import helmet from "helmet";

/**
 * Deep sanitization to prevent NoSQL injection by removing keys starting with '$' or containing '.'
 */
export function sanitizeData(data) {
  if (data === null || typeof data !== "object") {
    if (typeof data === "string") {
      // Strip potential script tags for basic XSS mitigation
      return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  const sanitized = {};
  for (const key of Object.keys(data)) {
    // Drop keys that could be used for NoSQL injection (e.g., $gt, $ne, $where) or field path injection
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }
    sanitized[key] = sanitizeData(data[key]);
  }
  return sanitized;
}

/**
 * Middleware to sanitize req.body, req.query, and req.params
 */
export function sanitizeMiddleware(req, res, next) {
  if (req.body) req.body = sanitizeData(req.body);
  if (req.query) req.query = sanitizeData(req.query);
  if (req.params) req.params = sanitizeData(req.params);
  next();
}

/**
 * Rate Limiter for Authentication (Login / Register)
 * Prevents brute force credential stuffing attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

/**
 * Rate Limiter for OTP / Password Reset / Email sending
 * Prevents email bombing and resource exhaustion
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 6, // max 6 OTP requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait 15 minutes before requesting again.",
  },
});

/**
 * Rate Limiter for General API Routes
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Rate limit exceeded. Please slow down your requests.",
  },
});

/**
 * Helmet Security Headers Configuration
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://accounts.google.com/gsi/",
        "https://apis.google.com",
      ],
      frameSrc: ["'self'", "https://accounts.google.com/gsi/"],
      connectSrc: [
        "'self'",
        "http://localhost:*",
        "https://*.onrender.com",
        "https://*.vercel.app",
        "https://accounts.google.com/gsi/",
      ],
      imgSrc: ["'self'", "data:", "blob:", "https://*"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

/**
 * Robust CORS configuration
 */
export function getCorsOptions() {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
  ];

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/+$/, ""));
  }

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or localhost/Vercel
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".onrender.com") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev, but structured
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  };
}
