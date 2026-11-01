import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.middleware.js";
import SplitExpense from "../models/SplitExpense.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();
router.use(authenticateToken);
const METHODS = ["UPI", "Cash", "Bank Transfer"];

function cleanText(value, max = 100) {
  return String(value || "").trim().slice(0, max);
}
function validateParticipants(participants, amount) {
  if (!Array.isArray(participants) || participants.length < 2 || participants.length > 30) return "Add between 2 and 30 participants.";
  const names = participants.map(p => cleanText(p.name));
  if (names.some(n => !n) || new Set(names.map(n => n.toLowerCase())).size !== names.length) return "Participant names must be present and unique.";
  const total = participants.reduce((s, p) => s + Number(p.share), 0);
  if (participants.some(p => !Number.isFinite(Number(p.share)) || Number(p.share) < 0) || Math.abs(total - amount) > 0.01) return "Participant shares must add up to the full expense amount.";
  return null;
}
function present(doc) {
  const item = doc.toObject ? doc.toObject() : doc;
  return { ...item, id: String(item._id), participants: item.participants.map(p => ({ ...(p.toObject ? p.toObject() : p), id: String(p._id) })) };
}

router.get("/", async (req, res) => {
  try {
    const items = await SplitExpense.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });
    res.json({ success: true, splits: items.map(present) });
  } catch {
    res.status(500).json({ success: false, message: "Could not load split expenses." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, amount, date, category, scope, groupName, splitType, paidBy, paymentMethod, participants } = req.body;
    const total = Number(amount);
    if (!cleanText(title, 160) || !Number.isFinite(total) || total <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return res.status(400).json({ success: false, message: "Valid title, amount and date are required." });
    if (!METHODS.includes(paymentMethod || "UPI")) return res.status(400).json({ success: false, message: "Invalid payment method." });
    if (!["personal", "group"].includes(scope || "personal") || !["equal", "custom"].includes(splitType || "equal")) return res.status(400).json({ success: false, message: "Invalid split options." });
    const validation = validateParticipants(participants, total);
    if (validation) return res.status(400).json({ success: false, message: validation });
    if (!participants.some(p => cleanText(p.name).toLowerCase() === cleanText(paidBy).toLowerCase())) return res.status(400).json({ success: false, message: "Payer must be included as a participant." });

    const payer = participants.find(p => cleanText(p.name).toLowerCase() === cleanText(paidBy).toLowerCase());
    let payerTransaction = null;
    if (payer.share > 0) {
      payerTransaction = await Transaction.create({
        userId: req.user.id, title: cleanText(title, 160), amount: payer.share, type: "expense",
        majorHead: "Lifestyle", category: cleanText(category, 80) || "Other",
        date, paymentMethod: paymentMethod || "UPI", note: "PACE Split • payer's own share only", source: "manual"
      });
    }

    const split = await SplitExpense.create({
      userId: req.user.id, title: cleanText(title, 160), amount: total, date,
      category: cleanText(category, 80) || "Other", scope: scope || "personal",
      groupName: cleanText(groupName, 100), splitType: splitType || "equal",
      paidBy: cleanText(paidBy), paymentMethod: paymentMethod || "UPI",
      payerTransactionId: payerTransaction?._id || null,
      participants: participants.map(p => ({ name: cleanText(p.name), share: Number(p.share), settledAmount: 0, settlements: [] }))
    });
    res.status(201).json({ success: true, split: present(split), payerTransaction });
  } catch {
    res.status(500).json({ success: false, message: "Could not create split expense." });
  }
});

router.post("/:id/settlements", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid split ID." });
    const split = await SplitExpense.findOne({ _id: req.params.id, userId: req.user.id });
    if (!split) return res.status(404).json({ success: false, message: "Split not found." });
    const { participantId, amount, method, date, note } = req.body;
    const participant = split.participants.id(participantId);
    const paid = Number(amount);
    if (!participant) return res.status(404).json({ success: false, message: "Participant not found." });
    if (!Number.isFinite(paid) || paid <= 0 || participant.settledAmount + paid > participant.share + 0.001) return res.status(400).json({ success: false, message: "Settlement amount exceeds the outstanding balance." });
    if (!METHODS.includes(method) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return res.status(400).json({ success: false, message: "Choose a valid settlement method and date." });
    participant.settledAmount = Math.round((participant.settledAmount + paid) * 100) / 100;
    participant.settlements.push({ amount: paid, method, date, note: cleanText(note, 180) });
    await split.save();
    res.json({ success: true, split: present(split) });
  } catch {
    res.status(500).json({ success: false, message: "Could not record settlement." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const split = await SplitExpense.findOne({ _id: req.params.id, userId: req.user.id });
    if (!split) return res.status(404).json({ success: false, message: "Split not found." });
    if (split.payerTransactionId) await Transaction.deleteOne({ _id: split.payerTransactionId, userId: req.user.id });
    await split.deleteOne();
    res.json({ success: true, id: req.params.id });
  } catch {
    res.status(500).json({ success: false, message: "Could not delete split." });
  }
});

export default router;
