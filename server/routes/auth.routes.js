import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import Budget from "../models/Budget.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "pace_jwt_secret_key_2026";

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, monthlyBudget = 20000 } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      monthlyBudget: Number(monthlyBudget) || 20000,
    });

    await Budget.create({
      userId: user._id,
      monthlyBudget: user.monthlyBudget,
      guardThreshold: 80,
      categoryBudgets: {},
    });

    const token = generateToken(user);
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        monthlyBudget: user.monthlyBudget,
        guardThreshold: user.guardThreshold,
      },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        monthlyBudget: user.monthlyBudget,
        guardThreshold: user.guardThreshold,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// POST /api/auth/google
router.post("/google", async (req, res) => {
  try {
    const { credential, email, name, picture, googleId } = req.body;
    let payload = { email, name, picture, sub: googleId };

    // If credential ID token is passed, verify with Google
    if (credential && process.env.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (err) {
        console.warn("Google verifyIdToken failed, falling back to payload fields:", err.message);
      }
    }

    if (!payload.email) {
      return res.status(400).json({ message: "Google authentication failed: Email missing" });
    }

    const normalizedEmail = payload.email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Create new user via Google
      user = await User.create({
        name: payload.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId: payload.sub,
        picture: payload.picture || "",
        authProvider: "google",
        monthlyBudget: 20000,
        guardThreshold: 80,
      });

      await Budget.create({
        userId: user._id,
        monthlyBudget: 20000,
        guardThreshold: 80,
        categoryBudgets: {},
      });
    } else {
      // Update Google profile fields if needed
      user.googleId = payload.sub || user.googleId;
      user.picture = payload.picture || user.picture;
      await user.save();
    }

    const token = generateToken(user);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        monthlyBudget: user.monthlyBudget,
        guardThreshold: user.guardThreshold,
      },
      token,
    });
  } catch (error) {
    console.error("Google Auth error:", error);
    res.status(500).json({ message: "Google authentication error", error: error.message });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Reset password error", error: error.message });
  }
});

export default router;
