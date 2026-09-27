import express from "express";
import Event from "../models/Event.js";
import Transaction from "../models/Transaction.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Enforce JWT authentication
router.use(authenticateToken);

/**
 * GET /api/events
 * Fetch all events for authenticated user with dynamically aggregated financial metrics
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const events = await Event.find({ userId }).sort({ createdAt: -1 });

    // Dynamically calculate totals for each event from real transactions
    const eventsWithMetrics = await Promise.all(
      events.map(async (ev) => {
        const eventIdMatches = [ev._id.toString(), ev._id];
        const linkedTransactions = await Transaction.find({
          userId,
          eventId: { $in: eventIdMatches },
        });

        const totalSpent = linkedTransactions.reduce(
          (sum, tx) => sum + (Number(tx.amount) || 0),
          0
        );

        const categoryBreakdown = {};
        linkedTransactions.forEach((tx) => {
          const cat = tx.category || "Other";
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (Number(tx.amount) || 0);
        });

        const remainingBudget = Math.max(0, ev.budget - totalSpent);
        const percentUsed = ev.budget > 0 ? Math.round((totalSpent / ev.budget) * 100) : 0;

        return {
          ...ev.toObject(),
          totalSpent,
          remainingBudget,
          percentUsed,
          transactionCount: linkedTransactions.length,
          categoryBreakdown,
        };
      })
    );

    res.json({ success: true, count: eventsWithMetrics.length, events: eventsWithMetrics });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch events", error: error.message });
  }
});

/**
 * POST /api/events
 * Create a new event (e.g. Wedding / Shaadi, Vacation, Renovation)
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, icon, budget, startDate, endDate, description, categories, alertThresholds, notes } = req.body;

    if (!name || budget === undefined) {
      return res.status(400).json({ success: false, message: "Event name and budget are required" });
    }

    const event = await Event.create({
      userId,
      name: String(name).trim().slice(0, 150),
      icon: icon || "💍",
      budget: Math.max(0, Number(budget) || 0),
      startDate: startDate || "",
      endDate: endDate || "",
      description: description || "",
      categories: Array.isArray(categories) && categories.length ? categories : ["Venue", "Shopping", "Decoration", "Travel", "Food", "Gifts", "Other"],
      alertThresholds: Array.isArray(alertThresholds) ? alertThresholds : [50, 75, 90, 100],
      notes: notes || "",
      status: "active",
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: {
        ...event.toObject(),
        totalSpent: 0,
        remainingBudget: event.budget,
        percentUsed: 0,
        transactionCount: 0,
        categoryBreakdown: {},
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create event", error: error.message });
  }
});

/**
 * GET /api/events/:id
 * Retrieve event details with deep financial metrics, timeline, and month-by-month history
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const event = await Event.findOne({ _id: req.params.id, userId });

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const eventIdMatches = [event._id.toString(), event._id];
    const transactions = await Transaction.find({
      userId,
      eventId: { $in: eventIdMatches },
    }).sort({ date: -1, createdAt: -1 });

    const totalSpent = transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const remainingBudget = Math.max(0, event.budget - totalSpent);
    const percentUsed = event.budget > 0 ? Math.round((totalSpent / event.budget) * 100) : 0;

    // Category breakdown
    const categoryBreakdown = {};
    // Month-by-month history
    const monthlyHistory = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      const cat = tx.category || "Other";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amt;

      const monthKey = tx.date ? tx.date.slice(0, 7) : "Unknown"; // e.g. "2026-09"
      monthlyHistory[monthKey] = (monthlyHistory[monthKey] || 0) + amt;
    });

    res.json({
      success: true,
      event: {
        ...event.toObject(),
        totalSpent,
        remainingBudget,
        percentUsed,
        transactionCount: transactions.length,
        categoryBreakdown,
        monthlyHistory,
        transactions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch event details", error: error.message });
  }
});

/**
 * PUT /api/events/:id
 * Update an event
 */
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, icon, budget, startDate, endDate, description, status, categories, alertThresholds, notes } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim().slice(0, 150);
    if (icon !== undefined) updates.icon = String(icon).trim();
    if (budget !== undefined) updates.budget = Math.max(0, Number(budget) || 0);
    if (startDate !== undefined) updates.startDate = String(startDate);
    if (endDate !== undefined) updates.endDate = String(endDate);
    if (description !== undefined) updates.description = String(description);
    if (status !== undefined) updates.status = status;
    if (categories !== undefined) updates.categories = categories;
    if (alertThresholds !== undefined) updates.alertThresholds = alertThresholds;
    if (notes !== undefined) updates.notes = String(notes);

    const updated = await Event.findOneAndUpdate(
      { _id: req.params.id, userId },
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Event not found or unauthorized" });
    }

    res.json({ success: true, message: "Event updated successfully", event: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update event", error: error.message });
  }
});

/**
 * DELETE /api/events/:id
 * Delete an event and unlink all associated transactions
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await Event.findOneAndDelete({ _id: req.params.id, userId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Event not found or unauthorized" });
    }

    // Unlink transactions instead of deleting them to preserve historical ledger integrity
    const eventIdMatches = [deleted._id.toString(), deleted._id];
    await Transaction.updateMany(
      { userId, eventId: { $in: eventIdMatches } },
      { $set: { eventId: null } }
    );

    res.json({ success: true, message: "Event deleted and transactions unlinked", id: req.params.id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete event", error: error.message });
  }
});

/**
 * GET /api/events/:id/transactions
 * Retrieve all transactions linked to a specific event
 */
router.get("/:id/transactions", async (req, res) => {
  try {
    const userId = req.user.id;
    const eventIdMatches = [req.params.id.toString(), req.params.id];
    const transactions = await Transaction.find({
      userId,
      eventId: { $in: eventIdMatches },
    }).sort({ date: -1, createdAt: -1 });

    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch event transactions", error: error.message });
  }
});

export default router;
