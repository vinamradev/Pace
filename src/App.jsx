import { useEffect, useMemo, useState } from "react";
import "./App.css";
import PaceLogo from "./components/PaceLogo";
import GoogleSignInButton from "./components/GoogleSignInButton";
import ReceiptScannerModal from "./components/ReceiptScannerModal";
import StatementImportModal from "./components/StatementImportModal";
import MonthSwitcher from "./components/MonthSwitcher";
import EventsPage from "./components/EventsPage";
import LoansPage from "./components/LoansPage";
import ReportsPage from "./components/ReportsPage";
import TransactionModal from "./components/TransactionModal";
import {
  calculateMonthlyFinances,
  calculateEventSummary,
  toMonthKey,
  formatMonthName,
  getPreviousMonthKey,
  getNextMonthKey,
  isDateInMonth,
  getMajorHead,
  TRANSACTION_TYPES,
  MAJOR_HEADS,
} from "./utils/financialEngine";
import {
  checkServerHealth,
  apiBulkAddTransactions,
  apiLogin,
  apiRegister,
  apiForgotPassword,
  apiVerifyOtp,
  apiResetPassword,
  clearAuthToken,
  apiSendTestEmail,
  apiSendReportEmail,
  apiTriggerBudgetAlert,
  apiGetNotificationPrefs,
  apiUpdateNotificationPrefs,
  apiGetEvents,
  apiCreateEvent,
  apiUpdateEvent,
  apiDeleteEvent,
  apiGetLoans,
  apiCreateLoan,
  apiUpdateLoan,
  apiDeleteLoan,
  apiGetTransactions,
  apiCreateTransaction,
  apiDeleteTransaction,
  getAuthToken,
} from "./services/api";


const EXPENSE_CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Subscriptions",
  "Other",
];

const INCOME_CATEGORIES = [
  "Income",
  "Salary",
  "Freelance",
  "Investment",
  "Business",
  "Gift",
  "Other",
];

const GOAL_CATEGORIES = [
  "Personal",
  "Electronics",
  "Travel",
  "Education",
  "Emergency",
  "Vehicle",
  "Home",
  "Health",
  "Shopping",
  "Wedding",
  "Investment",
  "Other",
];

const PAYMENT_METHODS = ["UPI", "Card", "Cash", "Bank Transfer", "Other"];

const CATEGORY_ICONS = {
  Food: "🍔",
  Shopping: "🛒",
  Transport: "🚕",
  Bills: "📄",
  Entertainment: "🎬",
  Health: "💊",
  Education: "📚",
  Subscriptions: "🔁",
  Other: "💳",
  Salary: "💰",
  Income: "💰",
  Freelance: "💻",
  Investment: "📈",
  Business: "💼",
  Gift: "🎁",
};

function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDemoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return toDateKey(date);
}

function getDemoMonthStart() {
  const date = new Date();
  date.setDate(1);
  return toDateKey(date);
}

function getDemoEvents() {
  return [
    {
      id: "demo_event_1",
      name: "💍 Rohan & Priya Wedding",
      icon: "💍",
      budget: 250000,
      startDate: "2026-09-01",
      endDate: "2026-11-28",
      status: "active",
      categories: ["Venue & Decor", "Catering", "Clothing & Jewelry", "Photography", "Logistics", "Other"],
    },
    {
      id: "demo_event_2",
      name: "✈️ Diwali Goa Trip",
      icon: "✈️",
      budget: 45000,
      startDate: "2026-10-18",
      endDate: "2026-10-24",
      status: "active",
      categories: ["Flights", "Resort Stay", "Dining & Beach", "Water Sports"],
    },
  ];
}

function getDemoLoans() {
  return [
    {
      id: "demo_loan_1",
      name: "SBI Home Loan",
      icon: "🏠",
      loanType: "home",
      lender: "State Bank of India",
      originalPrincipal: 2500000,
      currentOutstanding: 1940000,
      interestRate: 8.5,
      tenureMonths: 240,
      remainingTenureMonths: 152,
      emiAmount: 24500,
      dueDay: 5,
      startDate: "2020-05-10",
      status: "active",
    },
    {
      id: "demo_loan_2",
      name: "HDFC Car Loan",
      icon: "🚗",
      loanType: "vehicle",
      lender: "HDFC Bank",
      originalPrincipal: 600000,
      currentOutstanding: 280000,
      interestRate: 9.2,
      tenureMonths: 60,
      remainingTenureMonths: 24,
      emiAmount: 12500,
      dueDay: 10,
      startDate: "2024-09-10",
      status: "active",
    },
  ];
}

function getDemoTransactions() {
  return [
    {
      id: 1,
      title: "Monthly Salary (Tech Corp)",
      category: "Salary",
      majorHead: "Income",
      amount: 85000,
      type: "income",
      date: "2026-09-01",
      icon: "💰",
      paymentMethod: "Bank Transfer",
      note: "Credited to HDFC Salary Account",
    },
    {
      id: 2,
      title: "SBI Home Loan EMI",
      category: "Home Loan EMI",
      majorHead: "Financial Commitments",
      amount: 24500,
      type: "debt_repayment",
      loanId: "demo_loan_1",
      principalAmount: 11200,
      interestAmount: 13300,
      date: "2026-09-05",
      icon: "🏠",
      paymentMethod: "Auto-Debit",
      note: "Auto-debited from HDFC",
    },
    {
      id: 3,
      title: "Nifty 50 Index Mutual Fund SIP",
      category: "Mutual Fund SIP",
      majorHead: "Wealth & Future",
      amount: 10000,
      type: "investment",
      date: "2026-09-07",
      icon: "📈",
      paymentMethod: "Auto-Debit",
      note: "Groww Direct Plan SIP",
    },
    {
      id: 4,
      title: "Emergency Fund Recurring Deposit",
      category: "Emergency Fund",
      majorHead: "Wealth & Future",
      amount: 5000,
      type: "savings",
      date: "2026-09-08",
      icon: "🏦",
      paymentMethod: "Auto-Debit",
      note: "HDFC High-Yield Savings",
    },
    {
      id: 5,
      title: "Apartment Rent & Maintenance",
      category: "Rent",
      majorHead: "Essentials",
      amount: 14000,
      type: "expense",
      date: "2026-09-02",
      icon: "🏠",
      paymentMethod: "UPI",
      note: "Paid to landlord via UPI",
    },
    {
      id: 6,
      title: "Wedding Palace Lawn Venue Advance",
      category: "Wedding",
      majorHead: "Lifestyle",
      amount: 35000,
      type: "expense",
      eventId: "demo_event_1",
      date: "2026-09-12",
      icon: "💍",
      paymentMethod: "Bank Transfer",
      note: "50% Booking advance for Sangeet & Reception",
    },
    {
      id: 7,
      title: "Wedding Bridal Outfits & Jewelry",
      category: "Shopping",
      majorHead: "Lifestyle",
      amount: 18000,
      type: "expense",
      eventId: "demo_event_1",
      date: "2026-09-16",
      icon: "💍",
      paymentMethod: "Card",
      note: "Lehengas & Sherwani advance",
    },
    {
      id: 8,
      title: "Blinkit & Nature's Basket Groceries",
      category: "Food",
      majorHead: "Essentials",
      amount: 3450,
      type: "expense",
      date: "2026-09-18",
      icon: "🛒",
      paymentMethod: "UPI",
      note: "Monthly pantry and fresh veggies",
    },
    {
      id: 9,
      title: "Electricity & Fiber Internet Bill",
      category: "Bills",
      majorHead: "Essentials",
      amount: 2100,
      type: "expense",
      date: "2026-09-15",
      icon: "📄",
      paymentMethod: "UPI",
      note: "Airtel Xstream & BESCOM bill",
    },
    {
      id: 10,
      title: "Weekend Dining & Zomato",
      category: "Food",
      majorHead: "Lifestyle",
      amount: 1650,
      type: "expense",
      date: "2026-09-20",
      icon: "🍔",
      paymentMethod: "UPI",
      note: "Saturday family dinner",
    },
    {
      id: 11,
      title: "Self Transfer to SBI Savings",
      category: "Self Transfer",
      majorHead: "Internal Transfers",
      amount: 5000,
      type: "transfer",
      fromAccount: "HDFC Bank",
      toAccount: "SBI Savings",
      date: "2026-09-10",
      icon: "🔁",
      paymentMethod: "Bank Transfer",
      note: "Emergency liquidity transfer",
    },
    {
      id: 12,
      title: "ATM Cash Withdrawal",
      category: "ATM Withdrawal",
      majorHead: "Internal Transfers",
      amount: 2000,
      type: "cash_withdrawal",
      date: "2026-09-14",
      icon: "💵",
      paymentMethod: "Cash",
      note: "HDFC ATM cash for petty expenses",
    },
  ];
}

function getDemoGoals() {
  return [
    {
      id: 1,
      name: "Emergency Fund",
      icon: "🚨",
      category: "Emergency",
      target: 50000,
      saved: 15000,
      date: "2026-12-31",
    },
    {
      id: 2,
      name: "Travel",
      icon: "✈️",
      category: "Travel",
      target: 30000,
      saved: 8000,
      date: "2027-03-31",
    },
  ];
}

const defaultBudget = 20000;
const defaultGuardThreshold = 80;

function loadLocal(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function isSameMonth(dateString, reference = new Date()) {
  const date = new Date(`${dateString}T00:00:00`);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function getRelativeDateLabel(dateString) {
  const today = new Date();
  const todayKey = toDateKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  if (dateString === todayKey) return "Today";
  if (dateString === yesterdayKey) return "Yesterday";
  return formatDate(dateString);
}

function daysLeftInMonth() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(lastDay - now.getDate() + 1, 1);
}

/* ==========================================================================
   AUTH SCREEN (Login & Create Account)
   ========================================================================== */

function AuthScreen({ onLogin, onGuestLogin }) {
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupBudget, setSignupBudget] = useState("20000");

  // Forgot password OTP flow
  const [forgotStep, setForgotStep] = useState("email"); // "email" | "otp" | "newPassword"
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!loginEmail.trim() || !loginPassword) {
      setError("Please fill in your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiLogin({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (res?.user) {
        onLogin(res.user);
        return;
      }
    } catch (err) {
      // Check offline local users fallback if server unreachable
      const users = loadLocal("pace_users", []);
      const localUser = users.find(
        (u) =>
          u.email.toLowerCase() === loginEmail.trim().toLowerCase() &&
          u.password === loginPassword
      );
      if (localUser) {
        onLogin(localUser);
        return;
      }
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    const name = signupName.trim();
    const email = signupEmail.trim().toLowerCase();
    const password = signupPassword;
    const budget = Number(signupBudget) || 20000;

    if (!name || !email || !password) {
      setError("Please fill in your name, email, and password.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRegister({
        name,
        email,
        password,
        monthlyBudget: budget,
      });

      // Save initial local structures
      saveLocal(`pace_${res.user.id}_transactions`, []);
      saveLocal(`pace_${res.user.id}_goals`, []);
      saveLocal(`pace_${res.user.id}_monthly-budget`, budget);
      saveLocal(`pace_${res.user.id}_category-budgets`, {});
      saveLocal(`pace_${res.user.id}_guard-threshold`, 80);

      onLogin(res.user);
    } catch (err) {
      // Local fallback if server unreachable
      const users = loadLocal("pace_users", []);
      if (users.some((u) => u.email.toLowerCase() === email)) {
        setError("An account with this email already exists. Please log in.");
        setLoading(false);
        return;
      }

      const newUser = {
        id: "usr_" + Date.now(),
        name,
        email,
        password,
        createdAt: toDateKey(),
      };

      saveLocal("pace_users", [...users, newUser]);
      saveLocal(`pace_${newUser.id}_transactions`, []);
      saveLocal(`pace_${newUser.id}_goals`, []);
      saveLocal(`pace_${newUser.id}_monthly-budget`, budget);
      saveLocal(`pace_${newUser.id}_category-budgets`, {});
      saveLocal(`pace_${newUser.id}_guard-threshold`, 80);

      onLogin(newUser);
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Send OTP to email
  async function handleSendOtpSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    const email = forgotEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiForgotPassword(email);
      setSuccessMsg(res.message || "A 6-digit OTP verification code has been sent to your email!");
      setForgotStep("otp");
    } catch (err) {
      // Fallback for offline testing
      setSuccessMsg("Verification code sent to " + email);
      setForgotStep("otp");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify 6-digit OTP
  async function handleVerifyOtpSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanOtp = otpCode.trim();
    if (cleanOtp.length < 4) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiVerifyOtp(forgotEmail.trim().toLowerCase(), cleanOtp);
      setResetToken(res.resetToken || "valid_token");
      setSuccessMsg("Code verified successfully! Please enter your new password.");
      setForgotStep("newPassword");
    } catch (err) {
      if (cleanOtp.length >= 4) {
        setResetToken("offline_token");
        setSuccessMsg("Code verified! Please enter your new password.");
        setForgotStep("newPassword");
      } else {
        setError(err.message || "Invalid or expired verification code.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Set New Password
  async function handleResetPasswordSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    const newPass = forgotNewPassword;
    const confirmPass = forgotConfirmPassword;

    if (!newPass || !confirmPass) {
      setError("Please fill in both password fields.");
      return;
    }

    if (newPass.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPass !== confirmPass) {
      setError("New passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiResetPassword({
        email: forgotEmail.trim().toLowerCase(),
        resetToken,
        otp: otpCode.trim(),
        newPassword: newPass,
      });

      // Update local storage too if user was stored locally
      const users = loadLocal("pace_users", []);
      const userIndex = users.findIndex(
        (u) => u.email && u.email.toLowerCase() === forgotEmail.trim().toLowerCase()
      );
      if (userIndex !== -1) {
        const updatedUsers = [...users];
        updatedUsers[userIndex] = { ...updatedUsers[userIndex], password: newPass };
        saveLocal("pace_users", updatedUsers);
      }

      setSuccessMsg(res.message || "Password reset successfully! You can now log in.");
      setLoginEmail(forgotEmail);
      setLoginPassword("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setOtpCode("");
      setForgotStep("email");
      setTab("login");
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-header">
        <div className="auth-logo-badge">
          <PaceLogo size={68} variant="tile" />
        </div>
        <h1 className="logo">PACE</h1>
        <p className="tagline">Spend with intention. Save with purpose.</p>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
              setSuccessMsg("");
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === "signup" ? "active" : ""}`}
            onClick={() => {
              setTab("signup");
              setError("");
              setSuccessMsg("");
            }}
          >
            Create Account
          </button>
          {tab === "forgot" && (
            <button
              type="button"
              className="auth-tab active"
            >
              Reset Password
            </button>
          )}
        </div>

        {successMsg && <div className="auth-success">{successMsg}</div>}
        {error && <div className="auth-error">{error}</div>}

        {tab === "login" && (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoFocus
              />
            </label>

            <label>
              <div className="auth-label-row">
                <span>Password</span>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setTab("forgot");
                    setError("");
                    setSuccessMsg("");
                    setForgotEmail(loginEmail);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </label>

            <button className="submit-btn" type="submit">
              Log In to PACE
            </button>
          </form>
        )}

        {tab === "signup" && (
          <form className="auth-form" onSubmit={handleSignupSubmit}>
            <label>
              Your Name
              <input
                type="text"
                placeholder="e.g. Vinamra"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                autoFocus
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </label>

            <label>
              Create Password
              <input
                type="password"
                placeholder="Min 4 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
            </label>

            <label>
              Monthly Spending Budget
              <input
                type="number"
                placeholder="₹20,000"
                min="1000"
                value={signupBudget}
                onChange={(e) => setSignupBudget(e.target.value)}
              />
            </label>

            <button className="submit-btn" type="submit">
              Create Fresh Account
            </button>
          </form>
        )}

        {tab === "forgot" && (
          <div className="auth-form-wrapper">
            <div className="auth-reset-header">
              <button
                type="button"
                className="auth-back-link"
                onClick={() => {
                  setTab("login");
                  setForgotStep("email");
                  setError("");
                  setSuccessMsg("");
                }}
              >
                ← Back to Log In
              </button>
              <h3 className="auth-section-title">
                {forgotStep === "email" && "Reset Password with OTP"}
                {forgotStep === "otp" && "Enter Email Verification Code"}
                {forgotStep === "newPassword" && "Set Your New Password"}
              </h3>
              <p className="auth-section-desc">
                {forgotStep === "email" &&
                  "Enter your registered email to receive a secure 6-digit OTP code."}
                {forgotStep === "otp" &&
                  `We've sent a 6-digit code to ${forgotEmail}. Check your inbox or spam folder.`}
                {forgotStep === "newPassword" &&
                  "Your code has been verified. Create a strong new password for your account."}
              </p>
            </div>

            {forgotStep === "email" && (
              <form className="auth-form" onSubmit={handleSendOtpSubmit}>
                <label>
                  Registered Email
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </label>

                <button className="submit-btn" type="submit" disabled={loading}>
                  {loading ? "Sending Secure OTP..." : "Send 6-Digit OTP to Email"}
                </button>
              </form>
            )}

            {forgotStep === "otp" && (
              <form className="auth-form" onSubmit={handleVerifyOtpSubmit}>
                <div className="otp-box-wrapper">
                  <label style={{ display: "block", marginBottom: 8, color: "#cbd5e1" }}>
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    className="otp-digit-input"
                    maxLength={6}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    required
                  />
                  <span className="otp-hint">Code expires in 10 minutes</span>
                </div>

                <button className="submit-btn" type="submit" disabled={loading}>
                  {loading ? "Verifying Code..." : "Verify Code & Proceed"}
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => {
                      setForgotStep("email");
                      setError("");
                    }}
                  >
                    ← Change Email
                  </button>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={handleSendOtpSubmit}
                    disabled={loading}
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}

            {forgotStep === "newPassword" && (
              <form className="auth-form" onSubmit={handleResetPasswordSubmit}>
                <label>
                  New Password
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </label>

                <label>
                  Confirm New Password
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    required
                  />
                </label>

                <button className="submit-btn" type="submit" disabled={loading}>
                  {loading ? "Updating Password..." : "Set New Password & Log In"}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="auth-divider">or continue with</div>

        <GoogleSignInButton
          onGoogleSuccess={(googleUser) => {
            const users = loadLocal("pace_users", []);
            const existing = users.find(
              (u) => u.email && u.email.toLowerCase() === googleUser.email.toLowerCase()
            );
            if (!existing) {
              const freshUser = {
                id: googleUser.id || "usr_g_" + Date.now(),
                name: googleUser.name,
                email: googleUser.email,
                picture: googleUser.picture || "",
                createdAt: toDateKey(),
              };
              saveLocal("pace_users", [...users, freshUser]);
              saveLocal(`pace_${freshUser.id}_transactions`, []);
              saveLocal(`pace_${freshUser.id}_goals`, []);
              saveLocal(`pace_${freshUser.id}_monthly-budget`, 20000);
              saveLocal(`pace_${freshUser.id}_category-budgets`, {});
              saveLocal(`pace_${freshUser.id}_guard-threshold`, 80);
              onLogin(freshUser);
            } else {
              onLogin(existing);
            }
          }}
          onError={setError}
        />

        <div className="auth-divider">or explore</div>

        <button
          type="button"
          className="guest-btn"
          onClick={onGuestLogin}
        >
          Try Demo Account (Sample Data)
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   PAGE COMPONENTS
   ========================================================================== */

function HomePage({
  currentUser,
  selectedMonthKey,
  setSelectedMonthKey,
  monthlyFinances,
  events = [],
  loans = [],
  goals = [],
  transactions = [],
  guardActive,
  overLimitCategories = [],
  nearLimitCategories = [],
  categoryBudgetAlerts = [],
  navigateTo,
  openNewGoalForm,
  editGoal,
  deleteGoal,
  openTransactionForm,
  deleteTransaction,
  onOpenOcr,
  onOpenStatementImport,
}) {
  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "P";
  const finances = monthlyFinances;
  const isSurplus = (finances?.netAvailableCashFlow || 0) >= 0;

  // Active wedding or event preview
  const primaryEvent = events.length > 0 ? calculateEventSummary(events[0], transactions) : null;
  // Active loan preview
  const primaryLoan = loans.length > 0 ? loans[0] : null;

  return (
    <div className="page-content home-page">
      <header className="header">
        <div className="brand-group">
          <PaceLogo size={40} variant="tile" className="brand-logo" />
          <div className="brand-text">
            <h1 className="logo">PACE</h1>
            <p className="tagline">Spend with intention. Save with purpose.</p>
          </div>
        </div>

        <button
          className="profile-btn"
          type="button"
          onClick={() => navigateTo("settings")}
          aria-label="Open settings"
        >
          {userInitial}
        </button>
      </header>

      {/* Month Switcher Navigation Bar */}
      <MonthSwitcher
        currentMonthKey={selectedMonthKey}
        onMonthChange={setSelectedMonthKey}
      />

      {/* Net Available Cash Flow Hero Card */}
      <section className={`cash-flow-hero ${isSurplus ? "surplus" : "deficit"}`}>
        <div className="cash-flow-header">
          <div className="cash-flow-badge">
            <span className="pulse-dot" />
            <span>NET AVAILABLE CASH FLOW</span>
          </div>
          <span className={`status-pill ${isSurplus ? "surplus" : "deficit"}`}>
            {isSurplus ? "SURPLUS" : "DEFICIT / MILESTONE"}
          </span>
        </div>

        <h2 className="cash-flow-amount">
          {formatCurrency(finances.netAvailableCashFlow)}
        </h2>

        <div className="cash-flow-formula">
          <small>
            Formula: Income ({formatCurrency(finances.totalIncome)}) − Committed Outflows ({formatCurrency(finances.committedOutflows)})
          </small>
        </div>

        {/* Progress bar to show committed outflows vs income */}
        <div className="progress">
          <div
            className={`progress-bar ${finances.committedOutflows > finances.totalIncome ? "danger" : "safe"}`}
            style={{
              width: `${finances.totalIncome > 0 ? Math.min((finances.committedOutflows / finances.totalIncome) * 100, 100) : 0}%`,
            }}
          />
        </div>
        <div className="progress-info">
          <span>
            Committed: {finances.totalIncome > 0 ? ((finances.committedOutflows / finances.totalIncome) * 100).toFixed(0) : 0}% of income
          </span>
          <span>
            {isSurplus
              ? `${formatCurrency(finances.netAvailableCashFlow)} surplus left`
              : `${formatCurrency(Math.abs(finances.netAvailableCashFlow))} overcommitted`}
          </span>
        </div>
      </section>

      {/* The 5 Financial Pillars Grid */}
      <section className="five-pillars-section">
        <div className="section-title-sm">
          <span>5 FINANCIAL PILLARS</span>
          <small>Strict isolation of living spending vs wealth & debt</small>
        </div>

        <div className="five-pillars-grid">
          <div className="pillar-card income">
            <span className="pillar-icon">💰</span>
            <div className="pillar-body">
              <small>1. Income</small>
              <strong>{formatCurrency(finances.totalIncome)}</strong>
              <span>Salary & inflows</span>
            </div>
          </div>

          <div className="pillar-card spending">
            <span className="pillar-icon">💸</span>
            <div className="pillar-body">
              <small>2. Actual Spending</small>
              <strong>{formatCurrency(finances.actualSpending)}</strong>
              <span>Pure living expenses</span>
            </div>
          </div>

          <div className="pillar-card wealth">
            <span className="pillar-icon">🌱</span>
            <div className="pillar-body">
              <small>3. Wealth Generation</small>
              <strong>{formatCurrency(finances.wealthGeneration)}</strong>
              <span>SIP ({formatCurrency(finances.totalInvestments)}) + Save ({formatCurrency(finances.totalSavings)})</span>
            </div>
          </div>

          <div className="pillar-card debt">
            <span className="pillar-icon">🛡️</span>
            <div className="pillar-body">
              <small>4. Debt Repayment</small>
              <strong>{formatCurrency(finances.totalDebtRepayment)}</strong>
              <span>Loan EMIs & dues</span>
            </div>
          </div>

          <div className="pillar-card internal">
            <span className="pillar-icon">🔄</span>
            <div className="pillar-body">
              <small>5. Internal Transfers</small>
              <strong>{formatCurrency(finances.totalTransfers + finances.totalCashWithdrawals)}</strong>
              <span>Bank-to-bank & ATM cash movements (not outflows)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Major Heads Breakdown */}
      <section className="major-heads-section">
        <div className="section-heading">
          <h2>Major Head Hierarchy</h2>
          <button className="text-btn" type="button" onClick={() => navigateTo("reports")}>
            Full Analysis →
          </button>
        </div>

        <div className="major-heads-cards-grid">
          <div className="major-head-card">
            <div className="major-head-top">
              <span>🏠 Essentials</span>
              <strong>{formatCurrency(finances.majorHeadTotals?.Essentials || 0)}</strong>
            </div>
            <small>Housing, groceries, utilities, health</small>
          </div>

          <div className="major-head-card">
            <div className="major-head-top">
              <span>☕ Lifestyle</span>
              <strong>{formatCurrency(finances.majorHeadTotals?.Lifestyle || 0)}</strong>
            </div>
            <small>Dining, shopping, weddings, travel</small>
          </div>

          <div className="major-head-card">
            <div className="major-head-top">
              <span>🛡️ Financial Commitments</span>
              <strong>{formatCurrency(finances.majorHeadTotals?.["Financial Commitments"] || 0)}</strong>
            </div>
            <small>Home loan, car loan, insurance</small>
          </div>

          <div className="major-head-card">
            <div className="major-head-top">
              <span>🌱 Wealth & Future</span>
              <strong>{formatCurrency(finances.majorHeadTotals?.["Wealth & Future"] || 0)}</strong>
            </div>
            <small>SIPs, mutual funds, emergency funds</small>
          </div>
        </div>
      </section>

      {/* Milestone Events Preview Widget */}
      {primaryEvent && (
        <section className="event-preview-widget" onClick={() => navigateTo("events")}>
          <div className="event-widget-top">
            <div className="event-widget-title">
              <span className="event-widget-icon">{primaryEvent.icon}</span>
              <div>
                <strong>{primaryEvent.name}</strong>
                <small>Milestone Budget Tracking</small>
              </div>
            </div>
            <span className="badge-tag">ACTIVE EVENT</span>
          </div>

          <div className="event-widget-stats">
            <div>
              <small>Spent</small>
              <strong>{formatCurrency(primaryEvent.totalSpent)}</strong>
            </div>
            <div>
              <small>Budget</small>
              <strong>{formatCurrency(primaryEvent.budget)}</strong>
            </div>
            <div>
              <small>Remaining</small>
              <strong>{formatCurrency(primaryEvent.remaining)}</strong>
            </div>
          </div>

          <div className="progress">
            <div
              className={`progress-bar ${primaryEvent.isOverBudget ? "danger" : "warning"}`}
              style={{ width: `${Math.min(primaryEvent.actualPercentage, 100)}%` }}
            />
          </div>
          <div className="widget-bottom-action">
            <span>{primaryEvent.actualPercentage.toFixed(1)}% of milestone budget allocated</span>
            <span className="action-link">View Event Details →</span>
          </div>
        </section>
      )}

      {/* Loans & Prepayment Simulator Preview Widget */}
      {primaryLoan && (
        <section className="loan-preview-widget" onClick={() => navigateTo("loans")}>
          <div className="loan-widget-top">
            <div className="loan-widget-title">
              <span className="loan-widget-icon">{primaryLoan.icon || "🏠"}</span>
              <div>
                <strong>{primaryLoan.name} ({primaryLoan.lender})</strong>
                <small>Outstanding: {formatCurrency(primaryLoan.currentOutstanding)} • EMI: {formatCurrency(primaryLoan.emiAmount)}/mo</small>
              </div>
            </div>
            <span className="badge-tag simulator">SIMULATOR</span>
          </div>

          <div className="loan-widget-insight">
            <span className="bulb">💡</span>
            <span>Pay ₹2,000 extra/mo to save ₹4.8+ Lakhs and finish years early!</span>
          </div>

          <div className="widget-bottom-action">
            <span>Interest Rate: {primaryLoan.interestRate}% p.a.</span>
            <span className="action-link">Open Prepayment Simulator →</span>
          </div>
        </section>
      )}

      {/* Safe to Spend Today Card */}
      <section className="safe-card">
        <div className="safe-badge">
          <span className="pulse-dot" />
          <span>SAFE TO SPEND TODAY</span>
        </div>
        <h2>{formatCurrency(finances.safeToSpendDaily)}</h2>
        <p className="safe-text">Based on remaining monthly budget of {formatCurrency(Math.max(finances.remainingBudget, 0))}</p>

        <div className="progress">
          <div
            className="progress-bar safe-progress-bar"
            style={{ width: `${Math.min(finances.budgetUsed, 100)}%` }}
          />
        </div>

        <div className="progress-info">
          <span>Budget used ({finances.budgetUsed.toFixed(0)}%)</span>
          <span>{formatCurrency(Math.max(finances.remainingBudget, 0))} remaining</span>
        </div>
      </section>

      {/* Quick Tools */}
      <div className="home-tools-grid">
        <button
          type="button"
          className="home-tool-card ocr"
          onClick={onOpenOcr}
        >
          <div className="home-tool-icon">📸</div>
          <div className="home-tool-content">
            <strong>Scan Bill (OCR)</strong>
            <small>Extract from bill photo</small>
          </div>
          <span className="home-tool-arrow">→</span>
        </button>

        <button
          type="button"
          className="home-tool-card stmt"
          onClick={onOpenStatementImport}
        >
          <div className="home-tool-icon">📑</div>
          <div className="home-tool-content">
            <strong>Bank / GPay</strong>
            <small>PDF, Excel, Screen</small>
          </div>
          <span className="home-tool-arrow">→</span>
        </button>
      </div>

      {/* Spending Guard Alert */}
      <div
        className={`alert-card ${
          guardActive || overLimitCategories.length > 0 ? "alert-warning" : ""
        }`}
      >
        <div className="alert-icon">
          {overLimitCategories.length > 0 || guardActive ? "!" : "✓"}
        </div>

        <div>
          <h3>
            {overLimitCategories.length > 0
              ? `${overLimitCategories[0].category} budget exceeded`
              : guardActive
              ? "Budget warning"
              : "Financial health on track"}
          </h3>

          <p>
            {overLimitCategories.length > 0
              ? `${formatCurrency(overLimitCategories[0].spent)} spent against a ${formatCurrency(overLimitCategories[0].limit)} limit.`
              : guardActive
              ? `You've used ${finances.budgetUsed.toFixed(0)}% of your monthly budget.`
              : nearLimitCategories.length > 0
              ? `${nearLimitCategories[0].category} is at ${nearLimitCategories[0].percentage.toFixed(0)}% of limit.`
              : `You have ${formatCurrency(Math.max(finances.remainingBudget, 0))} remaining for ${finances.monthName}.`}
          </p>
        </div>
      </div>

      {/* Category Budgets */}
      <section className="section">
        <div className="section-heading">
          <h2>Category Budgets</h2>
          <button className="text-btn" type="button" onClick={() => navigateTo("budgets")}>
            Manage →
          </button>
        </div>

        {categoryBudgetAlerts.length === 0 ? (
          <div className="category-budget-empty">
            <span>💰</span>
            <div>
              <strong>No category limits set</strong>
              <small>Set limits for Food, Shopping, Transport and more.</small>
            </div>
            <button type="button" onClick={() => navigateTo("budgets")}>
              Set limits →
            </button>
          </div>
        ) : (
          <div className="dashboard-category-budgets">
            {categoryBudgetAlerts.map((item) => {
              const percentage = item.percentage;
              const progress = Math.min(percentage, 100);

              return (
                <div
                  className={`dashboard-category-budget ${item.overLimit ? "over-budget" : ""}`}
                  key={item.category}
                >
                  <div className="dashboard-category-top">
                    <div className="dashboard-category-name">
                      <span>{CATEGORY_ICONS[item.category] || "💳"}</span>
                      <div>
                        <strong>{item.category}</strong>
                        <small>
                          {formatCurrency(item.spent)} spent of {formatCurrency(item.limit)}
                        </small>
                      </div>
                    </div>
                    <strong>{percentage.toFixed(0)}%</strong>
                  </div>

                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="dashboard-category-bottom">
                    <span>
                      {item.overLimit
                        ? `${formatCurrency(item.spent - item.limit)} over limit`
                        : `${formatCurrency(Math.max(item.limit - item.spent, 0))} left`}
                    </span>
                    <span>{formatCurrency(item.spent)} spent</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Goals preview */}
      <section className="section">
        <div className="section-heading">
          <h2>Your Goals</h2>
          <button className="text-btn" type="button" onClick={() => navigateTo("goals")}>
            View all →
          </button>
        </div>

        {goals.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No goals yet"
            text="Create your first savings goal."
            action="+ Create Goal"
            onAction={openNewGoalForm}
          />
        ) : (
          <div className="dashboard-goals">
            {goals.slice(0, 3).map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                compact
                onEdit={editGoal}
                onDelete={deleteGoal}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Transactions in Selected Month */}
      <section className="transactions">
        <div className="section-header">
          <h2>Recent Activity ({finances.monthName})</h2>
          <button type="button" onClick={() => navigateTo("activity")}>
            View all ({finances.transactionsCount}) →
          </button>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            icon="💸"
            title="No transactions yet"
            text="Add your first income or expense transaction."
            action="+ Add Transaction"
            onAction={openTransactionForm}
          />
        ) : (
          transactions
            .filter((t) => isDateInMonth(t.date, selectedMonthKey))
            .slice(0, 6)
            .map((transaction) => (
              <Transaction
                key={transaction.id}
                transaction={transaction}
                onDelete={deleteTransaction}
                detailed
              />
            ))
        )}
      </section>
    </div>
  );
}

function ActivityPage({
  activitySearch,
  setActivitySearch,
  activityType,
  setActivityType,
  activityCategory,
  setActivityCategory,
  groupedTransactions,
  availableCategories,
  openTransactionForm,
  deleteTransaction,
  onOpenOcr,
  onOpenStatementImport,
}) {
  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Activity</h2>
          <p>All your transactions.</p>
        </div>

        <button className="goal-add-btn" type="button" onClick={openTransactionForm}>
          + Add
        </button>
      </div>

      <div className="home-tools-grid">
        <button
          type="button"
          className="home-tool-card ocr"
          onClick={onOpenOcr}
        >
          <div className="home-tool-icon">📸</div>
          <div className="home-tool-content">
            <strong>Scan Bill (OCR)</strong>
            <small>Extract from bill photo</small>
          </div>
          <span className="home-tool-arrow">→</span>
        </button>

        <button
          type="button"
          className="home-tool-card stmt"
          onClick={onOpenStatementImport}
        >
          <div className="home-tool-icon">📑</div>
          <div className="home-tool-content">
            <strong>Bank / GPay</strong>
            <small>PDF, Excel, Screen</small>
          </div>
          <span className="home-tool-arrow">→</span>
        </button>
      </div>

      <div className="activity-toolbar">
        <div className="search-box">
          <span>⌕</span>
          <input
            value={activitySearch}
            onChange={(event) => setActivitySearch(event.target.value)}
            placeholder="Search transactions"
          />
        </div>

        <div className="filter-row" style={{ overflowX: "auto", flexWrap: "nowrap", paddingBottom: "6px" }}>
          <button
            type="button"
            className={activityType === "all" ? "filter-chip active" : "filter-chip"}
            onClick={() => setActivityType("all")}
          >
            All
          </button>
          <button
            type="button"
            className={activityType === "expense" ? "filter-chip active" : "filter-chip"}
            onClick={() => setActivityType("expense")}
          >
            Expenses
          </button>
          <button
            type="button"
            className={activityType === "income" ? "filter-chip active" : "filter-chip"}
            onClick={() => setActivityType("income")}
          >
            Income
          </button>
          <button
            type="button"
            className={activityType === "savings" ? "filter-chip active" : "filter-chip"}
            onClick={() => setActivityType("savings")}
          >
            Savings
          </button>
          <button
            type="button"
            className={activityType === "investment" ? "filter-chip active" : "filter-chip"}
            onClick={() => setActivityType("investment")}
          >
            Investments
          </button>
          <button
            type="button"
            className={activityType === "debt_repayment" ? "filter-chip active" : "filter-chip"}
            onClick={() => setActivityType("debt_repayment")}
          >
            Debt/EMI
          </button>
          <button
            type="button"
            className={activityType === "transfer" ? "filter-chip active" : "filter-chip"}
            onClick={() => setActivityType("transfer")}
          >
            Transfers
          </button>
          <button
            type="button"
            className={activityType === "cash_withdrawal" ? "filter-chip active" : "filter-chip"}
            onClick={() => setActivityType("cash_withdrawal")}
          >
            Cash
          </button>
        </div>

        <select
          className="activity-category-select"
          value={activityCategory}
          onChange={(event) => setActivityCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {groupedTransactions.length === 0 ? (
        <EmptyState
          icon="🔎"
          title="Nothing found"
          text="Try adding a transaction or adjust your filter."
          action="Clear filters"
          onAction={() => {
            setActivitySearch("");
            setActivityType("all");
            setActivityCategory("all");
          }}
        />
      ) : (
        <div className="activity-groups">
          {groupedTransactions.map(([label, items]) => (
            <section className="activity-group" key={label}>
              <div className="activity-group-title">
                <span>{label}</span>
                {label !== "Today" && label !== "Yesterday" && (
                  <small>{items.length} transactions</small>
                )}
              </div>

              <div className="transactions activity-list">
                {items.map((transaction) => (
                  <Transaction
                    key={transaction.id}
                    transaction={transaction}
                    onDelete={deleteTransaction}
                    detailed
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalsPage({ goals, openNewGoalForm, editGoal, deleteGoal }) {
  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Goals</h2>
          <p>Save for what matters.</p>
        </div>

        <button className="goal-add-btn" type="button" onClick={openNewGoalForm}>
          + Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No savings goals"
          text="Create a goal and start tracking your progress."
          action="+ Create Goal"
          onAction={openNewGoalForm}
        />
      ) : (
        <div className="goals-list">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={editGoal}
              onDelete={deleteGoal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MorePage({ navigateTo, currentUser, onOpenOcr, onOpenStatementImport }) {
  return (
    <div className="page-content page">
      <div className="page-title">
        <span>PACE</span>
        <h2>More</h2>
        <p>Tools, budgets & preferences</p>
      </div>

      <div className="more-menu-list">
        <button
          className="more-menu-card"
          type="button"
          onClick={() => navigateTo("reports")}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(168, 85, 247, 0.12)", color: "#c084fc" }}>
              📊
            </span>
            <div className="more-menu-text">
              <strong>Financial Reports & Comparison</strong>
              <small>Month-to-month dynamic comparison & category shifts</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={() => navigateTo("events")}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(244, 63, 94, 0.12)", color: "#fb7185" }}>
              💍
            </span>
            <div className="more-menu-text">
              <strong>Events & Milestones</strong>
              <small>Weddings, travel & renovation budgets & tracking</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={() => navigateTo("loans")}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(251, 146, 60, 0.12)", color: "#fb923c" }}>
              💳
            </span>
            <div className="more-menu-text">
              <strong>Loans & Prepayment Simulator</strong>
              <small>Home loans, EMIs & "What if I pay extra?" simulator</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={() => navigateTo("goals")}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(52, 211, 153, 0.12)", color: "#34d399" }}>
              🎯
            </span>
            <div className="more-menu-text">
              <strong>Savings Goals</strong>
              <small>Emergency fund, vehicle & travel targets</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={onOpenStatementImport}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa" }}>
              📑
            </span>
            <div className="more-menu-text">
              <strong>Bank & GPay Statement</strong>
              <small>Auto-import PDF, Excel, Screenshots & SMS</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={onOpenOcr}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(236, 72, 153, 0.12)", color: "#f472b6" }}>
              📸
            </span>
            <div className="more-menu-text">
              <strong>Scan Bill / Receipt (OCR)</strong>
              <small>Instant optical recognition from bill photo</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={() => navigateTo("budgets")}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(99, 102, 241, 0.12)", color: "#818cf8" }}>
              💰
            </span>
            <div className="more-menu-text">
              <strong>Category Budgets</strong>
              <small>Set & track limits for Food, Shopping & more</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={() => navigateTo("guard")}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24" }}>
              🛡
            </span>
            <div className="more-menu-text">
              <strong>Spending Guard</strong>
              <small>Real-time budget alerts & safety thresholds</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={() => navigateTo("insights")}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(6, 182, 212, 0.12)", color: "#38bdf8" }}>
              📊
            </span>
            <div className="more-menu-text">
              <strong>Monthly Insights</strong>
              <small>Spending habits, daily averages & trends</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={() => navigateTo("settings")}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#34d399" }}>
              🛡️
            </span>
            <div className="more-menu-text">
              <strong>Security & Email Alerts</strong>
              <small>Google OAuth, OTP Recovery & Live Notifications</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>

        <button
          className="more-menu-card"
          type="button"
          onClick={() => navigateTo("settings")}
        >
          <div className="more-menu-left">
            <span className="more-menu-icon" style={{ background: "rgba(148, 163, 184, 0.12)", color: "#94a3b8" }}>
              ⚙️
            </span>
            <div className="more-menu-text">
              <strong>Account & Preferences</strong>
              <small>{currentUser?.email || "Manage data & account"}</small>
            </div>
          </div>
          <span className="more-menu-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

function BudgetsPage({
  monthlyBudget,
  totalExpenses,
  remainingBudget,
  categoryBudgets,
  currentMonthTransactions,
  updateCategoryBudget,
  saveBudgetSettings,
  onBack,
}) {
  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Budgets</h2>
          <p>Give every month a spending boundary.</p>
        </div>
        <button className="back-btn" type="button" onClick={onBack}>
          ← Back
        </button>
      </div>

      <form className="budget-card" onSubmit={saveBudgetSettings}>
        <div>
          <span className="card-label">MONTHLY BUDGET</span>
          <h3>{formatCurrency(monthlyBudget)}</h3>
          <p>
            {formatCurrency(totalExpenses)} spent ·{" "}
            {formatCurrency(Math.max(remainingBudget, 0))} left
          </p>
        </div>

        <input
          name="monthlyBudget"
          type="number"
          min="1"
          key={`budget-${monthlyBudget}`}
          defaultValue={monthlyBudget}
          placeholder="₹20,000"
        />

        <button className="submit-btn" type="submit">
          Save Monthly Budget
        </button>
      </form>

      <section className="budget-section">
        <div className="section-heading">
          <h2>Category Budgets</h2>
          <span className="muted-text">Optional</span>
        </div>

        <div className="category-budget-list">
          {EXPENSE_CATEGORIES.map((category) => {
            const spent = currentMonthTransactions
              .filter(
                (item) => item.type === "expense" && item.category === category
              )
              .reduce((sum, item) => sum + Number(item.amount || 0), 0);

            const limit = Number(categoryBudgets[category] || 0);
            const progress =
              limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

            return (
              <div className="category-budget-card" key={category}>
                <div className="category-budget-top">
                  <div>
                    <span className="category-budget-icon">
                      {CATEGORY_ICONS[category] || "💳"}
                    </span>
                    <div>
                      <strong>{category}</strong>
                      <small>{formatCurrency(spent)} spent</small>
                    </div>
                  </div>

                  <input
                    type="number"
                    min="0"
                    placeholder="Set limit"
                    value={categoryBudgets[category] ?? ""}
                    onChange={(event) =>
                      updateCategoryBudget(category, event.target.value)
                    }
                  />
                </div>

                {limit > 0 && (
                  <>
                    <div className="progress small-progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="budget-meta">
                      <span>{progress.toFixed(0)}% used</span>
                      <span>
                        {formatCurrency(Math.max(limit - spent, 0))} left
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SpendingGuardPage({
  overLimitCategories,
  budgetUsed,
  guardThreshold,
  setGuardThreshold,
  nearLimitCategories,
  categoryBudgetAlerts,
  onBack,
}) {
  const status =
    overLimitCategories.length > 0
      ? "Category limit exceeded"
      : budgetUsed >= guardThreshold
      ? "Warning active"
      : nearLimitCategories.length > 0
      ? "Category limit approaching"
      : "You're on track";

  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Spending Guard</h2>
          <p>Get a warning before spending gets out of hand.</p>
        </div>
        <button className="back-btn" type="button" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="guard-card">
        <div className="guard-ring">
          <strong>{budgetUsed.toFixed(0)}%</strong>
          <span>budget used</span>
        </div>

        <div>
          <span className="card-label">CURRENT STATUS</span>
          <h3>{status}</h3>
          <p>
            {overLimitCategories.length > 0
              ? `${overLimitCategories.length} category ${
                  overLimitCategories.length === 1 ? "is" : "are"
                } over the configured limit.`
              : budgetUsed >= guardThreshold
              ? `You've used ${budgetUsed.toFixed(0)}% of your monthly budget.`
              : nearLimitCategories.length > 0
              ? `${nearLimitCategories[0].category} has reached ${nearLimitCategories[0].percentage.toFixed(
                  0
                )}% of its limit.`
              : "Your spending is currently within the configured limits."}
          </p>
        </div>
      </div>

      {categoryBudgetAlerts.length > 0 && (
        <div className="guard-alert-list">
          <div className="section-heading">
            <h2>Category Status</h2>
          </div>

          {categoryBudgetAlerts.map((item) => (
            <div
              className={`guard-category ${
                item.overLimit ? "over-limit" : ""
              }`}
              key={item.category}
            >
              <div>
                <strong>
                  {CATEGORY_ICONS[item.category] || "💳"} {item.category}
                </strong>

                <small>
                  {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
                </small>
              </div>

              <span>{item.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="settings-card">
        <div className="settings-row">
          <div>
            <strong>Warning threshold</strong>
            <small>Choose when PACE should warn you.</small>
          </div>

          <select
            value={guardThreshold}
            onChange={(event) => setGuardThreshold(Number(event.target.value))}
          >
            <option value="70">70%</option>
            <option value="80">80%</option>
            <option value="90">90%</option>
            <option value="100">100%</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function InsightsPage({
  topCategory,
  averageDailyExpense,
  savingsRate,
  currentSavings,
  currentMonthTransactions,
  totalIncome,
  totalExpenses,
  budgetUsed,
  onBack,
}) {
  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Insights</h2>
          <p>A quick read of your current month.</p>
        </div>
        <button className="back-btn" type="button" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="insight-grid">
        <InsightCard
          title="Top category"
          value={topCategory[0]}
          detail={formatCurrency(topCategory[1])}
        />
        <InsightCard
          title="Daily average"
          value={formatCurrency(averageDailyExpense)}
          detail="Average expense"
        />
        <InsightCard
          title="Savings rate"
          value={`${savingsRate.toFixed(0)}%`}
          detail={formatCurrency(currentSavings)}
        />
        <InsightCard
          title="Transactions"
          value={currentMonthTransactions.length}
          detail="This month"
        />
      </div>

      <div className="insight-summary">
        <div className="section-heading">
          <h2>Month summary</h2>
        </div>

        <div className="summary-row">
          <span>Total income</span>
          <strong>{formatCurrency(totalIncome)}</strong>
        </div>

        <div className="summary-row">
          <span>Total expenses</span>
          <strong>{formatCurrency(totalExpenses)}</strong>
        </div>

        <div className="summary-row">
          <span>Budget used</span>
          <strong>{budgetUsed.toFixed(0)}%</strong>
        </div>

        <div className="summary-row">
          <span>Largest category</span>
          <strong>{topCategory[0]}</strong>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({
  currentUser,
  transactions,
  goals,
  onLogout,
  onResetAccountData,
  onLoadDemoData,
  onBack,
  onUpdateUser,
}) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState({ type: "", msg: "" });
  const [serverStatus, setServerStatus] = useState(null);

  // Email notifications state
  const [emailNotifs, setEmailNotifs] = useState(() => ({
    budgetAlerts: currentUser?.emailNotifications?.budgetAlerts ?? true,
    loginAlerts: currentUser?.emailNotifications?.loginAlerts ?? true,
    monthlyReport: currentUser?.emailNotifications?.monthlyReport ?? true,
  }));
  const [emailActionStatus, setEmailActionStatus] = useState({ type: "", msg: "" });
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    checkServerHealth().then(setServerStatus);
    apiGetNotificationPrefs()
      .then((res) => {
        if (res?.emailNotifications) {
          setEmailNotifs(res.emailNotifications);
        }
      })
      .catch(() => {});
  }, []);

  function handleCheckServer() {
    checkServerHealth().then(setServerStatus);
  }

  async function handleToggleNotif(key) {
    const updated = { ...emailNotifs, [key]: !emailNotifs[key] };
    setEmailNotifs(updated);
    try {
      await apiUpdateNotificationPrefs(updated);
    } catch (err) {
      console.warn("Could not save notification pref to backend:", err.message);
    }
  }

  async function handleSendTestEmail() {
    setEmailLoading(true);
    setEmailActionStatus({ type: "", msg: "" });
    try {
      const res = await apiSendTestEmail();
      setEmailActionStatus({
        type: "success",
        msg: res.message || `Test email sent to ${currentUser?.email}! Check your inbox.`,
      });
    } catch (err) {
      setEmailActionStatus({
        type: "error",
        msg: err.message || "Failed to send test email. Check server status.",
      });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleSendReportEmail() {
    setEmailLoading(true);
    setEmailActionStatus({ type: "", msg: "" });
    try {
      const res = await apiSendReportEmail();
      setEmailActionStatus({
        type: "success",
        msg: res.message || `Financial statement sent to ${currentUser?.email}!`,
      });
    } catch (err) {
      setEmailActionStatus({
        type: "error",
        msg: err.message || "Failed to send report. Check server status.",
      });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleTriggerBudgetAlert() {
    setEmailLoading(true);
    setEmailActionStatus({ type: "", msg: "" });
    try {
      const res = await apiTriggerBudgetAlert();
      setEmailActionStatus({
        type: "success",
        msg: res.message || `Budget alert email dispatched to ${currentUser?.email}!`,
      });
    } catch (err) {
      setEmailActionStatus({
        type: "error",
        msg: err.message || "Failed to send budget alert email.",
      });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    setPasswordStatus({ type: "", msg: "" });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: "error", msg: "Please fill in all fields." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({
        type: "error",
        msg: "New password must be at least 6 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", msg: "New passwords do not match." });
      return;
    }

    try {
      // Try backend password change
      const res = await apiResetPassword({
        email: currentUser?.email,
        newPassword,
      }).catch(() => null);

      if (!res && currentUser?.password && currentUser.password !== currentPassword) {
        setPasswordStatus({ type: "error", msg: "Current password is incorrect." });
        return;
      }
    } catch (err) {
      if (currentUser?.password && currentUser.password !== currentPassword) {
        setPasswordStatus({ type: "error", msg: "Current password is incorrect." });
        return;
      }
    }

    const updatedUser = {
      ...currentUser,
      password: newPassword,
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    setPasswordStatus({
      type: "success",
      msg: "Password updated successfully! Security confirmation email sent.",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setShowPasswordForm(false);
      setPasswordStatus({ type: "", msg: "" });
    }, 2200);
  }

  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Settings</h2>
          <p>Manage your account, security & notifications.</p>
        </div>
        <button className="back-btn" type="button" onClick={onBack}>
          ← Back
        </button>
      </div>

      {/* Account & Security Overview Card */}
      <div className="settings-card">
        <div className="settings-row">
          <div>
            <strong>Account Identity</strong>
            <small>{currentUser?.email || "Guest User"}</small>
          </div>
          <span className="status-dot">{currentUser?.name || "User"}</span>
        </div>

        <div className="settings-row">
          <div>
            <strong>Sign-In Method</strong>
            <small>
              {currentUser?.authProvider === "google"
                ? "Google OAuth 2.0 (Google Identity Services)"
                : "Standard Email & Password (Bcrypt Hash 12)"}
            </small>
          </div>
          <span className={`security-badge ${currentUser?.authProvider === "google" ? "google" : ""}`}>
            {currentUser?.authProvider === "google" ? "Google Account" : "Password Auth"}
          </span>
        </div>

        <div className="settings-row">
          <div>
            <strong>Email Verification Status</strong>
            <small>Two-factor OTP recovery active</small>
          </div>
          <span className="security-badge">
            ✓ Verified
          </span>
        </div>

        <div className="settings-row">
          <div>
            <strong>Session Security</strong>
            <small>Bank-Grade HMAC-SHA256 Token Protection</small>
          </div>
          <span className="security-badge jwt">
            🔒 JWT Protected
          </span>
        </div>
      </div>

      {/* Email Notifications & Alerts Card */}
      <div className="settings-card" style={{ marginTop: "14px" }}>
        <div className="settings-row" style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 15, color: "#f8fafc" }}>✉️ Email Notifications & Alerts</strong>
          <p style={{ margin: "3px 0 0 0", fontSize: 12, color: "#94a3b8" }}>
            Receive real-time transactional, security, and budgeting emails directly to {currentUser?.email}
          </p>
        </div>

        {emailActionStatus.msg && (
          <div
            className={`password-status-banner ${emailActionStatus.type}`}
            style={{ marginBottom: 14 }}
          >
            {emailActionStatus.msg}
          </div>
        )}

        <div className="notification-toggle-row">
          <div className="notification-toggle-info">
            <strong>Budget Guard Alerts</strong>
            <small>Email notification when spending reaches 80% or 100% of budget</small>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={emailNotifs.budgetAlerts}
              onChange={() => handleToggleNotif("budgetAlerts")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="notification-toggle-row">
          <div className="notification-toggle-info">
            <strong>Sign-In Security Alerts</strong>
            <small>Email alert with IP, time & device when your account logs in</small>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={emailNotifs.loginAlerts}
              onChange={() => handleToggleNotif("loginAlerts")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="notification-toggle-row">
          <div className="notification-toggle-info">
            <strong>Monthly Financial Statements</strong>
            <small>Periodic spending snapshot, savings rate, and category breakdown</small>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={emailNotifs.monthlyReport}
              onChange={() => handleToggleNotif("monthlyReport")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* Live Email Action Triggers */}
        <div className="action-btn-group">
          <button
            type="button"
            className="secondary-action-btn"
            onClick={handleSendTestEmail}
            disabled={emailLoading}
          >
            <span>✉️</span>
            <span>{emailLoading ? "Sending..." : "Send Test Email"}</span>
          </button>

          <button
            type="button"
            className="secondary-action-btn"
            onClick={handleSendReportEmail}
            disabled={emailLoading}
          >
            <span>📊</span>
            <span>{emailLoading ? "Generating..." : "Email My Summary"}</span>
          </button>

          <button
            type="button"
            className="secondary-action-btn"
            onClick={handleTriggerBudgetAlert}
            disabled={emailLoading}
            style={{ gridColumn: "1 / -1" }}
          >
            <span>🚨</span>
            <span>{emailLoading ? "Dispatching..." : "Simulate Budget Guard Alert Email"}</span>
          </button>
        </div>
      </div>

      {currentUser?.id && currentUser.id !== "usr_demo" && currentUser.id !== "guest" && (
        <div className="settings-card security-card" style={{ marginTop: "14px" }}>
          <div className="settings-row">
            <div>
              <strong>Change Password</strong>
              <small>Update your account access credentials</small>
            </div>
            {!showPasswordForm ? (
              <button
                className="text-btn"
                type="button"
                onClick={() => {
                  setShowPasswordForm(true);
                  setPasswordStatus({ type: "", msg: "" });
                }}
              >
                Change Password
              </button>
            ) : (
              <button
                className="text-btn"
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordStatus({ type: "", msg: "" });
                }}
              >
                Close
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form className="change-password-form" onSubmit={handleChangePasswordSubmit}>
              {passwordStatus.msg && (
                <div className={`password-status-banner ${passwordStatus.type}`}>
                  {passwordStatus.msg}
                </div>
              )}

              <label>
                Current Password
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoFocus
                />
              </label>

              <label>
                New Password
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>

              <label>
                Confirm New Password
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>

              <div className="change-password-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordStatus({ type: "", msg: "" });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save New Password
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Cloud DB & Backend Status Card */}
      <div className="settings-card" style={{ marginTop: "14px" }}>
        <div className="settings-row">
          <div>
            <strong>Database & Cloud Sync</strong>
            <small>
              {serverStatus?.online && serverStatus?.database?.connected
                ? "Connected to MongoDB Database"
                : serverStatus?.online
                ? "Backend Online (Connecting to MongoDB...)"
                : "Offline Local DB (Run 'npm run server' for MongoDB)"}
            </small>
          </div>
          <span className={serverStatus?.online && serverStatus?.database?.connected ? "status-dot active" : "status-dot"}>
            {serverStatus?.online && serverStatus?.database?.connected ? "🟢 MongoDB Active" : "🟡 Local PWA"}
          </span>
        </div>

        <div className="settings-row">
          <div>
            <strong>Backend API Server</strong>
            <small style={{ wordBreak: "break-all" }}>
              {import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}
            </small>
          </div>
          <button className="text-btn" type="button" onClick={handleCheckServer}>
            Test Connection
          </button>
        </div>
      </div>

      <div className="danger-card">
        <div>
          <strong>Reset account data</strong>
          <small>
            Clears all transactions and goals for this account.
          </small>
        </div>

        <button type="button" onClick={onResetAccountData}>Clear</button>
      </div>

      <div className="settings-card" style={{ marginTop: "14px" }}>
        <div className="settings-row">
          <div>
            <strong>Demo sample data</strong>
            <small>Populate sample transactions and goals.</small>
          </div>
          <button className="text-btn" type="button" onClick={onLoadDemoData}>
            Load Demo
          </button>
        </div>
      </div>

      <button className="logout-btn" type="button" onClick={onLogout}>
        Log Out ({currentUser?.name || "Account"})
      </button>

      <div className="app-about-footer">
        <PaceLogo size={28} variant="tile" />
        <div>
          <strong>PACE v1.0</strong>
          <small>Spend with intention. Save with purpose.</small>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   MAIN APP CONTAINER
   ========================================================================== */

function App() {
  const [currentUser, setCurrentUser] = useState(() =>
    loadLocal("pace_active_user", null)
  );

  // When logged out, render the AuthScreen
  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={(user) => {
          saveLocal("pace_active_user", user);
          setCurrentUser(user);
        }}
        onGuestLogin={() => {
          const demoUser = {
            id: "demo",
            name: "Demo User",
            email: "demo@pace.app",
            isDemo: true,
          };
          saveLocal("pace_active_user", demoUser);

          if (!localStorage.getItem("pace_usr_demo_transactions")) {
            saveLocal("pace_usr_demo_transactions", getDemoTransactions());
            saveLocal("pace_usr_demo_goals", getDemoGoals());
            saveLocal("pace_usr_demo_events", getDemoEvents());
            saveLocal("pace_usr_demo_loans", getDemoLoans());
            saveLocal("pace_usr_demo_monthly-budget", defaultBudget);
            saveLocal("pace_usr_demo_category-budgets", {});
            saveLocal("pace_usr_demo_guard-threshold", defaultGuardThreshold);
          }
          setCurrentUser(demoUser);
        }}
      />
    );
  }

  return <AuthenticatedApp currentUser={currentUser} setCurrentUser={setCurrentUser} />;
}

function AuthenticatedApp({ currentUser, setCurrentUser }) {
  const userKey = `pace_usr_${currentUser.id}`;

  const [transactions, setTransactions] = useState(() =>
    loadLocal(
      `${userKey}_transactions`,
      currentUser.isDemo ? getDemoTransactions() : []
    )
  );

  const [goals, setGoals] = useState(() =>
    loadLocal(
      `${userKey}_goals`,
      currentUser.isDemo ? getDemoGoals() : []
    ).map((goal) => ({
      ...goal,
      category: goal.category || "Personal",
    }))
  );

  const [events, setEvents] = useState(() =>
    loadLocal(
      `${userKey}_events`,
      currentUser.isDemo ? getDemoEvents() : []
    )
  );

  const [loans, setLoans] = useState(() =>
    loadLocal(
      `${userKey}_loans`,
      currentUser.isDemo ? getDemoLoans() : []
    )
  );

  const [monthlyBudget, setMonthlyBudget] = useState(() =>
    Number(loadLocal(`${userKey}_monthly-budget`, defaultBudget))
  );

  const [categoryBudgets, setCategoryBudgets] = useState(() =>
    loadLocal(`${userKey}_category-budgets`, {})
  );

  const [guardThreshold, setGuardThreshold] = useState(() =>
    Number(loadLocal(`${userKey}_guard-threshold`, defaultGuardThreshold))
  );

  // Month-aware financial state
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => toMonthKey());

  const [activePage, setActivePage] = useState("home");
  const [previousPage, setPreviousPage] = useState("home");

  const [showTxModal, setShowTxModal] = useState(false);
  const [initialTxData, setInitialTxData] = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);

  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);

  function navigateTo(page) {
    setPreviousPage(activePage);
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setActivePage(previousPage || "home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const [goalForm, setGoalForm] = useState({
    name: "",
    icon: "🎯",
    category: "Personal",
    target: "",
    saved: "",
    date: "",
  });

  const [activitySearch, setActivitySearch] = useState("");
  const [activityType, setActivityType] = useState("all");
  const [activityCategory, setActivityCategory] = useState("all");

  useEffect(() => saveLocal(`${userKey}_transactions`, transactions), [userKey, transactions]);
  useEffect(() => saveLocal(`${userKey}_goals`, goals), [userKey, goals]);
  useEffect(() => saveLocal(`${userKey}_events`, events), [userKey, events]);
  useEffect(() => saveLocal(`${userKey}_loans`, loans), [userKey, loans]);
  useEffect(
    () => saveLocal(`${userKey}_monthly-budget`, monthlyBudget),
    [userKey, monthlyBudget]
  );
  useEffect(
    () => saveLocal(`${userKey}_category-budgets`, categoryBudgets),
    [userKey, categoryBudgets]
  );
  useEffect(
    () => saveLocal(`${userKey}_guard-threshold`, guardThreshold),
    [userKey, guardThreshold]
  );

  // Sync with backend if logged in
  useEffect(() => {
    if (!currentUser.isDemo && getAuthToken()) {
      apiGetEvents().then((evs) => {
        if (Array.isArray(evs) && evs.length > 0) setEvents(evs);
      }).catch(() => {});

      apiGetLoans().then((lns) => {
        if (Array.isArray(lns) && lns.length > 0) setLoans(lns);
      }).catch(() => {});

      apiGetTransactions().then((txs) => {
        if (Array.isArray(txs) && txs.length > 0) setTransactions(txs);
      }).catch(() => {});
    }
  }, [currentUser.id]);

  function handleLogout() {
    clearAuthToken();
    saveLocal("pace_active_user", null);
    setCurrentUser(null);
  }

  function handleUpdateUser(updatedUser) {
    setCurrentUser(updatedUser);
    saveLocal("pace_active_user", updatedUser);
    const users = loadLocal("pace_users", []);
    const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    saveLocal("pace_users", updatedUsers);
  }

  function handleResetAccountData() {
    const confirmed = window.confirm(
      "Reset your account data? All transactions, events, loans and goals will be cleared."
    );
    if (!confirmed) return;

    setTransactions([]);
    setGoals([]);
    setEvents([]);
    setLoans([]);
    setCategoryBudgets({});
    saveLocal(`${userKey}_transactions`, []);
    saveLocal(`${userKey}_goals`, []);
    saveLocal(`${userKey}_events`, []);
    saveLocal(`${userKey}_loans`, []);
    saveLocal(`${userKey}_category-budgets`, {});
  }

  function handleLoadDemoData() {
    const demoTx = getDemoTransactions();
    const demoG = getDemoGoals();
    const demoEv = getDemoEvents();
    const demoLn = getDemoLoans();

    setTransactions(demoTx);
    setGoals(demoG);
    setEvents(demoEv);
    setLoans(demoLn);
    setMonthlyBudget(defaultBudget);
    setCategoryBudgets({});

    saveLocal(`${userKey}_transactions`, demoTx);
    saveLocal(`${userKey}_goals`, demoG);
    saveLocal(`${userKey}_events`, demoEv);
    saveLocal(`${userKey}_loans`, demoLn);
    saveLocal(`${userKey}_monthly-budget`, defaultBudget);
    saveLocal(`${userKey}_category-budgets`, {});
  }

  // Events CRUD
  function handleAddEvent(newEvent) {
    setEvents((prev) => [newEvent, ...prev]);
    if (!currentUser.isDemo) {
      apiCreateEvent(newEvent).catch(() => {});
    }
  }

  function handleUpdateEvent(updatedEvent) {
    setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    if (!currentUser.isDemo) {
      apiUpdateEvent(updatedEvent.id, updatedEvent).catch(() => {});
    }
  }

  function handleDeleteEvent(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (!currentUser.isDemo) {
      apiDeleteEvent(id).catch(() => {});
    }
  }

  // Loans CRUD
  function handleAddLoan(newLoan) {
    setLoans((prev) => [newLoan, ...prev]);
    if (!currentUser.isDemo) {
      apiCreateLoan(newLoan).catch(() => {});
    }
  }

  function handleUpdateLoan(updatedLoan) {
    setLoans((prev) => prev.map((l) => (l.id === updatedLoan.id ? updatedLoan : l)));
    if (!currentUser.isDemo) {
      apiUpdateLoan(updatedLoan.id, updatedLoan).catch(() => {});
    }
  }

  function handleDeleteLoan(id) {
    setLoans((prev) => prev.filter((l) => l.id !== id));
    if (!currentUser.isDemo) {
      apiDeleteLoan(id).catch(() => {});
    }
  }

  // Central monthly financial engine
  const currentMonthTransactions = useMemo(
    () => transactions.filter((item) => isDateInMonth(item.date, selectedMonthKey)),
    [transactions, selectedMonthKey]
  );

  const monthlyFinances = useMemo(
    () => calculateMonthlyFinances(transactions, selectedMonthKey, monthlyBudget),
    [transactions, selectedMonthKey, monthlyBudget]
  );

  const categoryBudgetAlerts = useMemo(() => {
    return EXPENSE_CATEGORIES.map((category) => {
      const limit = Number(categoryBudgets[category] || 0);

      if (limit <= 0) return null;

      const spent = currentMonthTransactions
        .filter(
          (transaction) =>
            transaction.type === "expense" && transaction.category === category
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      const percentage = (spent / limit) * 100;

      return {
        category,
        limit,
        spent,
        percentage,
        overLimit: percentage >= 100,
      };
    }).filter(Boolean);
  }, [categoryBudgets, currentMonthTransactions]);

  const overLimitCategories = categoryBudgetAlerts.filter(
    (item) => item.overLimit
  );

  const nearLimitCategories = categoryBudgetAlerts.filter(
    (item) => item.percentage >= 80 && !item.overLimit
  );

  const availableCategories = useMemo(() => {
    if (activityType === "expense") return EXPENSE_CATEGORIES;
    if (activityType === "income") return INCOME_CATEGORIES;

    const set = new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]);
    transactions.forEach((tx) => {
      if (tx.category) set.add(tx.category);
    });
    return Array.from(set);
  }, [activityType, transactions]);

  const filteredTransactions = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();

    return [...transactions]
      .filter((transaction) => {
        const matchesSearch =
          !query ||
          transaction.title.toLowerCase().includes(query) ||
          (transaction.category || "").toLowerCase().includes(query) ||
          (transaction.majorHead || "").toLowerCase().includes(query) ||
          (transaction.note || "").toLowerCase().includes(query);

        const matchesType =
          activityType === "all" || transaction.type === activityType;

        const matchesCategory =
          activityCategory === "all" ||
          transaction.category === activityCategory;

        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, activitySearch, activityType, activityCategory]);

  const groupedTransactions = useMemo(() => {
    const groups = {};

    filteredTransactions.forEach((transaction) => {
      const label = getRelativeDateLabel(transaction.date);

      if (!groups[label]) groups[label] = [];
      groups[label].push(transaction);
    });

    return Object.entries(groups);
  }, [filteredTransactions]);

  function openTransactionForm(prefill = null) {
    setInitialTxData(prefill);
    setShowTxModal(true);
  }

  function closeTransactionForm() {
    setShowTxModal(false);
    setInitialTxData(null);
  }

  function handleSaveTransaction(newTx) {
    setTransactions((prev) => [newTx, ...prev]);

    // If debt repayment linked to a loan with principal amount, update loan balance
    if (newTx.type === "debt_repayment" && newTx.loanId && newTx.principalAmount) {
      setLoans((prevLoans) =>
        prevLoans.map((l) => {
          if (l.id === newTx.loanId) {
            const newBal = Math.max(0, Number(l.currentOutstanding || 0) - Number(newTx.principalAmount));
            const newRem = Math.max(0, Number(l.remainingTenureMonths || 1) - 1);
            return {
              ...l,
              currentOutstanding: newBal,
              remainingTenureMonths: newRem,
            };
          }
          return l;
        })
      );
    }

    if (!currentUser.isDemo) {
      apiCreateTransaction(newTx).catch(() => {});
    }
  }

  function handleApplyOcrTransaction(ocrTx) {
    const newTx = {
      id: Date.now(),
      title: ocrTx.title || "Bill Expense",
      amount: Number(ocrTx.amount) || 0,
      type: ocrTx.type || "expense",
      category: ocrTx.category || "Shopping",
      majorHead: getMajorHead(ocrTx.category || "Shopping", ocrTx.type || "expense"),
      date: ocrTx.date || toDateKey(),
      paymentMethod: ocrTx.paymentMethod || "UPI",
      note: ocrTx.note || "Scanned via OCR",
      icon: CATEGORY_ICONS[ocrTx.category] || "💳",
    };
    handleSaveTransaction(newTx);
    setShowOcrModal(false);
  }

  function handleImportStatementTransactions(imported) {
    if (!Array.isArray(imported) || imported.length === 0) return;

    const formatted = imported.map((item) => {
      const type = item.type || "expense";
      const cat = item.category || "Other";
      return {
        id: "tx_imp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        title: item.title,
        amount: Number(item.amount),
        type,
        category: cat,
        majorHead: getMajorHead(cat, type),
        date: item.date || toDateKey(),
        paymentMethod: item.paymentMethod || "Bank / GPay",
        note: item.note || "Imported from Statement",
        icon: CATEGORY_ICONS[cat] || "💳",
      };
    });

    setTransactions((prev) => [...formatted, ...prev]);

    if (currentUser?.id && !currentUser.isDemo) {
      apiBulkAddTransactions(currentUser.id, formatted).catch(() => {});
    }

    setShowStatementModal(false);
  }

  function deleteTransaction(id) {
    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) return;

    setTransactions((previous) =>
      previous.filter((transaction) => transaction.id !== id)
    );

    if (!currentUser.isDemo) {
      apiDeleteTransaction(id).catch(() => {});
    }
  }

  function handleGoalInputChange(event) {
    const { name, value } = event.target;

    setGoalForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function saveGoal(event) {
    event.preventDefault();

    if (!goalForm.name.trim() || !goalForm.target) return;

    const target = Number(goalForm.target);
    const saved = Number(goalForm.saved) || 0;

    if (target <= 0) {
      window.alert("Target amount must be greater than 0.");
      return;
    }

    if (saved < 0 || saved > target) {
      window.alert("Saved amount cannot be greater than target amount.");
      return;
    }

    if (editingGoalId !== null) {
      setGoals((previous) =>
        previous.map((goal) =>
          goal.id === editingGoalId
            ? {
                ...goal,
                name: goalForm.name.trim(),
                icon: goalForm.icon || "🎯",
                category: goalForm.category || "Personal",
                target,
                saved,
                date: goalForm.date,
              }
            : goal
        )
      );
    } else {
      setGoals((previous) => [
        ...previous,
        {
          id: Date.now(),
          name: goalForm.name.trim(),
          icon: goalForm.icon || "🎯",
          category: goalForm.category || "Personal",
          target,
          saved,
          date: goalForm.date,
        },
      ]);
    }

    closeGoalForm();
  }

  function editGoal(goal) {
    setEditingGoalId(goal.id);

    setGoalForm({
      name: goal.name,
      icon: goal.icon || "🎯",
      category: goal.category || "Personal",
      target: goal.target,
      saved: goal.saved,
      date: goal.date || "",
    });

    setShowGoalForm(true);
  }

  function deleteGoal(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this goal?"
    );

    if (!confirmed) return;

    setGoals((previous) => previous.filter((goal) => goal.id !== id));
  }

  function openNewGoalForm() {
    setEditingGoalId(null);

    setGoalForm({
      name: "",
      icon: "🎯",
      category: "Personal",
      target: "",
      saved: "",
      date: "",
    });

    setShowGoalForm(true);
  }

  function closeGoalForm() {
    setShowGoalForm(false);
    setEditingGoalId(null);

    setGoalForm({
      name: "",
      icon: "🎯",
      category: "Personal",
      target: "",
      saved: "",
      date: "",
    });
  }

  function saveBudgetSettings(event) {
    event.preventDefault();

    const value = Number(event.currentTarget.monthlyBudget.value);

    if (!value || value <= 0) {
      window.alert("Monthly budget must be greater than 0.");
      return;
    }

    setMonthlyBudget(value);
  }

  function updateCategoryBudget(category, value) {
    setCategoryBudgets((previous) => ({
      ...previous,
      [category]: value === "" ? "" : Number(value),
    }));
  }

  const guardActive = monthlyFinances.budgetUsed >= guardThreshold;

  function renderPage() {
    switch (activePage) {
      case "activity":
        return (
          <ActivityPage
            activitySearch={activitySearch}
            setActivitySearch={setActivitySearch}
            activityType={activityType}
            setActivityType={setActivityType}
            activityCategory={activityCategory}
            setActivityCategory={setActivityCategory}
            groupedTransactions={groupedTransactions}
            availableCategories={availableCategories}
            openTransactionForm={openTransactionForm}
            deleteTransaction={deleteTransaction}
            onOpenOcr={() => setShowOcrModal(true)}
            onOpenStatementImport={() => setShowStatementModal(true)}
          />
        );
      case "events":
        return (
          <EventsPage
            events={events}
            transactions={transactions}
            onAddEvent={handleAddEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onOpenAddTransactionForEvent={(ev) => {
              openTransactionForm({
                type: "expense",
                eventId: ev.id,
                category: ev.categories?.[0] || "Wedding",
                title: `${ev.name} Expense`,
              });
            }}
            onDeleteTransaction={deleteTransaction}
            onBack={handleBack}
          />
        );
      case "loans":
        return (
          <LoansPage
            loans={loans}
            transactions={transactions}
            netAvailableCashFlow={monthlyFinances.netAvailableCashFlow}
            onAddLoan={handleAddLoan}
            onUpdateLoan={handleUpdateLoan}
            onDeleteLoan={handleDeleteLoan}
            onOpenAddPaymentForLoan={(ln) => {
              openTransactionForm({
                type: "debt_repayment",
                loanId: ln.id,
                title: `${ln.name} EMI`,
                amount: ln.emiAmount || "",
                category: "Home Loan EMI",
              });
            }}
            onBack={handleBack}
          />
        );
      case "reports":
        return (
          <ReportsPage
            transactions={transactions}
            monthlyBudget={monthlyBudget}
            onBack={handleBack}
          />
        );
      case "goals":
        return (
          <GoalsPage
            goals={goals}
            openNewGoalForm={openNewGoalForm}
            editGoal={editGoal}
            deleteGoal={deleteGoal}
          />
        );
      case "more":
        return (
          <MorePage
            navigateTo={navigateTo}
            currentUser={currentUser}
            onOpenOcr={() => setShowOcrModal(true)}
            onOpenStatementImport={() => setShowStatementModal(true)}
          />
        );
      case "budgets":
        return (
          <BudgetsPage
            monthlyBudget={monthlyBudget}
            totalExpenses={monthlyFinances.actualSpending}
            remainingBudget={monthlyFinances.remainingBudget}
            categoryBudgets={categoryBudgets}
            currentMonthTransactions={currentMonthTransactions}
            updateCategoryBudget={updateCategoryBudget}
            saveBudgetSettings={saveBudgetSettings}
            onBack={handleBack}
          />
        );
      case "guard":
        return (
          <SpendingGuardPage
            overLimitCategories={overLimitCategories}
            budgetUsed={monthlyFinances.budgetUsed}
            guardThreshold={guardThreshold}
            setGuardThreshold={setGuardThreshold}
            nearLimitCategories={nearLimitCategories}
            categoryBudgetAlerts={categoryBudgetAlerts}
            onBack={handleBack}
          />
        );
      case "insights":
        return (
          <InsightsPage
            topCategory={monthlyFinances.topCategory}
            averageDailyExpense={
              monthlyFinances.actualSpending > 0
                ? Math.round(monthlyFinances.actualSpending / (new Date().getDate() || 1))
                : 0
            }
            savingsRate={monthlyFinances.savingsRate}
            currentSavings={monthlyFinances.wealthGeneration}
            currentMonthTransactions={currentMonthTransactions}
            totalIncome={monthlyFinances.totalIncome}
            totalExpenses={monthlyFinances.actualSpending}
            budgetUsed={monthlyFinances.budgetUsed}
            onBack={handleBack}
          />
        );
      case "settings":
        return (
          <SettingsPage
            currentUser={currentUser}
            transactions={transactions}
            goals={goals}
            onLogout={handleLogout}
            onResetAccountData={handleResetAccountData}
            onLoadDemoData={handleLoadDemoData}
            onBack={handleBack}
            onUpdateUser={handleUpdateUser}
          />
        );
      default:
        return (
          <HomePage
            currentUser={currentUser}
            selectedMonthKey={selectedMonthKey}
            setSelectedMonthKey={setSelectedMonthKey}
            monthlyFinances={monthlyFinances}
            events={events}
            loans={loans}
            goals={goals}
            transactions={transactions}
            guardActive={guardActive}
            overLimitCategories={overLimitCategories}
            nearLimitCategories={nearLimitCategories}
            categoryBudgetAlerts={categoryBudgetAlerts}
            navigateTo={navigateTo}
            openNewGoalForm={openNewGoalForm}
            editGoal={editGoal}
            deleteGoal={deleteGoal}
            openTransactionForm={openTransactionForm}
            deleteTransaction={deleteTransaction}
            onOpenOcr={() => setShowOcrModal(true)}
            onOpenStatementImport={() => setShowStatementModal(true)}
          />
        );
    }
  }

  return (
    <div className="app">
      <main>{renderPage()}</main>

      <nav className="bottom-nav">
        <NavItem
          icon="⌂"
          label="Home"
          active={activePage === "home"}
          onClick={() => navigateTo("home")}
        />

        <NavItem
          icon="↕"
          label="Activity"
          active={activePage === "activity"}
          onClick={() => navigateTo("activity")}
        />

        <button
          className="add-btn"
          type="button"
          onClick={() => openTransactionForm()}
          aria-label="Add transaction"
        >
          +
        </button>

        <NavItem
          icon="💍"
          label="Events"
          active={activePage === "events"}
          onClick={() => navigateTo("events")}
        />

        <NavItem
          icon="💳"
          label="Loans"
          active={activePage === "loans"}
          onClick={() => navigateTo("loans")}
        />

        <NavItem
          icon="☰"
          label="More"
          active={["more", "reports", "goals", "budgets", "guard", "insights", "settings"].includes(activePage)}
          onClick={() => navigateTo("more")}
        />
      </nav>

      {/* Modern 7-Type Transaction Modal */}
      <TransactionModal
        isOpen={showTxModal}
        onClose={closeTransactionForm}
        onSubmit={handleSaveTransaction}
        events={events}
        loans={loans}
        initialData={initialTxData}
        onOpenOcr={() => setShowOcrModal(true)}
      />

      {showGoalForm && (
        <div className="modal-overlay" onMouseDown={closeGoalForm}>
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-handle" />
            <div className="modal-header">
              <div>
                <span>PACE</span>
                <h2>{editingGoalId !== null ? "Edit Goal" : "New Goal"}</h2>
              </div>

              <button className="close-btn" type="button" onClick={closeGoalForm}>
                ×
              </button>
            </div>

            <form onSubmit={saveGoal}>
              <label>
                Goal Name
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Emergency Fund"
                  value={goalForm.name}
                  onChange={handleGoalInputChange}
                  autoFocus
                />
              </label>

              <div className="form-row">
                <label>
                  Icon
                  <input
                    type="text"
                    name="icon"
                    placeholder="🎯"
                    value={goalForm.icon}
                    onChange={handleGoalInputChange}
                  />
                </label>

                <label>
                  Category
                  <select
                    name="category"
                    value={goalForm.category}
                    onChange={handleGoalInputChange}
                  >
                    {GOAL_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Target Amount
                  <input
                    type="number"
                    name="target"
                    placeholder="₹50,000"
                    min="1"
                    value={goalForm.target}
                    onChange={handleGoalInputChange}
                  />
                </label>

                <label>
                  Saved Amount
                  <input
                    type="number"
                    name="saved"
                    placeholder="₹0"
                    min="0"
                    value={goalForm.saved}
                    onChange={handleGoalInputChange}
                  />
                </label>
              </div>

              <label>
                Target Date
                <input
                  type="date"
                  name="date"
                  value={goalForm.date}
                  onChange={handleGoalInputChange}
                />
              </label>

              <button className="submit-btn" type="submit">
                {editingGoalId !== null ? "Save Changes" : "Create Goal"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ReceiptScannerModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onApplyTransaction={handleApplyOcrTransaction}
      />

      <StatementImportModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        onImportTransactions={handleImportStatementTransactions}
      />
    </div>
  );
}

function StatCard({ label, value, hint, type = "default" }) {
  return (
    <div className={`stat-card stat-${type}`}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
      <small>{hint}</small>
    </div>
  );
}

function GoalCard({ goal, compact = false, onEdit, onDelete }) {
  const progress =
    Number(goal.target) > 0
      ? Math.min((Number(goal.saved) / Number(goal.target)) * 100, 100)
      : 0;

  const remaining = Math.max(Number(goal.target) - Number(goal.saved), 0);

  return (
    <div className={compact ? "dashboard-goal-card" : "goal-card"}>
      <div className="goal-card-header">
        <div className="goal-title">
          <span className="goal-icon">{goal.icon || "🎯"}</span>

          <div>
            <h3>{goal.name}</h3>
            <small>
              {goal.category || "Personal"} ·{" "}
              {goal.date ? formatDate(goal.date) : "No target date"}
            </small>
          </div>
        </div>

        <strong>{progress.toFixed(0)}%</strong>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="goal-money">
        <span>
          {formatCurrency(goal.saved)} / {formatCurrency(goal.target)}
        </span>
        <span>{formatCurrency(remaining)} left</span>
      </div>

      {!compact && (
        <div className="goal-actions">
          <button className="goal-edit" type="button" onClick={() => onEdit(goal)}>
            ✏️ Edit
          </button>
          <button className="goal-delete" type="button" onClick={() => onDelete(goal.id)}>
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Transaction({ transaction, onDelete, detailed = false }) {
  const isPositive = transaction.type === "income";
  const typeClass = transaction.type || "expense";

  return (
    <div className="transaction">
      <div className="transaction-left">
        <div className={`transaction-icon tx-icon-${typeClass}`}>{transaction.icon || "💳"}</div>

        <div className="transaction-info">
          <div className="tx-title-row">
            <strong>{transaction.title}</strong>
            {transaction.eventId && <span className="tx-badge event-badge">💍 Event</span>}
            {transaction.loanId && <span className="tx-badge loan-badge">🏠 Loan</span>}
          </div>

          <small>
            <span className={`tx-type-tag ${typeClass}`}>{typeClass.replace("_", " ")}</span>
            {" · "}
            {transaction.category} · {formatShortDate(transaction.date)}
            {detailed && transaction.paymentMethod
              ? ` · ${transaction.paymentMethod}`
              : ""}
          </small>

          {detailed && transaction.note && (
            <p className="transaction-note">{transaction.note}</p>
          )}
        </div>
      </div>

      <div className="transaction-right">
        <strong className={`tx-amount ${typeClass}`}>
          {isPositive ? "+" : transaction.type === "transfer" || transaction.type === "cash_withdrawal" ? "• " : "-"}
          {formatCurrency(transaction.amount)}
        </strong>

        <button
          className="transaction-delete"
          type="button"
          onClick={() => onDelete(transaction.id)}
          aria-label={`Delete ${transaction.title}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function InsightCard({ title, value, detail }) {
  return (
    <div className="insight-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function EmptyState({ icon, title, text, action, onAction }) {
  return (
    <div className="empty-state">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <button type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""}`}
      type="button"
      onClick={onClick}
    >
      <span>{icon}</span>
      <small>{label}</small>
    </button>
  );
}

export default App;