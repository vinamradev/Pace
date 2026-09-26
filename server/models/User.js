import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, // Optional for Google OAuth users
    },
    googleId: {
      type: String,
      sparse: true,
    },
    picture: {
      type: String,
      default: "",
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    monthlyBudget: {
      type: Number,
      default: 20000,
    },
    guardThreshold: {
      type: Number,
      default: 80,
    },
    currency: {
      type: String,
      default: "INR",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
