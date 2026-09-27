import express from "express";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import User from "../models/User.js";
import Loan from "../models/Loan.js";
import Event from "../models/Event.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { sendBudgetAlertEmail } from "../services/email.service.js";

const router = express.Router();

// Apply JWT authentication to all transaction endpoints
router.use(authenticateToken);

// GET /api/transactions
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, eventId, loanId, type } = req.query;

    const filter = { userId };

    // Month filter (e.g. "2026-09")
    if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      filter.date = { $regex: `^${month}` };
    }

    if (eventId) {
      filter.eventId = { $in: [eventId, String(eventId)] };
    }

    if (loanId) {
      filter.loanId = { $in: [loanId, String(loanId)] };
    }

    if (type && type !== "all") {
      filter.type = type;
    }

    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch transactions", error: error.message });
  }
});

// POST /api/transactions
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      amount,
      type,
      majorHead,
      category,
      merchant,
      account,
      fromAccount,
      toAccount,
      date,
      paymentMethod,
      note,
      source,
      receiptUrl,
      eventId,
      loanId,
      principalAmount,
      interestAmount,
      isRecurring,
      recurringFrequency,
    } = req.body;

    if (!title || amount === undefined || !date) {
      return res.status(400).json({ success: false, message: "Title, amount, and date are required" });
    }

    const numAmount = Math.abs(Number(amount)) || 0;
    const numPrincipal = Math.max(0, Number(principalAmount) || 0);
    const numInterest = Math.max(0, Number(interestAmount) || 0);

    const validTypes = [
      "expense",
      "income",
      "savings",
      "investment",
      "debt_repayment",
      "transfer",
      "cash_withdrawal",
    ];
    const resolvedType = validTypes.includes(type) ? type : "expense";

    const transaction = await Transaction.create({
      userId,
      title: String(title).slice(0, 200).trim(),
      amount: numAmount,
      type: resolvedType,
      majorHead: majorHead ? String(majorHead).slice(0, 100).trim() : "General",
      category: category ? String(category).slice(0, 80).trim() : "Other",
      merchant: merchant ? String(merchant).slice(0, 150).trim() : "",
      account: account ? String(account).slice(0, 80).trim() : "Primary Account",
      fromAccount: fromAccount ? String(fromAccount).slice(0, 80).trim() : "",
      toAccount: toAccount ? String(toAccount).slice(0, 80).trim() : "",
      date: String(date).slice(0, 10),
      paymentMethod: paymentMethod ? String(paymentMethod).slice(0, 50) : "UPI",
      note: note ? String(note).slice(0, 1000) : "",
      source: source || "manual",
      receiptUrl: receiptUrl || "",
      eventId: eventId || null,
      loanId: loanId || null,
      principalAmount: numPrincipal,
      interestAmount: numInterest,
      isRecurring: Boolean(isRecurring),
      recurringFrequency: recurringFrequency || "none",
    });

    // If linked to loan and principal was paid, update outstanding balance
    if (loanId && resolvedType === "debt_repayment" && numPrincipal > 0) {
      Loan.findOneAndUpdate(
        { _id: loanId, userId },
        { $inc: { currentOutstanding: -numPrincipal } }
      ).catch(() => {});
    }

    // Proactive budget guard check for genuine expenses
    if (transaction.type === "expense") {
      checkAndSendBudgetAlert(userId, numAmount).catch((err) =>
        console.warn("[Transaction] Budget alert check notice:", err.message)
      );
    }

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create transaction", error: error.message });
  }
});

// POST /api/transactions/bulk (For Bank / GPay statement imports)
router.post("/bulk", async (req, res) => {
  try {
    const userId = req.user.id;
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, message: "Valid transactions array required" });
    }

    const safeBatch = transactions.slice(0, 1000);

    const docs = safeBatch.map((t) => ({
      userId,
      title: (t.title || "Imported Transaction").slice(0, 200),
      amount: Math.abs(Number(t.amount)) || 0,
      type: t.type || "expense",
      majorHead: (t.majorHead || "General").slice(0, 100),
      category: (t.category || "Other").slice(0, 80),
      merchant: (t.merchant || "").slice(0, 150),
      account: (t.account || "Primary Account").slice(0, 80),
      fromAccount: (t.fromAccount || "").slice(0, 80),
      toAccount: (t.toAccount || "").slice(0, 80),
      date: (t.date || new Date().toISOString().split("T")[0]).slice(0, 10),
      paymentMethod: (t.paymentMethod || "Bank / GPay").slice(0, 50),
      note: (t.note || "Imported from statement").slice(0, 1000),
      source: "statement_import",
      eventId: t.eventId || null,
      loanId: t.loanId || null,
      principalAmount: Number(t.principalAmount) || 0,
      interestAmount: Number(t.interestAmount) || 0,
    }));

    const inserted = await Transaction.insertMany(docs);
    res.status(201).json({ success: true, count: inserted.length, transactions: inserted });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to bulk import transactions", error: error.message });
  }
});

// DELETE /api/transactions/:id (BOLA Protected)
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, userId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Transaction not found or unauthorized" });
    }

    // Revert loan principal reduction if loan payment was deleted
    if (deleted.loanId && deleted.type === "debt_repayment" && deleted.principalAmount > 0) {
      Loan.findOneAndUpdate(
        { _id: deleted.loanId, userId },
        { $inc: { currentOutstanding: deleted.principalAmount } }
      ).catch(() => {});
    }

    res.json({ success: true, message: "Transaction deleted successfully", id: req.params.id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete transaction", error: error.message });
  }
});

/**
 * Helper to check if spending crossed budget guard threshold and send email
 */
async function checkAndSendBudgetAlert(userId, newExpenseAmount) {
  const user = await User.findById(userId);
  if (!user || user.emailNotifications?.budgetAlerts === false) return;

  const budget = await Budget.findOne({ userId });
  const monthlyBudget = budget?.monthlyBudget || user.monthlyBudget || 20000;
  const threshold = budget?.guardThreshold || user.guardThreshold || 80;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const monthExpenses = await Transaction.find({
    userId,
    type: "expense",
    date: { $gte: startOfMonth },
  });

  const totalSpent = monthExpenses.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const percent = Math.round((totalSpent / (monthlyBudget || 1)) * 100);

  if (percent >= threshold) {
    await sendBudgetAlertEmail({
      to: user.email,
      name: user.name,
      spent: totalSpent,
      budget: monthlyBudget,
      percent,
      threshold,
      currency: user.currency === "USD" ? "$" : "₹",
    });
  }
}

export default router;
