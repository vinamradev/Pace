import express from "express";
import Budget from "../models/Budget.js";

const router = express.Router();

// GET /api/budgets?userId=...
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId query param required" });

    let budget = await Budget.findOne({ userId });
    if (!budget) {
      budget = await Budget.create({
        userId,
        monthlyBudget: 20000,
        guardThreshold: 80,
        categoryBudgets: {},
      });
    }

    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch budget", error: error.message });
  }
});

// POST /api/budgets (Upsert)
router.post("/", async (req, res) => {
  try {
    const { userId, monthlyBudget, guardThreshold, categoryBudgets } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const budget = await Budget.findOneAndUpdate(
      { userId },
      {
        ...(monthlyBudget !== undefined && { monthlyBudget: Number(monthlyBudget) }),
        ...(guardThreshold !== undefined && { guardThreshold: Number(guardThreshold) }),
        ...(categoryBudgets !== undefined && { categoryBudgets }),
      },
      { new: true, upsert: true }
    );

    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: "Failed to update budget", error: error.message });
  }
});

export default router;
