import express from "express";
import Transaction from "../models/Transaction.js";

const router = express.Router();

// GET /api/transactions?userId=...
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId query param required" });
    }

    const transactions = await Transaction.find({ userId }).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transactions", error: error.message });
  }
});

// POST /api/transactions
router.post("/", async (req, res) => {
  try {
    const { userId, title, amount, type, category, date, paymentMethod, note, source, receiptUrl } =
      req.body;

    if (!userId || !title || amount === undefined || !date) {
      return res.status(400).json({ message: "userId, title, amount, and date are required" });
    }

    const transaction = await Transaction.create({
      userId,
      title,
      amount: Number(amount),
      type: type || "expense",
      category: category || "Other",
      date,
      paymentMethod: paymentMethod || "UPI",
      note: note || "",
      source: source || "manual",
      receiptUrl: receiptUrl || "",
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Failed to create transaction", error: error.message });
  }
});

// POST /api/transactions/bulk (For Bank / GPay statement imports!)
router.post("/bulk", async (req, res) => {
  try {
    const { userId, transactions } = req.body;
    if (!userId || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: "userId and transactions array required" });
    }

    const docs = transactions.map((t) => ({
      userId,
      title: t.title || "Imported Transaction",
      amount: Number(t.amount) || 0,
      type: t.type || "expense",
      category: t.category || "Other",
      date: t.date || new Date().toISOString().split("T")[0],
      paymentMethod: t.paymentMethod || "Bank / GPay",
      note: t.note || "Imported from statement",
      source: "statement_import",
    }));

    const inserted = await Transaction.insertMany(docs);
    res.status(201).json({ count: inserted.length, transactions: inserted });
  } catch (error) {
    res.status(500).json({ message: "Failed to bulk import transactions", error: error.message });
  }
});

// DELETE /api/transactions/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json({ message: "Transaction deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete transaction", error: error.message });
  }
});

export default router;
