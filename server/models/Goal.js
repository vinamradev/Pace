import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
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
    targetAmount: {
      type: Number,
      required: true,
    },
    currentAmount: {
      type: Number,
      default: 0,
    },
    deadline: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "Personal",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Goal || mongoose.model("Goal", goalSchema);
