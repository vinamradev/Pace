import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure environment variables from server/.env are loaded BEFORE DB initialization
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB, getDBStatus } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import goalRoutes from "./routes/goal.routes.js";
import budgetRoutes from "./routes/budget.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import eventRoutes from "./routes/event.routes.js";
import loanRoutes from "./routes/loan.routes.js";
import {
  helmetConfig,
  sanitizeMiddleware,
  apiRateLimiter,
  getCorsOptions,
} from "./middleware/security.middleware.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// 1. HTTP Security Headers with Helmet
app.use(helmetConfig);

// 2. CORS with secure origins
app.use(cors(getCorsOptions()));

// 3. Body parsers with safe payload limits to prevent memory exhaustion DoS
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// 4. Deep input sanitization to eliminate NoSQL injection ($ and . keys) and script tags
app.use(sanitizeMiddleware);

// 5. Global API Rate Limiter
app.use("/api/", apiRateLimiter);

// 6. Health check & DB status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "PACE Finance API",
    version: "2.0.0",
    security: "Hardened",
    database: getDBStatus(),
    timestamp: new Date().toISOString(),
  });
});

// 7. API Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/loans", loanRoutes);

// 8. 404 Handler for unmatched routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.originalUrl} not found`,
  });
});

// 9. Centralized Error Handler (Prevents stack trace leaks in production)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[PACE Server Error]", err.stack || err.message);

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected internal server error occurred",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`[PACE Server] Running securely on http://localhost:${PORT}`);
  console.log(`[PACE Server] Security: Helmet CSP, Rate Limiting, NoSQL Sanitizer & JWT active`);
});

export default app;
