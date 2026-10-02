import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    monthlyBudget: {
      type: Number,
      default: 0,
    },
    guardThreshold: {
      type: Number,
      default: 80,
    },
    categoryBudgets: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Budget || mongoose.model("Budget", budgetSchema);
