import express from "express";
import Goal from "../models/Goal.js";

const router = express.Router();

// GET /api/goals?userId=...
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId query param required" });

    const goals = await Goal.find({ userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch goals", error: error.message });
  }
});

// POST /api/goals
router.post("/", async (req, res) => {
  try {
    const { userId, title, targetAmount, currentAmount = 0, deadline = "", category = "Personal" } =
      req.body;

    if (!userId || !title || !targetAmount) {
      return res.status(400).json({ message: "userId, title, targetAmount required" });
    }

    const goal = await Goal.create({
      userId,
      title,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      deadline,
      category,
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: "Failed to create goal", error: error.message });
  }
});

// PUT /api/goals/:id
router.put("/:id", async (req, res) => {
  try {
    const updated = await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Goal not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update goal", error: error.message });
  }
});

// DELETE /api/goals/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Goal.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Goal not found" });
    res.json({ message: "Goal deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete goal", error: error.message });
  }
});

export default router;
