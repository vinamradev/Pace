import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "pace_jwt_secure_super_secret_key_2026";

/**
 * Authentication Middleware
 * Enforces JWT authentication and populates req.user
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Authentication token required.",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          code: "TOKEN_EXPIRED",
          message: "Session expired. Please log in again.",
        });
      }
      return res.status(403).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.user = decoded;
    next();
  });
}

/**
 * Optional Authentication Middleware
 * Populates req.user if a valid token is provided, but does not block requests without token
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      req.user = decoded;
    }
    next();
  });
}
