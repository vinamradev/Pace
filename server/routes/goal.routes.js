import express from "express";
import Goal from "../models/Goal.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply JWT authentication
router.use(authenticateToken);

// GET /api/goals
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, count: goals.length, goals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch goals", error: error.message });
  }
});

// POST /api/goals
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, targetAmount, currentAmount = 0, deadline = "", category = "Personal" } = req.body;

    if (!title || !targetAmount) {
      return res.status(400).json({ success: false, message: "Title and target amount are required" });
    }

    const goal = await Goal.create({
      userId,
      title: String(title).slice(0, 100).trim(),
      targetAmount: Math.max(1, Number(targetAmount)),
      currentAmount: Math.max(0, Number(currentAmount) || 0),
      deadline: String(deadline).slice(0, 20),
      category: String(category).slice(0, 50),
    });

    res.status(201).json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create goal", error: error.message });
  }
});

// PUT /api/goals/:id (BOLA protected)
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, targetAmount, currentAmount, deadline, category } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = String(title).slice(0, 100).trim();
    if (targetAmount !== undefined) updates.targetAmount = Math.max(1, Number(targetAmount));
    if (currentAmount !== undefined) updates.currentAmount = Math.max(0, Number(currentAmount));
    if (deadline !== undefined) updates.deadline = String(deadline).slice(0, 20);
    if (category !== undefined) updates.category = String(category).slice(0, 50);

    const updated = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId },
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Goal not found or unauthorized" });
    }

    res.json({ success: true, goal: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update goal", error: error.message });
  }
});

// DELETE /api/goals/:id (BOLA protected)
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await Goal.findOneAndDelete({ _id: req.params.id, userId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Goal not found or unauthorized" });
    }

    res.json({ success: true, message: "Goal deleted successfully", id: req.params.id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete goal", error: error.message });
  }
});

export default router;
