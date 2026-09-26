import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB, getDBStatus } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import goalRoutes from "./routes/goal.routes.js";
import budgetRoutes from "./routes/budget.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "15mb" }));

// Health check & DB status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "PACE Finance API",
    version: "1.0.0",
    database: getDBStatus(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/budgets", budgetRoutes);

app.listen(PORT, () => {
  console.log(`[PACE Server] Running on http://localhost:${PORT}`);
});
