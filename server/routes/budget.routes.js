import express from "express";
import Budget from "../models/Budget.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply JWT authentication
router.use(authenticateToken);

// GET /api/budgets
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const budget = await Budget.findOne({ userId });

    res.json({ success: true, budget: budget || null });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch budget" });
  }
});

// POST /api/budgets (Upsert)
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { monthlyBudget, guardThreshold, categoryBudgets } = req.body;

    const updateFields = {};
    if (monthlyBudget !== undefined) {
      updateFields.monthlyBudget = Math.max(0, Number(monthlyBudget) || 0);
    }
    if (guardThreshold !== undefined) {
      updateFields.guardThreshold = Math.min(100, Math.max(10, Number(guardThreshold) || 80));
    }
    if (categoryBudgets !== undefined && typeof categoryBudgets === "object") {
      updateFields.categoryBudgets = categoryBudgets;
    }

    const budget = await Budget.findOneAndUpdate(
      { userId },
      updateFields,
      { new: true, upsert: true }
    );

    res.json({ success: true, budget });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update budget" });
  }
});

export default router;
