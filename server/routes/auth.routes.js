import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import validator from "validator";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import Event from "../models/Event.js";
import Loan from "../models/Loan.js";
import Goal from "../models/Goal.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authRateLimiter, otpRateLimiter } from "../middleware/security.middleware.js";
import {
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendPasswordResetOtpEmail,
  sendPasswordChangedEmail,
} from "../services/email.service.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "pace_jwt_secure_super_secret_key_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

/**
 * Helper to generate JWT Token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Helper to hash OTP with SHA-256
 */
function hashSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

/**
 * Format user payload for safe client response (never leak password or OTP hashes)
 */
function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    picture: user.picture || "",
    authProvider: user.authProvider,
    isEmailVerified: user.isEmailVerified,
    monthlyBudget: user.monthlyBudget,
    guardThreshold: user.guardThreshold,
    currency: user.currency || "INR",
    lastLogin: user.lastLogin,
    emailNotifications: user.emailNotifications,
    createdAt: user.createdAt,
  };
}

/**
 * Helper to extract client IP & User-Agent for security audit logs
 */
function getClientDetails(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || req.ip || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Unknown Device";
  return { ip, userAgent };
}

/* ==========================================================================
   AUTH ROUTES
   ========================================================================== */

/**
 * POST /api/auth/register
 * High-security registration with password hashing, input validation, and welcome email
 */
router.post("/register", authRateLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Valid name (min 2 characters) is required" });
    }

    if (!email || typeof email !== "string" || !validator.isEmail(email.trim())) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const normalizedEmail = validator.normalizeEmail(email.trim().toLowerCase()) || email.trim().toLowerCase();

    // Check existing account
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists. Please log in.",
      });
    }

    // Secure password hashing with salt rounds 12
    const hashedPassword = await bcrypt.hash(password, 12);
    const { ip, userAgent } = getClientDetails(req);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      guardThreshold: 80,
      authProvider: "local",
      isEmailVerified: true,
      lastLogin: {
        timestamp: new Date(),
        ip,
        userAgent,
      },
    });

    // Send Welcome Email
    sendWelcomeEmail({ to: user.email, name: user.name }).catch((err) =>
      console.warn("[Register] Welcome email trigger notice:", err.message)
    );

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Internal server error during registration" });
  }
});

/**
 * POST /api/auth/login
 * Secure login with rate-limiting, timing-safe verification, audit logging & alert email
 */
router.post("/login", authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.password && user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        message: "This account was created with Google Sign-In. Please click 'Continue with Google'.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const { ip, userAgent } = getClientDetails(req);

    // Update login security audit metadata
    user.lastLogin = {
      timestamp: new Date(),
      ip,
      userAgent,
    };
    await user.save();

    // Trigger Login Security Alert Email if enabled
    if (user.emailNotifications?.loginAlerts !== false) {
      sendLoginAlertEmail({
        to: user.email,
        name: user.name,
        ip,
        time: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        userAgent,
      }).catch((err) => console.warn("[Login] Security email trigger notice:", err.message));
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Login successful!",
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error during login" });
  }
});

/**
 * POST /api/auth/google
 * Verified Google OAuth with token signature validation & profile synchronization
 */
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    let payload = null;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential ID token is required for OAuth authentication",
      });
    }

    // Verify OAuth ID token with Google's servers
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID || "236425816974-q2qfjok68p0333obphbs6qr1gn9f64g7.apps.googleusercontent.com",
      });
      const googlePayload = ticket.getPayload();
      if (googlePayload) {
        payload = {
          sub: googlePayload.sub,
          email: googlePayload.email,
          name: googlePayload.name,
          picture: googlePayload.picture,
          email_verified: googlePayload.email_verified,
        };
      }
    } catch (err) {
      console.warn("[Google Auth] ID Token verification failed:", err.message);
      return res.status(401).json({
        success: false,
        message: "Google authentication failed: Invalid token signature",
      });
    }

    if (!payload?.email) {
      return res.status(400).json({
        success: false,
        message: "Google authentication failed: Email missing from account",
      });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const { ip, userAgent } = getClientDetails(req);
    let user = await User.findOne({ email: normalizedEmail });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        name: payload.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId: payload.sub,
        picture: payload.picture || "",
        authProvider: "google",
        isEmailVerified: true,
        guardThreshold: 80,
        lastLogin: {
          timestamp: new Date(),
          ip,
          userAgent,
        },
      });

      // Send Welcome Email to newly registered Google user
      sendWelcomeEmail({ to: user.email, name: user.name }).catch((err) =>
        console.warn("[Google Auth] Welcome email notice:", err.message)
      );
    } else {
      // Update Google profile fields and last login
      if (payload.sub && !user.googleId) user.googleId = payload.sub;
      if (payload.picture && !user.picture) user.picture = payload.picture;
      user.isEmailVerified = true;
      user.lastLogin = {
        timestamp: new Date(),
        ip,
        userAgent,
      };
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: isNewUser ? "Welcome to PACE!" : "Welcome back!",
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error("Google Auth error:", error);
    res.status(500).json({
      success: false,
      message: "Google authentication error",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Generates secure 6-digit OTP, saves hashed secret with 10m expiry, and sends via email
 */
router.post("/forgot-password", otpRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validator.isEmail(email.trim())) {
      return res.status(400).json({ success: false, message: "Please provide a valid registered email address" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Timing attack mitigation: Return standard success response even if user doesn't exist
    if (!user) {
      return res.json({
        success: true,
        message: "If an account exists with this email, a verification code has been sent.",
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const codeHash = hashSecret(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetPasswordOtp = {
      codeHash,
      expiresAt,
      attempts: 0,
    };
    await user.save();

    // Send email with the OTP
    await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      expiresInMinutes: 10,
    });

    res.json({
      success: true,
      message: "A 6-digit verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Failed to process password reset request" });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies OTP code, guards against brute force (locks after 5 attempts), returns resetToken
 */
router.post("/verify-otp", otpRateLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP code are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.resetPasswordOtp?.codeHash) {
      return res.status(400).json({
        success: false,
        message: "No pending password reset request found. Please request a new OTP.",
      });
    }

    // Check attempts limit
    if (user.resetPasswordOtp.attempts >= 5) {
      user.resetPasswordOtp = { codeHash: null, expiresAt: null, attempts: 0 };
      await user.save();
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. For security, this OTP was invalidated. Please request a new code.",
      });
    }

    // Check expiration
    if (new Date() > new Date(user.resetPasswordOtp.expiresAt)) {
      user.resetPasswordOtp = { codeHash: null, expiresAt: null, attempts: 0 };
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
      });
    }

    // Compare hash
    const inputHash = hashSecret(otp.trim());
    if (inputHash !== user.resetPasswordOtp.codeHash) {
      user.resetPasswordOtp.attempts = (user.resetPasswordOtp.attempts || 0) + 1;
      await user.save();
      const remaining = 5 - user.resetPasswordOtp.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    // Clear OTP and generate temporary resetToken (valid for 15 mins)
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashSecret(rawResetToken);

    user.resetPasswordOtp = { codeHash: null, expiresAt: null, attempts: 0 };
    user.resetPasswordToken = {
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
    await user.save();

    res.json({
      success: true,
      message: "Code verified successfully! You can now set a new password.",
      resetToken: rawResetToken,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Error verifying OTP code" });
  }
});

/**
 * POST /api/auth/reset-password
 * Sets new password using verified resetToken or direct OTP
 */
router.post("/reset-password", authRateLimiter, async (req, res) => {
  try {
    const { email, resetToken, otp, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    let isAuthorized = false;

    // Check authorization via resetToken
    if (resetToken && user.resetPasswordToken?.tokenHash) {
      const tokenHash = hashSecret(resetToken.trim());
      if (
        tokenHash === user.resetPasswordToken.tokenHash &&
        new Date() < new Date(user.resetPasswordToken.expiresAt)
      ) {
        isAuthorized = true;
      }
    }

    // Direct OTP fallback check
    if (!isAuthorized && otp && user.resetPasswordOtp?.codeHash) {
      const otpHash = hashSecret(otp.trim());
      if (
        otpHash === user.resetPasswordOtp.codeHash &&
        new Date() < new Date(user.resetPasswordOtp.expiresAt)
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or expired password reset session. Please request a new verification code.",
      });
    }

    // Hash and update password
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = { tokenHash: null, expiresAt: null };
    user.resetPasswordOtp = { codeHash: null, expiresAt: null, attempts: 0 };
    await user.save();

    // Send confirmation email
    sendPasswordChangedEmail({
      to: user.email,
      name: user.name,
      time: new Date().toLocaleString(),
    }).catch((err) => console.warn("[Reset Password] Confirmation email notice:", err.message));

    res.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user profile
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error("[Auth /me Error]", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch user profile" });
  }
});

/**
 * POST /api/auth/change-password
 * Authenticated password change with security confirmation email
 */
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // If user has a password set, verify currentPassword
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is required" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Incorrect current password" });
      }
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    sendPasswordChangedEmail({
      to: user.email,
      name: user.name,
      time: new Date().toLocaleString(),
    }).catch(() => {});

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("[Auth change-password Error]", error.message);
    res.status(500).json({ success: false, message: "Failed to update password" });
  }
});

/**
 * DELETE /api/auth/account
 * Provider-aware, atomic account deletion cascade using Mongoose session & transaction
 */
router.delete("/account", authenticateToken, async (req, res) => {
  let session = null;
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const { password, confirmText } = req.body || {};

    // Independent Backend Provider Determination & Re-authentication
    if (user.authProvider === "google") {
      if (!confirmText || String(confirmText).trim().toUpperCase() !== "DELETE") {
        return res.status(400).json({
          success: false,
          message: "Please type 'DELETE' to confirm account deletion.",
        });
      }
    } else {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to confirm account deletion.",
        });
      }
      const isMatch = await bcrypt.compare(password, user.password || "");
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Incorrect password. Account deletion denied.",
        });
      }
    }

    // Attempt Mongoose Atomic Transaction
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      await Transaction.deleteMany({ userId }, { session });
      await Event.deleteMany({ userId }, { session });
      await Loan.deleteMany({ userId }, { session });
      await Budget.deleteMany({ userId }, { session });
      await Goal.deleteMany({ userId }, { session });
      await User.findOneAndDelete({ _id: userId }, { session });

      await session.commitTransaction();
      return res.json({
        success: true,
        message: "Account and all associated financial data permanently deleted.",
      });
    } catch (txError) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
          // Ignore transaction abort failure
        }
      }

      // Check if session transaction is unsupported on standalone local MongoDB
      const isUnsupported =
        txError.message &&
        (txError.message.includes("Transaction numbers") ||
          txError.message.includes("replica set") ||
          txError.message.includes("standalone"));

      if (isUnsupported) {
        console.warn("[Account Delete] MongoDB standalone fallback executed for user:", userId);
        // Fallback for standalone MongoDB environments
        await Transaction.deleteMany({ userId });
        await Event.deleteMany({ userId });
        await Loan.deleteMany({ userId });
        await Budget.deleteMany({ userId });
        await Goal.deleteMany({ userId });
        await User.findOneAndDelete({ _id: userId });

        return res.json({
          success: true,
          message: "Account and all associated financial data permanently deleted.",
        });
      }

      throw txError;
    }
  } catch (error) {
    console.error("[PACE Security] Account deletion error:", error.message || error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while deleting your account. Please try again later.",
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

export default router;
