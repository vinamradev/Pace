import express from "express";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { otpRateLimiter } from "../middleware/security.middleware.js";
import {
  sendFinancialSummaryEmail,
  sendBudgetAlertEmail,
  sendWelcomeEmail,
} from "../services/email.service.js";

const router = express.Router();

/**
 * GET /api/notifications/preferences
 * Fetch user's notification settings
 */
router.get("/preferences", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      emailNotifications: user.emailNotifications || {
        budgetAlerts: true,
        loginAlerts: true,
        monthlyReport: true,
        transactions: false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch notification preferences" });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user's notification settings
 */
router.put("/preferences", authenticateToken, async (req, res) => {
  try {
    const { budgetAlerts, loginAlerts, monthlyReport, transactions } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.emailNotifications = {
      budgetAlerts: budgetAlerts !== undefined ? Boolean(budgetAlerts) : user.emailNotifications?.budgetAlerts ?? true,
      loginAlerts: loginAlerts !== undefined ? Boolean(loginAlerts) : user.emailNotifications?.loginAlerts ?? true,
      monthlyReport: monthlyReport !== undefined ? Boolean(monthlyReport) : user.emailNotifications?.monthlyReport ?? true,
      transactions: transactions !== undefined ? Boolean(transactions) : user.emailNotifications?.transactions ?? false,
    };

    await user.save();

    res.json({
      success: true,
      message: "Notification preferences updated successfully",
      emailNotifications: user.emailNotifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update notification preferences" });
  }
});

/**
 * POST /api/notifications/test
 * Send a test email to user's registered email address
 */
router.post("/test", authenticateToken, otpRateLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const result = await sendWelcomeEmail({
      to: user.email,
      name: user.name,
    });

    res.json({
      success: true,
      message: `Test notification sent successfully to ${user.email}!`,
      details: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send test email notification",
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/report
 * Compile user's financial spending data and email a complete summary report
 */
router.post("/report", authenticateToken, otpRateLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const transactions = await Transaction.find({ userId: user._id });

    let totalExpense = 0;
    let totalIncome = 0;
    const categoryTotals = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        const cat = tx.category || "Other";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });

    let topCategory = "None";
    let maxSpent = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
      if (amt > maxSpent) {
        maxSpent = amt;
        topCategory = cat;
      }
    }

    const result = await sendFinancialSummaryEmail({
      to: user.email,
      name: user.name,
      totalExpense,
      totalIncome,
      topCategory,
      txCount: transactions.length,
      currency: user.currency === "USD" ? "$" : "₹",
    });

    res.json({
      success: true,
      message: `Financial summary report sent to ${user.email}!`,
      details: result,
      summary: {
        totalExpense,
        totalIncome,
        topCategory,
        txCount: transactions.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to compile and send financial report",
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/budget-alert
 * Manually trigger or test budget alert notification
 */
router.post("/budget-alert", authenticateToken, otpRateLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const budgetDoc = await Budget.findOne({ userId: user._id });
    const monthlyBudget = budgetDoc?.monthlyBudget || user.monthlyBudget || 20000;
    const threshold = budgetDoc?.guardThreshold || user.guardThreshold || 80;

    // Calculate current month's expenses
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

    const transactions = await Transaction.find({
      userId: user._id,
      type: "expense",
      date: { $gte: startOfMonth },
    });

    const currentSpent = transactions.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    const percent = Math.round((currentSpent / (monthlyBudget || 1)) * 100);

    const result = await sendBudgetAlertEmail({
      to: user.email,
      name: user.name,
      spent: currentSpent,
      budget: monthlyBudget,
      percent,
      threshold,
      currency: user.currency === "USD" ? "$" : "₹",
    });

    res.json({
      success: true,
      message: `Budget guard alert email sent to ${user.email}!`,
      details: result,
      currentSpent,
      monthlyBudget,
      percent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send budget alert email",
      error: error.message,
    });
  }
});

export default router;
