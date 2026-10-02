import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false, // Optional for Google OAuth users
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
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
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    monthlyBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    guardThreshold: {
      type: Number,
      default: 80,
      min: 10,
      max: 100,
    },
    currency: {
      type: String,
      default: "INR",
    },
    // OTP-based password reset security
    resetPasswordOtp: {
      codeHash: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
    },
    // Token returned after successful OTP verification to finalize password change
    resetPasswordToken: {
      tokenHash: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },
    // Security audit logs
    lastLogin: {
      timestamp: { type: Date, default: Date.now },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },
    // Notification preferences
    emailNotifications: {
      budgetAlerts: { type: Boolean, default: true },
      loginAlerts: { type: Boolean, default: true },
      monthlyReport: { type: Boolean, default: true },
      transactions: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
