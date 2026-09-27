import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
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
    icon: {
      type: String,
      default: "💍",
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    startDate: {
      type: String, // YYYY-MM-DD
      default: "",
    },
    endDate: {
      type: String, // YYYY-MM-DD
      default: "",
    },
    description: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["active", "completed", "planned"],
      default: "active",
      index: true,
    },
    categories: {
      type: [String],
      default: ["Venue", "Shopping", "Decoration", "Travel", "Food", "Gifts", "Other"],
    },
    alertThresholds: {
      type: [Number],
      default: [50, 75, 90, 100],
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

eventSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Event || mongoose.model("Event", eventSchema);
