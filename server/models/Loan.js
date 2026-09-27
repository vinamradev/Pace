import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    type: {
      type: String,
      enum: ["Home Loan", "Vehicle Loan", "Personal Loan", "Education Loan", "Business Loan", "Other"],
      default: "Home Loan",
    },
    lender: {
      type: String,
      default: "",
      trim: true,
    },
    originalPrincipal: {
      type: Number,
      required: true,
      min: 0,
    },
    currentOutstanding: {
      type: Number,
      required: true,
      min: 0,
    },
    interestRate: {
      type: Number, // Annual percentage e.g. 8.5
      required: true,
      min: 0,
      max: 100,
    },
    tenureMonths: {
      type: Number,
      required: true,
      min: 1,
    },
    remainingTenureMonths: {
      type: Number,
      required: true,
      min: 0,
    },
    emiAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDay: {
      type: Number,
      default: 5,
      min: 1,
      max: 31,
    },
    startDate: {
      type: String, // YYYY-MM-DD
      default: "",
    },
    accountNumber: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

loanSchema.index({ userId: 1, status: 1 });

export default mongoose.models.Loan || mongoose.model("Loan", loanSchema);
