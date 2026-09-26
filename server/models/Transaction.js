import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["expense", "income"],
      default: "expense",
    },
    category: {
      type: String,
      required: true,
      default: "Other",
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      default: "UPI",
    },
    note: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      enum: ["manual", "ocr", "statement_import", "demo"],
      default: "manual",
    },
    receiptUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
