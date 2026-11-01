import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.middleware.js";
import SplitExpense from "../models/SplitExpense.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();
router.use(authenticateToken);
const METHODS = ["UPI", "Cash", "Bank Transfer"];
const round2 = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const cleanText = (value, max = 100) => String(value || "").trim().slice(0, max);

function validateParticipants(participants, amount) {
  if (!Array.isArray(participants) || participants.length < 2 || participants.length > 30) return "Add between 2 and 30 participants.";
  const names = participants.map(p => cleanText(p.name));
  if (names.some(n => !n) || new Set(names.map(n => n.toLowerCase())).size !== names.length) return "Participant names must be present and unique.";
  if (!names.some(n => n.toLowerCase() === "me")) return 'Add yourself as a participant using the name "Me".';
  const values = participants.map(p => Number(p.share));
  if (values.some(v => !Number.isFinite(v) || v < 0)) return "Each participant must have a valid, non-negative share.";
  if (values.some(v => round2(v) !== v)) return "Participant shares must use at most two decimal places.";
  const total = round2(values.reduce((s, v) => s + v, 0));
  if (Math.abs(total - amount) > 0.009) return "Participant shares must add up to the full expense amount.";
  return null;
}

function present(doc) {
  const item = doc.toObject ? doc.toObject() : doc;
  return {
    ...item,
    id: String(item._id),
    participants: (item.participants || []).map(p => ({
      ...(p.toObject ? p.toObject() : p),
      id: String(p._id)
    }))
  };
}

// Split records are private to the authenticated PACE account.
router.get("/", async (req, res) => {
  try {
    const items = await SplitExpense.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });
    res.json({ success: true, splits: items.map(present) });
  } catch {
    res.status(500).json({ success: false, message: "Could not load split expenses." });
  }
});

// The user's own share is the only amount booked to PACE's expense ledger.
// Other participants' shares remain receivables/payables in the split ledger,
// so the group bill is never double-counted as the user's living spend.
router.post("/", async (req, res) => {
  let payerTransaction = null;
  let createdSplit = null;
  try {
    const { title, amount, date, category, scope, groupName, splitType, paidBy, paymentMethod, participants } = req.body;
    const total = round2(amount);
    const method = paymentMethod || "UPI";

    if (!cleanText(title, 160) || !Number.isFinite(total) || total <= 0 || round2(Number(amount)) !== Number(amount) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
      return res.status(400).json({ success: false, message: "Valid title, amount and date are required." });
    }
    if (!METHODS.includes(method)) return res.status(400).json({ success: false, message: "Invalid payment method." });
    if (!["personal", "group"].includes(scope || "personal") || !["equal", "custom"].includes(splitType || "equal")) {
      return res.status(400).json({ success: false, message: "Invalid split options." });
    }
    const validation = validateParticipants(participants, total);
    if (validation) return res.status(400).json({ success: false, message: validation });
    if (!participants.some(p => cleanText(p.name).toLowerCase() === cleanText(paidBy).toLowerCase())) {
      return res.status(400).json({ success: false, message: "Payer must be included as a participant." });
    }

    const me = participants.find(p => cleanText(p.name).toLowerCase() === "me");
    createdSplit = await SplitExpense.create({
      userId: req.user.id,
      title: cleanText(title, 160),
      amount: total,
      date,
      category: cleanText(category, 80) || "Other",
      scope: scope || "personal",
      groupName: cleanText(groupName, 100),
      splitType: splitType || "equal",
      paidBy: cleanText(paidBy),
      paymentMethod: method,
      payerTransactionId: null,
      participants: participants.map(p => ({ name: cleanText(p.name), share: round2(p.share), settledAmount: cleanText(p.name).toLowerCase() === cleanText(paidBy).toLowerCase() ? round2(p.share) : 0, settlements: [] }))
    });

    if (me.share > 0) {
      payerTransaction = await Transaction.create({
        userId: req.user.id,
        title: cleanText(title, 160),
        amount: round2(me.share),
        type: "expense",
        majorHead: "Lifestyle",
        category: cleanText(category, 80) || "Other",
        date,
        paymentMethod: method,
        note: "PACE Split • your share only; settlements excluded from spending",
        source: "manual",
        splitExpenseId: createdSplit._id
      });
      createdSplit.payerTransactionId = payerTransaction._id;
      await createdSplit.save();
    }

    res.status(201).json({ success: true, split: present(createdSplit), payerTransaction });
  } catch {
    if (payerTransaction?._id) {
      await Transaction.deleteOne({ _id: payerTransaction._id, userId: req.user.id }).catch(() => {});
    }
    if (createdSplit?._id) {
      await SplitExpense.deleteOne({ _id: createdSplit._id, userId: req.user.id }).catch(() => {});
    }
    res.status(500).json({ success: false, message: "Could not create split expense. No expense was retained." });
  }
});

// A settlement clears a receivable/payable only. It is not another expense.
router.post("/:id/settlements", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid split ID." });
    const split = await SplitExpense.findOne({ _id: req.params.id, userId: req.user.id });
    if (!split) return res.status(404).json({ success: false, message: "Split not found." });

    const { participantId, amount, method, date, note } = req.body;
    const participant = split.participants.id(participantId);
    const paid = round2(amount);
    if (!participant) return res.status(404).json({ success: false, message: "Participant not found." });

    const payerIsMe = cleanText(split.paidBy).toLowerCase() === "me";
    const isValidCounterparty = payerIsMe
      ? cleanText(participant.name).toLowerCase() !== "me"
      : cleanText(participant.name).toLowerCase() === "me";
    if (!isValidCounterparty) return res.status(403).json({ success: false, message: "Only the amount owed to you or by you can be settled here." });
    if (!Number.isFinite(paid) || paid <= 0 || round2(Number(amount)) !== Number(amount) || round2(participant.settledAmount + paid) > round2(participant.share) + 0.001) {
      return res.status(400).json({ success: false, message: "Settlement amount exceeds the outstanding balance." });
    }
    if (!METHODS.includes(method) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
      return res.status(400).json({ success: false, message: "Choose a valid settlement method and date." });
    }

    participant.settledAmount = round2(participant.settledAmount + paid);
    participant.settlements.push({ amount: paid, method, date, note: cleanText(note, 180) });
    await split.save();
    res.json({ success: true, split: present(split) });
  } catch {
    res.status(500).json({ success: false, message: "Could not record settlement." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid split ID." });
    const split = await SplitExpense.findOne({ _id: req.params.id, userId: req.user.id });
    if (!split) return res.status(404).json({ success: false, message: "Split not found." });
    if (split.payerTransactionId) {
      await Transaction.deleteOne({ _id: split.payerTransactionId, userId: req.user.id });
    }
    await split.deleteOne();
    res.json({ success: true, id: req.params.id });
  } catch {
    res.status(500).json({ success: false, message: "Could not delete split." });
  }
});

export default router;
