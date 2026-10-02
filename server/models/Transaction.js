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
      maxlength: 200,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: [
        "expense",        // Genuine spending (Food, Travel, Bills, Shopping, etc.)
        "income",         // Income (Salary, Refund, Business, Freelance, Gift)
        "savings",        // Savings deposit, Emergency fund, RD (NOT normal spending)
        "investment",     // Mutual Funds, SIP, PPF, Stocks, FD (NOT normal spending)
        "debt_repayment", // Loan repayment, Personal debt EMI (NOT normal spending)
        "transfer",       // Internal account movement (Bank A -> Bank B, NOT spending)
        "cash_withdrawal" // Bank -> Cash (NOT spending until cash is actually spent)
      ],
      default: "expense",
      index: true,
    },
    majorHead: {
      type: String,
      default: "General",
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      default: "Other",
      index: true,
    },
    merchant: {
      type: String,
      default: "",
      trim: true,
    },
    account: {
      type: String,
      default: "Primary Account",
      trim: true,
    },
    fromAccount: {
      type: String,
      default: "",
      trim: true,
    },
    toAccount: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: String, // YYYY-MM-DD
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
      maxlength: 1000,
    },
    receiptUrl: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      enum: ["manual", "ocr", "statement_import", "recurring", "loan_emi"],
      default: "manual",
    },
    // Optional Event Association (e.g. Wedding, Vacation, Renovation)
    eventId: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or local client string ID
      ref: "Event",
      default: null,
      index: true,
    },
    // Optional Loan Association (e.g. Home Loan EMI)
    loanId: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId or local client string ID
      ref: "Loan",
      default: null,
      index: true,
    },
    principalAmount: {
      type: Number,
      default: 0,
    },
    interestAmount: {
      type: Number,
      default: 0,
    },
    // Recurring Metadata
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly", "yearly", "none"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast monthly user queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, eventId: 1 });
transactionSchema.index({ userId: 1, loanId: 1 });

export default mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
