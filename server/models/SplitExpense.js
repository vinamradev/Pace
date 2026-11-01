import mongoose from "mongoose";

const splitExpenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  category: { type: String, default: "Other", maxlength: 80 },
  scope: { type: String, enum: ["personal", "group"], default: "personal" },
  groupName: { type: String, default: "", maxlength: 100 },
  splitType: { type: String, enum: ["equal", "custom"], default: "equal" },
  paidBy: { type: String, required: true, maxlength: 100 },
  paymentMethod: { type: String, enum: ["UPI", "Cash", "Bank Transfer"], default: "UPI" },
  payerTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
  participants: [{
    name: { type: String, required: true, maxlength: 100 },
    share: { type: Number, required: true, min: 0 },
    settledAmount: { type: Number, default: 0, min: 0 },
    settlements: [{
      amount: { type: Number, required: true, min: 0.01 },
      method: { type: String, enum: ["UPI", "Cash", "Bank Transfer"], required: true },
      date: { type: String, required: true },
      note: { type: String, default: "", maxlength: 180 }
    }]
  }]
}, { timestamps: true });

splitExpenseSchema.index({ userId: 1, date: -1 });
export default mongoose.models.SplitExpense || mongoose.model("SplitExpense", splitExpenseSchema);
