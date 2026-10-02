import { useEffect, useMemo, useState } from "react";
import "./App.css";
import PaceLogo from "./components/PaceLogo";
import GoogleSignInButton from "./components/GoogleSignInButton";
import StatementImportModal from "./components/StatementImportModal";

import EventsPage from "./components/EventsPage";
import LoansPage from "./components/LoansPage";
import ReportsPage from "./components/ReportsPage";
import MonthlyReviewPage from "./components/MonthlyReviewPage";
import TransactionModal from "./components/TransactionModal";
import {
  exportTransactionsToCSV,
  exportFinancialDataJSON,
} from "./utils/fileExtractor";
import {
  calculateMonthlyFinances,
 
  toMonthKey,
  isDateInMonth,
  getMajorHead,
} from "./utils/financialEngine";
import {
  apiBulkAddTransactions,
  apiLogin,
  apiRegister,
  apiForgotPassword,
  apiVerifyOtp,
  apiResetPassword,
  clearAuthToken,
  apiSendReportEmail,
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
  apiUpdateTransaction,
  apiDeleteTransaction,
  apiDeleteAccount,
  apiGetBudget,
  apiGetGoals,
  apiCreateGoal,
  apiUpdateGoal,
  apiDeleteGoal,
  apiUpdateBudget,
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

const defaultBudget = 0;
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

/* ==========================================================================
   AUTH SCREEN (Login & Create Account)
   ========================================================================== */

function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

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
      });

      // Save initial local structures
      saveLocal(`pace_usr_${res.user.id}_transactions`, []);
      saveLocal(`pace_usr_${res.user.id}_goals`, []);
      saveLocal(`pace_usr_${res.user.id}_monthly-budget`, 0);
      saveLocal(`pace_usr_${res.user.id}_category-budgets`, {});
      saveLocal(`pace_usr_${res.user.id}_guard-threshold`, 80);

      onLogin(res.user);
    } catch (err) {
      setError(
        err.message || "Could not create your account. Please try again.",
      );
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
      setSuccessMsg(
        res.message ||
          "A 6-digit OTP verification code has been sent to your email!",
      );
      setForgotStep("otp");
    } catch (err) {
      setError(
        err.message ||
          "Could not send the verification code. Please try again.",
      );
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
      const res = await apiVerifyOtp(
        forgotEmail.trim().toLowerCase(),
        cleanOtp,
      );
      setResetToken(res.resetToken || "valid_token");
      setSuccessMsg(
        "Code verified successfully! Please enter your new password.",
      );
      setForgotStep("newPassword");
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
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

      setSuccessMsg(
        res.message || "Password reset successfully! You can now log in.",
      );
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
            <button type="button" className="auth-tab active">
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
                placeholder="Min 6 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
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
                  {loading
                    ? "Sending Secure OTP..."
                    : "Send 6-Digit OTP to Email"}
                </button>
              </form>
            )}

            {forgotStep === "otp" && (
              <form className="auth-form" onSubmit={handleVerifyOtpSubmit}>
                <div className="otp-box-wrapper">
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      color: "#cbd5e1",
                    }}
                  >
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    className="otp-digit-input"
                    maxLength={6}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, ""))
                    }
                    autoFocus
                    required
                  />
                  <span className="otp-hint">Code expires in 10 minutes</span>
                </div>

                <button className="submit-btn" type="submit" disabled={loading}>
                  {loading ? "Verifying Code..." : "Verify Code & Proceed"}
                </button>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 10,
                  }}
                >
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
                  {loading
                    ? "Updating Password..."
                    : "Set New Password & Log In"}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="auth-divider">or continue with</div>

        <GoogleSignInButton
          onGoogleSuccess={(googleUser) => {
            if (!googleUser) {
              setError(
                "Google sign-in did not return an account. Please try again.",
              );
              return;
            }
            onLogin(googleUser);
          }}
          onError={setError}
        />
      </div>
    </div>
  );
}

/* ==========================================================================
   PAGE COMPONENTS
   ========================================================================== */

function HomePage({
  currentUser,
  monthlyFinances,
  goals = [],
  loans = [],
  transactions = [],
  navigateTo,
}) {
  const userInitial = currentUser?.name
    ? currentUser.name.charAt(0).toUpperCase()
    : "P";

  const finances = monthlyFinances || {};
  const netAvailable = Number(finances.netAvailableCashFlow || 0);
  const totalIncome = Number(finances.totalIncome || 0);
  const actualSpending = Number(finances.actualSpending || 0);
  const committedOutflows = Number(finances.committedOutflows || 0);
  const remainingBudget = Math.max(Number(finances.remainingBudget || 0), 0);
  const safeToSpendToday = Math.max(Number(finances.safeToSpendDaily || 0), 0);

  const spendingPercentage =
    totalIncome > 0
      ? Math.min((actualSpending / totalIncome) * 100, 100)
      : 0;

  const recentTransactions = [...transactions]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 4);

  const savingsTotal = transactions
    .filter((transaction) => transaction.type === "savings")
    .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount || 0)), 0);

  const financeShortcuts = [
    {
      key: "savings",
      icon: "💰",
      title: "Savings",
      value: formatCurrency(savingsTotal),
      meta: "Total recorded",
      tone: "green",
      onClick: () => navigateTo("savings"),
    },
    {
      key: "emi",
      icon: "💳",
      title: "EMI",
      value: formatCurrency(finances.totalDebtRepayment || 0),
      meta: "Loan repayments",
      tone: "coral",
      onClick: () => navigateTo("loans"),
    },
    {
      key: "loans",
      icon: "🏦",
      title: "Loans",
      value: `${loans.length} active`,
      meta: "Manage loans",
      tone: "purple",
      onClick: () => navigateTo("loans"),
    },
    {
      key: "budget",
      icon: "▣",
      title: "Budget",
      value: formatCurrency(remainingBudget),
      meta: "Remaining this month",
      tone: "blue",
      onClick: () => navigateTo("budgets"),
    },
    {
      key: "goals",
      icon: "🎯",
      title: "Goals",
      value: `${goals.length} active`,
      meta: "Savings targets",
      tone: "orange",
      onClick: () => navigateTo("goals"),
    },
    {
      key: "review",
      icon: "🗓️",
      title: "Monthly Review",
      value: "View",
      meta: "10-part review",
      tone: "pink",
      onClick: () => navigateTo("monthly-review"),
    },
    {
      key: "reports",
      icon: "▥",
      title: "Reports",
      value: "View",
      meta: "Trends & insights",
      tone: "lavender",
      onClick: () => navigateTo("reports"),
    },
  ];

  return (
    <div className="page-content home-page pace-dashboard">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <PaceLogo size={46} variant="tile" className="dashboard-logo" />
          <div>
            <h1>PACE</h1>
            <p>Spend with intention. Save with purpose.</p>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-profile-btn"
          onClick={() => navigateTo("settings")}
          aria-label="Open settings"
        >
          {currentUser?.picture ? (
            <img src={currentUser.picture} alt="" />
          ) : (
            <span>{userInitial}</span>
          )}
        </button>
      </header>

      <section className="dashboard-balance-card">
        <div className="dashboard-balance-top">
          <div>
            <span className="dashboard-eyebrow">NET AVAILABLE BALANCE</span>
            <h2 className={netAvailable >= 0 ? "positive" : "negative"}>
              {formatCurrency(netAvailable)}
            </h2>
            <p>After upcoming bills & commitments</p>
          </div>
          <span className={`dashboard-balance-status ${netAvailable >= 0 ? "positive" : "negative"}`}>
            {netAvailable >= 0 ? "Available" : "Overcommitted"}
          </span>
        </div>

        <div className="dashboard-balance-breakdown">
          <div>
            <span>Income</span>
            <strong>{formatCurrency(totalIncome)}</strong>
          </div>
          <div>
            <span>Spending</span>
            <strong>{formatCurrency(actualSpending)}</strong>
          </div>
          <div>
            <span>Committed</span>
            <strong>{formatCurrency(committedOutflows)}</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-overview-grid">
        <div className="dashboard-spending-card">
          <div className="dashboard-card-heading">
            <div>
              <span className="dashboard-section-kicker">THIS MONTH</span>
              <h2>Spending</h2>
            </div>
            <button type="button" onClick={() => navigateTo("activity")}>See all →</button>
          </div>

          <div className="dashboard-spending-content">
            <div
              className="dashboard-spending-ring"
              style={{ "--spending-progress": `${spendingPercentage}%` }}
            >
              <div>
                <strong>{spendingPercentage.toFixed(0)}%</strong>
                <span>spent</span>
              </div>
            </div>
            <div className="dashboard-spending-total">
              <span>Actual spending</span>
              <strong>{formatCurrency(actualSpending)}</strong>
              <small>{formatCurrency(Math.max(totalIncome - actualSpending, 0))} income remaining</small>
            </div>
          </div>
        </div>

        <div className="dashboard-safe-card">
          <div className="dashboard-card-heading">
            <div>
              <span className="dashboard-section-kicker">TODAY</span>
              <h2>Safe to Spend</h2>
            </div>
            <span className="dashboard-safe-icon">✓</span>
          </div>
          <strong className="dashboard-safe-amount">{formatCurrency(safeToSpendToday)}</strong>
          <p>Based on your remaining monthly budget.</p>
          <div className="dashboard-safe-meta">
            <span>{formatCurrency(remainingBudget)} remaining</span>
          </div>
        </div>
      </section>

      <section className="dashboard-section dashboard-finances-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">QUICK ACCESS</span>
            <h2>Your Finances</h2>
          </div>
        </div>

        <div className="dashboard-finance-grid">
          {financeShortcuts.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`dashboard-finance-card ${item.tone}`}
              onClick={item.onClick}
            >
              <span className="dashboard-finance-icon">{item.icon}</span>
              <span className="dashboard-finance-copy">
                <strong>{item.title}</strong>
                <b>{item.value}</b>
                <small>{item.meta}</small>
              </span>
              <span className="dashboard-finance-arrow">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-section dashboard-recent-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">LATEST</span>
            <h2>Recent Activity</h2>
          </div>
          <button type="button" className="dashboard-link" onClick={() => navigateTo("activity")}>See all →</button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="dashboard-empty-activity">
            <span>↕</span>
            <div>
              <strong>No activity yet</strong>
              <small>Your latest transactions will appear here.</small>
            </div>
          </div>
        ) : (
          <div className="dashboard-recent-list">
            {recentTransactions.map((transaction) => {
              const isIncome = transaction.type === "income";
              const isPositive = isIncome;
              const amount = formatCurrency(Math.abs(Number(transaction.amount || 0)));
              const icon = CATEGORY_ICONS[transaction.category] || (isIncome ? "↗" : "₹");
              return (
                <button
                  type="button"
                  className="dashboard-recent-row"
                  key={transaction.id}
                  onClick={() => navigateTo("activity")}
                >
                  <span className="dashboard-recent-icon">{icon}</span>
                  <span className="dashboard-recent-copy">
                    <strong>{transaction.title || transaction.category || "Transaction"}</strong>
                    <small>{transaction.category || transaction.type || "Transaction"}</small>
                  </span>
                  <strong className={isPositive ? "amount-positive" : "amount-negative"}>
                    {isPositive ? "+" : "−"} {amount}
                  </strong>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SavingsPage({
  transactions = [],
  goals = [],
  openTransactionForm,
  navigateTo,
}) {
  const savingsTransactions = transactions
    .filter((tx) => tx.type === "savings")
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const totalSaved = savingsTransactions.reduce(
    (sum, tx) => sum + Math.abs(Number(tx.amount || 0)),
    0,
  );

  return (
    <div className="page-content page finance-page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Savings</h2>
          <p>Money you've intentionally set aside.</p>
        </div>
        <button className="goal-add-btn" type="button" onClick={() => openTransactionForm({ type: "savings" })}>
          + Add saving
        </button>
      </div>

      <section className="finance-summary-card savings-summary-card">
        <span className="card-label">TOTAL SAVED</span>
        <strong>{formatCurrency(totalSaved)}</strong>
        <small>{savingsTransactions.length} saving {savingsTransactions.length === 1 ? "entry" : "entries"}</small>
      </section>

      <section className="finance-section-card">
        <div className="finance-section-heading">
          <div>
            <span className="dashboard-section-kicker">PURPOSE</span>
            <h3>Savings Goals</h3>
          </div>
          <button type="button" className="text-btn" onClick={() => navigateTo("goals")}>Manage</button>
        </div>
        {goals.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No savings goals yet"
            text="Create a goal when you want a specific purpose for your savings."
            action="Create goal"
            onAction={() => navigateTo("add")}
          />
        ) : (
          <div className="goals-list">
            {goals.slice(0, 3).map((goal) => (
              <GoalCard key={goal.id} goal={goal} compact />
            ))}
          </div>
        )}
      </section>

      <section className="finance-section-card">
        <div className="finance-section-heading">
          <div>
            <span className="dashboard-section-kicker">HISTORY</span>
            <h3>Recent savings</h3>
          </div>
          <button type="button" className="text-btn" onClick={() => navigateTo("activity")}>See all</button>
        </div>
        {savingsTransactions.length === 0 ? (
          <EmptyState
            icon="💰"
            title="No savings recorded"
            text="Your savings entries will appear here after you add them."
            action="Add saving"
            onAction={() => openTransactionForm({ type: "savings" })}
          />
        ) : (
          <div className="transactions activity-list">
            {savingsTransactions.slice(0, 5).map((tx) => (
              <Transaction key={tx.id} transaction={tx} detailed />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AddPage({ navigateTo, openTransactionForm, openNewGoalForm }) {
  const transactionActions = [
    ["💸", "Expense", "Record money spent", "expense"],
    ["💰", "Income", "Record money received", "income"],
    ["🏦", "Savings", "Move money into savings", "savings"],
    ["📈", "Investment", "Record an investment", "investment"],
    ["💳", "Debt / EMI", "Record a loan repayment", "debt_repayment"],
    ["↔", "Transfer", "Move money between accounts", "transfer"],
    ["💵", "Cash withdrawal", "Move money into cash", "cash_withdrawal"],
  ];

  const planActions = [
    ["🎯", "Goal", "Set a savings target", () => openNewGoalForm()],
    ["💰", "Budget", "Set your monthly spending plan", () => navigateTo("budgets")],
    ["📅", "Event", "Create an event budget", () => navigateTo("events")],
    ["💳", "Loan", "Add a loan or EMI plan", () => navigateTo("loans")],
  ];

  return (
    <div className="page-content page add-page">
      <div className="page-title">
        <span>PACE</span>
        <h2>Add</h2>
        <p>Record money or set up a financial plan.</p>
      </div>

      <section className="add-section">
        <div className="finance-section-heading">
          <div>
            <span className="dashboard-section-kicker">MONEY</span>
            <h3>Add transaction</h3>
          </div>
        </div>
        <div className="add-action-grid">
          {transactionActions.map(([icon, title, meta, type]) => (
            <button key={type} type="button" className="add-action-card" onClick={() => openTransactionForm({ type })}>
              <span className="add-action-icon">{icon}</span>
              <span><strong>{title}</strong><small>{meta}</small></span>
              <b>›</b>
            </button>
          ))}
        </div>
      </section>

      <section className="add-section">
        <div className="finance-section-heading">
          <div>
            <span className="dashboard-section-kicker">PLANS</span>
            <h3>Set up a plan</h3>
          </div>
        </div>
        <div className="add-action-grid">
          {planActions.map(([icon, title, meta, onClick]) => (
            <button key={title} type="button" className="add-action-card" onClick={onClick}>
              <span className="add-action-icon">{icon}</span>
              <span><strong>{title}</strong><small>{meta}</small></span>
              <b>›</b>
            </button>
          ))}
        </div>
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
  onOpenStatementImport,
  deleteTransaction,
}) {
  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Activity</h2>
          <p>All your transactions.</p>
        </div>

        <div className="page-title-actions">
          <button className="secondary-action-btn compact" type="button" onClick={onOpenStatementImport}>
            Import
          </button>
          <button className="goal-add-btn" type="button" onClick={openTransactionForm}>
            + Add
          </button>
        </div>
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

        <div
          className="filter-row"
          style={{
            overflowX: "auto",
            flexWrap: "nowrap",
            paddingBottom: "6px",
          }}
        >
          <button
            type="button"
            className={
              activityType === "all" ? "filter-chip active" : "filter-chip"
            }
            onClick={() => setActivityType("all")}
          >
            All
          </button>
          <button
            type="button"
            className={
              activityType === "expense" ? "filter-chip active" : "filter-chip"
            }
            onClick={() => setActivityType("expense")}
          >
            Expenses
          </button>
          <button
            type="button"
            className={
              activityType === "income" ? "filter-chip active" : "filter-chip"
            }
            onClick={() => setActivityType("income")}
          >
            Income
          </button>
          <button
            type="button"
            className={
              activityType === "savings" ? "filter-chip active" : "filter-chip"
            }
            onClick={() => setActivityType("savings")}
          >
            Savings
          </button>
          <button
            type="button"
            className={
              activityType === "investment"
                ? "filter-chip active"
                : "filter-chip"
            }
            onClick={() => setActivityType("investment")}
          >
            Investments
          </button>
          <button
            type="button"
            className={
              activityType === "debt_repayment"
                ? "filter-chip active"
                : "filter-chip"
            }
            onClick={() => setActivityType("debt_repayment")}
          >
            Debt/EMI
          </button>
          <button
            type="button"
            className={
              activityType === "transfer" ? "filter-chip active" : "filter-chip"
            }
            onClick={() => setActivityType("transfer")}
          >
            Transfers
          </button>
          <button
            type="button"
            className={
              activityType === "cash_withdrawal"
                ? "filter-chip active"
                : "filter-chip"
            }
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
          icon={activitySearch || activityType !== "all" || activityCategory !== "all" ? "🔎" : "🧾"}
          title={activitySearch || activityType !== "all" || activityCategory !== "all" ? "Nothing found" : "No transactions yet"}
          text={activitySearch || activityType !== "all" || activityCategory !== "all" ? "Try adjusting your search or filters." : "Your income, spending, savings and other money movements will appear here."}
          action={activitySearch || activityType !== "all" || activityCategory !== "all" ? "Clear filters" : "Add transaction"}
          onAction={() => {
            if (activitySearch || activityType !== "all" || activityCategory !== "all") {
              setActivitySearch("");
              setActivityType("all");
              setActivityCategory("all");
            } else {
              openTransactionForm();
            }
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

        <button
          className="goal-add-btn"
          type="button"
          onClick={openNewGoalForm}
        >
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
                (item) => item.type === "expense" && item.category === category,
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
                      0,
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
              className={`guard-category ${item.overLimit ? "over-limit" : ""}`}
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
  transactions = [],
  goals = [],
  events = [],
  loans = [],
  onLogout,
  onResetAccountData,
  onBack,
  onUpdateUser,
}) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState({ type: "", msg: "" });
  // Financial preferences local state
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState("UPI");
  

  // Email notifications state
  const [emailNotifs, setEmailNotifs] = useState(() => ({
    budgetAlerts: currentUser?.emailNotifications?.budgetAlerts ?? true,
    loginAlerts: currentUser?.emailNotifications?.loginAlerts ?? true,
    monthlyReport: currentUser?.emailNotifications?.monthlyReport ?? true,
  }));
  const [emailActionStatus, setEmailActionStatus] = useState({
    type: "",
    msg: "",
  });
  const [emailLoading, setEmailLoading] = useState(false);

  // Account Deletion Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    apiGetNotificationPrefs()
      .then((res) => {
        if (res?.emailNotifications) {
          setEmailNotifs(res.emailNotifications);
        }
      })
      .catch(() => {});
  }, []);

  async function handleToggleNotif(key) {
    const updated = { ...emailNotifs, [key]: !emailNotifs[key] };
    setEmailNotifs(updated);
    try {
      await apiUpdateNotificationPrefs(updated);
    } catch (err) {
      console.warn("Could not save notification pref to backend:", err.message);
    }
  }

  async function handleSendReportEmail() {
    setEmailLoading(true);
    setEmailActionStatus({ type: "", msg: "" });
    try {
      const res = await apiSendReportEmail();
      setEmailActionStatus({
        type: "success",
        msg:
          res.message || `Financial statement sent to ${currentUser?.email}!`,
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
      const res = await apiResetPassword({
        email: currentUser?.email,
        newPassword,
      }).catch(() => null);

      if (
        !res &&
        currentUser?.password &&
        currentUser.password !== currentPassword
      ) {
        setPasswordStatus({
          type: "error",
          msg: "Current password is incorrect.",
        });
        return;
      }
    } catch {
      if (currentUser?.password && currentUser.password !== currentPassword) {
        setPasswordStatus({
          type: "error",
          msg: "Current password is incorrect.",
        });
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
      msg: "Password updated successfully!",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setShowPasswordForm(false);
      setPasswordStatus({ type: "", msg: "" });
    }, 2200);
  }

  function handlePaymentMethodChange(e) {
  const val = e.target.value;
  setDefaultPaymentMethod(val);
  saveLocal(`pace_usr_${currentUser?.id}_default_payment`, val);
}

  // Account Deletion Handler
  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteError("");
    setDeleteLoading(true);

    const isGoogle = currentUser?.authProvider === "google";
    const payload = {};

    if (isGoogle) {
      if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
        setDeleteError(
          'Please type "DELETE" in all capital letters to confirm.',
        );
        setDeleteLoading(false);
        return;
      }
      payload.confirmText = "DELETE";
    } else {
      if (!deleteConfirmPassword) {
        setDeleteError("Please enter your password to confirm.");
        setDeleteLoading(false);
        return;
      }
      payload.password = deleteConfirmPassword;
    }

    try {
      await apiDeleteAccount(payload);
      // Clean up session and storage
      clearAuthToken();
      localStorage.removeItem("pace_active_user");
      const userPrefix = `pace_usr_${currentUser?.id}_`;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(userPrefix)) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      setShowDeleteModal(false);
      onLogout();
    } catch (err) {
      setDeleteError(
        err.message || "Failed to delete account. Please try again.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Settings</h2>
          <p>Account, preferences & privacy control.</p>
        </div>
        <button className="back-btn" type="button" onClick={onBack}>
          ← Back
        </button>
      </div>

      {/* SECTION 1: ACCOUNT & SECURITY */}
      <section className="settings-section">
        <div className="section-title-sm">
          <span>1. ACCOUNT & SECURITY</span>
          <small>Manage identity, password & permanent deletion</small>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <strong>Account Identity</strong>
              <small>{currentUser?.email || "User Account"}</small>
            </div>
            <span className="status-dot">{currentUser?.name || "User"}</span>
          </div>

          <div className="settings-row">
            <div>
              <strong>Sign-In Method</strong>
              <small>
                {currentUser?.authProvider === "google"
                  ? "Google OAuth 2.0 (Google Identity Services)"
                  : "Standard Email & Password (Bcrypt Encrypted)"}
              </small>
            </div>
            <span
              className={`security-badge ${currentUser?.authProvider === "google" ? "google" : ""}`}
            >
              {currentUser?.authProvider === "google"
                ? "Google Account"
                : "Password Auth"}
            </span>
          </div>

          <div className="settings-row">
            <div>
              <strong>Session Security</strong>
              <small>Bank-Grade Token Encryption</small>
            </div>
            <span className="security-badge jwt">🔒 Active</span>
          </div>

          {currentUser?.authProvider !== "google" && (
            <div
              className="settings-row"
              style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>Change Password</strong>
                  <small>Update your account access credentials</small>
                </div>
                <button
                  className="text-btn"
                  type="button"
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                >
                  {showPasswordForm ? "Close Form" : "Change Password"}
                </button>
              </div>

              {showPasswordForm && (
                <form
                  className="change-password-form"
                  onSubmit={handleChangePasswordSubmit}
                  style={{ marginTop: 10 }}
                >
                  {passwordStatus.msg && (
                    <div
                      className={`password-status-banner ${passwordStatus.type}`}
                    >
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
                      onClick={() => setShowPasswordForm(false)}
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

          {/* Account Deletion Trigger */}
          <div
            className="settings-row"
            style={{
              borderTop: "1px solid rgba(239, 68, 68, 0.2)",
              paddingTop: 14,
              marginTop: 10,
            }}
          >
            <div>
              <strong style={{ color: "#ef4444" }}>Delete Account</strong>
              <small>
                Permanently erase user account and all 6 financial collections
              </small>
            </div>
            <button
              type="button"
              className="danger-btn-sm"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => {
                setDeleteError("");
                setDeleteConfirmPassword("");
                setDeleteConfirmText("");
                setShowDeleteModal(true);
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: PREFERENCES */}
      <section className="settings-section" style={{ marginTop: 20 }}>
        <div className="section-title-sm">
          <span>2. PREFERENCES</span>
          <small>Currency & transaction defaults</small>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <strong>Primary Currency</strong>
              <small>Default currency format for all calculations</small>
            </div>
            <span className="security-badge">INR (₹)</span>
          </div>

          <div className="settings-row">
            <div>
              <strong>Default Payment Method</strong>
              <small>Pre-selected when adding a new transaction</small>
            </div>
            <select
              value={defaultPaymentMethod}
              onChange={handlePaymentMethodChange}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* SECTION 3: EMAIL NOTIFICATIONS & ALERTS */}
      <section className="settings-section" style={{ marginTop: 20 }}>
        <div className="section-title-sm">
          <span>3. NOTIFICATIONS & EMAIL ALERTS</span>
          <small>Configure automated spending alerts & report delivery</small>
        </div>

        <div className="settings-card">
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
              <small>
                Email notification when spending reaches 80% or 100% of budget
              </small>
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
              <small>
                Email alert with IP, time & device when your account logs in
              </small>
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
              <small>
                Periodic spending snapshot, savings rate, and category breakdown
              </small>
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

          {/* Action buttons */}
          <div className="action-btn-group" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="secondary-action-btn"
              onClick={handleSendReportEmail}
              disabled={emailLoading}
            >
              <span>📊</span>
              <span>{emailLoading ? "Generating..." : "Email My Summary"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 4: DATA & PRIVACY */}
      <section className="settings-section" style={{ marginTop: 20 }}>
        <div className="section-title-sm">
          <span>4. DATA & PRIVACY</span>
          <small>Import, export & data ownership controls</small>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <strong>Export Transactions (CSV)</strong>
              <small>Download spreadsheet formatted transaction records</small>
            </div>
            <button
              className="text-btn"
              type="button"
              onClick={() => exportTransactionsToCSV(transactions)}
            >
              Export CSV
            </button>
          </div>

          <div className="settings-row">
            <div>
              <strong>Full Financial Backup (JSON)</strong>
              <small>
                Export complete account data including goals, events & loans
              </small>
            </div>
            <button
              className="text-btn"
              type="button"
              onClick={() =>
                exportFinancialDataJSON({
                  currentUser,
                  transactions,
                  goals,
                  events,
                  loans,
                })
              }
            >
              Export JSON
            </button>
          </div>

          <div
            className="settings-row"
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              paddingTop: 12,
            }}
          >
            <div>
              <strong>Clear Local Data</strong>
              <small>
                Clears cached PACE data from this device only. Cloud account
                data is not deleted.
              </small>
            </div>
            <button
              className="text-btn"
              type="button"
              onClick={onResetAccountData}
            >
              Clear Local Data
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 5: ABOUT & PRIVACY */}
      <section className="settings-section" style={{ marginTop: 20 }}>
        <div className="section-title-sm">
          <span>5. ABOUT & PRIVACY</span>
          <small>PACE information & privacy controls</small>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <strong>Data Privacy</strong>
              <small>Your financial records are isolated to your account.</small>
            </div>
            <span className="security-badge">🔒 Private</span>
          </div>

          <div className="settings-row">
            <div>
              <strong>PACE Version</strong>
              <small>Personal finance companion</small>
            </div>
            <span className="security-badge">v1.0</span>
          </div>
        </div>
      </section>

      <button
        className="logout-btn"
        type="button"
        onClick={onLogout}
        style={{ marginTop: 24 }}
      >
        Log Out ({currentUser?.name || "Account"})
      </button>

      <div className="app-about-footer" style={{ marginTop: 20 }}>
        <PaceLogo size={32} variant="tile" />
        <div>
          <strong>PACE v1.0 Production</strong>
          <small>Spend with intention. Save with purpose.</small>
        </div>
      </div>

      {/* ACCOUNT DELETION CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onMouseDown={() => setShowDeleteModal(false)}
        >
          <div
            className="modal"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ borderTop: "4px solid #ef4444" }}
          >
            <div className="modal-handle" />
            <div className="modal-header">
              <div>
                <span style={{ color: "#ef4444", fontWeight: 700 }}>
                  PERMANENT DELETION
                </span>
                <h2 style={{ color: "#f8fafc" }}>Delete PACE Account</h2>
              </div>
              <button
                className="close-btn"
                type="button"
                onClick={() => setShowDeleteModal(false)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "0 0 16px 0" }}>
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <strong
                  style={{
                    color: "#f87171",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  ⚠️ This action cannot be undone.
                </strong>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#cbd5e1",
                    lineHeight: 1.4,
                  }}
                >
                  All your financial data will be permanently wiped across all 6
                  collections: Transactions, Events, Loans, Budgets, Savings
                  Goals, and Account Profile.
                </p>
              </div>

              {deleteError && (
                <div
                  className="password-status-banner error"
                  style={{ marginBottom: 14 }}
                >
                  {deleteError}
                </div>
              )}

              <form onSubmit={handleDeleteAccount}>
                {currentUser?.authProvider === "google" ? (
                  <label>
                    Type <strong style={{ color: "#ef4444" }}>DELETE</strong> to
                    confirm:
                    <input
                      type="text"
                      placeholder="DELETE"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      autoFocus
                      required
                      style={{
                        marginTop: 6,
                        border: "1px solid rgba(239, 68, 68, 0.4)",
                      }}
                    />
                  </label>
                ) : (
                  <label>
                    Enter your current account password:
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={deleteConfirmPassword}
                      onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                      autoFocus
                      required
                      style={{ marginTop: 6 }}
                    />
                  </label>
                )}

                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    style={{
                      background: "#ef4444",
                      color: "#ffffff",
                    }}
                    disabled={deleteLoading}
                  >
                    {deleteLoading
                      ? "Deleting Account..."
                      : "Permanently Delete Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   MAIN APP CONTAINER
   ========================================================================== */

function normalizeTransaction(tx) {
  return { ...tx, id: tx.id || tx._id };
}

function normalizeEvent(event) {
  return { ...event, id: event.id || event._id };
}

function normalizeLoan(loan) {
  return { ...loan, id: loan.id || loan._id };
}

function normalizeGoal(goal) {
  return {
    ...goal,
    id: goal.id || goal._id,
    name: goal.name || goal.title || "Goal",
    icon: goal.icon || "🎯",
    category: goal.category || "Personal",
    target: Number(goal.target ?? goal.targetAmount ?? 0),
    saved: Number(goal.saved ?? goal.currentAmount ?? 0),
    date: goal.date || goal.deadline || "",
  };
}

function App() {
  const [currentUser, setCurrentUser] = useState(() =>
    loadLocal("pace_active_user", null),
  );

  // When logged out, render the AuthScreen
  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={(user) => {
          saveLocal("pace_active_user", user);
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <AuthenticatedApp
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
    />
  );
}

function AuthenticatedApp({ currentUser, setCurrentUser }) {
  const userKey = `pace_usr_${currentUser.id}`;

  const [transactions, setTransactions] = useState(() =>
    loadLocal(`${userKey}_transactions`, []),
  );

  const [goals, setGoals] = useState(() =>
    loadLocal(`${userKey}_goals`, []).map((goal) => ({
      ...goal,
      category: goal.category || "Personal",
    })),
  );

  const [events, setEvents] = useState(() =>
    loadLocal(`${userKey}_events`, []),
  );

  const [loans, setLoans] = useState(() => loadLocal(`${userKey}_loans`, []));

  const [monthlyBudget, setMonthlyBudget] = useState(() =>
    Number(loadLocal(`${userKey}_monthly-budget`, defaultBudget)),
  );

  const [categoryBudgets, setCategoryBudgets] = useState(() =>
    loadLocal(`${userKey}_category-budgets`, {}),
  );

  const [guardThreshold, setGuardThreshold] = useState(() =>
    Number(loadLocal(`${userKey}_guard-threshold`, defaultGuardThreshold)),
  );

  // Month-aware financial state
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => toMonthKey());

  const [activePage, setActivePage] = useState("home");
  const [previousPage, setPreviousPage] = useState("home");

  const [showTxModal, setShowTxModal] = useState(false);
  const [initialTxData, setInitialTxData] = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);

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

  useEffect(
    () => saveLocal(`${userKey}_transactions`, transactions),
    [userKey, transactions],
  );
  useEffect(() => saveLocal(`${userKey}_goals`, goals), [userKey, goals]);
  useEffect(() => saveLocal(`${userKey}_events`, events), [userKey, events]);
  useEffect(() => saveLocal(`${userKey}_loans`, loans), [userKey, loans]);
  useEffect(
    () => saveLocal(`${userKey}_monthly-budget`, monthlyBudget),
    [userKey, monthlyBudget],
  );
  useEffect(
    () => saveLocal(`${userKey}_category-budgets`, categoryBudgets),
    [userKey, categoryBudgets],
  );
  useEffect(
    () => saveLocal(`${userKey}_guard-threshold`, guardThreshold),
    [userKey, guardThreshold],
  );

  // Sync with backend if logged in
  useEffect(() => {
    if (!getAuthToken()) return;

    apiGetEvents()
      .then((data) => {
        if (Array.isArray(data?.events)) setEvents(data.events.map(normalizeEvent));
      })
      .catch(() => {});

    apiGetLoans()
      .then((data) => {
        if (Array.isArray(data?.loans)) setLoans(data.loans.map(normalizeLoan));
      })
      .catch(() => {});

    apiGetTransactions()
      .then((data) => {
        if (Array.isArray(data?.transactions)) {
          setTransactions(data.transactions.map(normalizeTransaction));
        }
      })
      .catch(() => {});

    apiGetBudget()
      .then((data) => {
        const budget = data?.budget;
        if (budget) {
          setMonthlyBudget(Number(budget.monthlyBudget || 0));
          setCategoryBudgets(budget.categoryBudgets || {});
          setGuardThreshold(Number(budget.guardThreshold || 80));
        } else {
          setMonthlyBudget(0);
          setCategoryBudgets({});
          setGuardThreshold(80);
        }
      })
      .catch(() => {});

    apiGetGoals()
      .then((data) => {
        if (Array.isArray(data?.goals)) setGoals(data.goals.map(normalizeGoal));
      })
      .catch(() => {});
  }, [currentUser.id]);

  function handleLogout() {
    clearAuthToken();
    saveLocal("pace_active_user", null);
    setCurrentUser(null);
  }

  function handleUpdateUser(updatedUser) {
    setCurrentUser(updatedUser);
    saveLocal("pace_active_user", updatedUser);
  }

  function handleResetAccountData() {
    const confirmed = window.confirm(
      "Clear local PACE data on this device? This does not delete your server account or cloud data.",
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

  // Events CRUD
  async function handleAddEvent(newEvent) {
    if (getAuthToken()) {
      try {
        const response = await apiCreateEvent(newEvent);
        const saved = normalizeEvent(response?.event || newEvent);
        setEvents((prev) => [saved, ...prev]);
        return;
      } catch (error) {
        window.alert(error.message || "Failed to create event.");
        return;
      }
    }
    setEvents((prev) => [newEvent, ...prev]);
  }

  async function handleUpdateEvent(updatedEvent) {
    if (getAuthToken()) {
      try {
        const response = await apiUpdateEvent(updatedEvent.id, updatedEvent);
        const saved = normalizeEvent(response?.event || updatedEvent);
        setEvents((prev) =>
          prev.map((event) => (event.id === updatedEvent.id ? saved : event)),
        );
        return;
      } catch (error) {
        window.alert(error.message || "Failed to update event.");
        return;
      }
    }
    setEvents((prev) =>
      prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
    );
  }

  async function handleDeleteEvent(id) {
    if (getAuthToken()) {
      try {
        await apiDeleteEvent(id);
      } catch (error) {
        window.alert(error.message || "Failed to delete event.");
        return;
      }
    }
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }

  // Loans CRUD
  async function handleAddLoan(newLoan) {
    if (getAuthToken()) {
      try {
        const response = await apiCreateLoan(newLoan);
        const saved = normalizeLoan(response?.loan || newLoan);
        setLoans((prev) => [saved, ...prev]);
        return;
      } catch (error) {
        window.alert(error.message || "Failed to create loan.");
        return;
      }
    }
    setLoans((prev) => [newLoan, ...prev]);
  }

  async function handleUpdateLoan(updatedLoan) {
    if (getAuthToken()) {
      try {
        const response = await apiUpdateLoan(updatedLoan.id, updatedLoan);
        const saved = normalizeLoan(response?.loan || updatedLoan);
        setLoans((prev) =>
          prev.map((loan) => (loan.id === updatedLoan.id ? saved : loan)),
        );
        return;
      } catch (error) {
        window.alert(error.message || "Failed to update loan.");
        return;
      }
    }
    setLoans((prev) =>
      prev.map((loan) => (loan.id === updatedLoan.id ? updatedLoan : loan)),
    );
  }

  async function handleDeleteLoan(id) {
    if (getAuthToken()) {
      try {
        await apiDeleteLoan(id);
      } catch (error) {
        window.alert(error.message || "Failed to delete loan.");
        return;
      }
    }
    setLoans((prev) => prev.filter((loan) => loan.id !== id));
  }

  // Central monthly financial engine
  const currentMonthTransactions = useMemo(
    () =>
      transactions.filter((item) => isDateInMonth(item.date, selectedMonthKey)),
    [transactions, selectedMonthKey],
  );

  const monthlyFinances = useMemo(
    () =>
      calculateMonthlyFinances(transactions, selectedMonthKey, monthlyBudget),
    [transactions, selectedMonthKey, monthlyBudget],
  );

  const categoryBudgetAlerts = useMemo(() => {
    return EXPENSE_CATEGORIES.map((category) => {
      const limit = Number(categoryBudgets[category] || 0);

      if (limit <= 0) return null;

      const spent = currentMonthTransactions
        .filter(
          (transaction) =>
            transaction.type === "expense" && transaction.category === category,
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
    (item) => item.overLimit,
  );

  const nearLimitCategories = categoryBudgetAlerts.filter(
    (item) => item.percentage >= 80 && !item.overLimit,
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

  async function handleSaveTransaction(newTx) {
    const editingId = initialTxData?.id;

    if (editingId && getAuthToken()) {
      try {
        const response = await apiUpdateTransaction(editingId, newTx);
        const saved = normalizeTransaction(response?.transaction || newTx);
        setTransactions((prev) =>
          prev.map((tx) => (tx.id === editingId ? saved : tx)),
        );
      } catch (error) {
        window.alert(error.message || "Failed to update transaction.");
      }
      return;
    }

    if (getAuthToken()) {
      try {
        const response = await apiCreateTransaction(newTx);
        const saved = normalizeTransaction(response?.transaction || newTx);
        setTransactions((prev) => [saved, ...prev]);
      } catch (error) {
        window.alert(error.message || "Failed to save transaction.");
      }
      return;
    }

    setTransactions((prev) => [newTx, ...prev]);
  }

  function handleImportStatementTransactions(imported) {
    if (!Array.isArray(imported) || imported.length === 0) return;

    const formatted = imported.map((item) => {
      const type = item.type || "expense";
      const cat = item.category || "Other";
      return {
        id:
          "tx_imp_" +
          Date.now() +
          "_" +
          Math.random().toString(36).substring(2, 6),
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

    if (currentUser?.id && getAuthToken()) {
      apiBulkAddTransactions(formatted).catch(() => {});
    }

    setShowStatementModal(false);
  }

  function deleteTransaction(id) {
    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) return;

    setTransactions((previous) =>
      previous.filter((transaction) => transaction.id !== id),
    );

    if (getAuthToken()) {
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

  async function saveGoal(event) {
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

    const payload = {
      title: goalForm.name.trim(),
      targetAmount: target,
      currentAmount: saved,
      deadline: goalForm.date || "",
      category: goalForm.category || "Personal",
    };

    try {
      if (editingGoalId !== null && getAuthToken()) {
        const response = await apiUpdateGoal(editingGoalId, payload);
        const updated = normalizeGoal(response?.goal || { ...payload, id: editingGoalId });
        setGoals((previous) =>
          previous.map((goal) => (goal.id === editingGoalId ? updated : goal)),
        );
      } else if (getAuthToken()) {
        const response = await apiCreateGoal(payload);
        const created = normalizeGoal(response?.goal || { ...payload, id: Date.now() });
        setGoals((previous) => [created, ...previous]);
      } else {
        setGoals((previous) => [
          ...previous,
          {
            id: Date.now(),
            name: payload.title,
            icon: goalForm.icon || "🎯",
            category: payload.category,
            target,
            saved,
            date: payload.deadline,
          },
        ]);
      }

      closeGoalForm();
    } catch (error) {
      window.alert(error.message || "Failed to save goal.");
    }
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
      "Are you sure you want to delete this goal?",
    );

    if (!confirmed) return;

    setGoals((previous) => previous.filter((goal) => goal.id !== id));
    if (getAuthToken()) {
      apiDeleteGoal(id).catch(() => {});
    }
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
      case "add":
        return (
          <AddPage
            navigateTo={navigateTo}
            openTransactionForm={openTransactionForm}
            openNewGoalForm={openNewGoalForm}
          />
        );
      case "savings":
        return (
          <SavingsPage
            transactions={transactions}
            goals={goals}
            openTransactionForm={openTransactionForm}
            navigateTo={navigateTo}
          />
        );
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
            onOpenStatementImport={() => setShowStatementModal(true)}
            deleteTransaction={deleteTransaction}
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
                ? Math.round(
                    monthlyFinances.actualSpending /
                      Math.max(
                        1,
                        currentMonthTransactions.length
                          ? currentMonthTransactions.length
                          : 1,
                      ),
                  )
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
      case "monthly-review":
        return (
          <MonthlyReviewPage
            selectedMonthKey={selectedMonthKey}
            setSelectedMonthKey={setSelectedMonthKey}
            transactions={transactions}
            events={events}
            loans={loans}
            goals={goals}
            monthlyBudget={monthlyBudget}
            categoryBudgets={categoryBudgets}
            onBack={handleBack}
            openTransactionForm={openTransactionForm}
          />
        );
      case "settings":
        return (
          <SettingsPage
            currentUser={currentUser}
            transactions={transactions}
            goals={goals}
            events={events}
            loans={loans}
            onLogout={handleLogout}
            onResetAccountData={handleResetAccountData}
            onBack={handleBack}
            onUpdateUser={handleUpdateUser}
          />
        );
      default:
        return (
          <HomePage
            currentUser={currentUser}
            monthlyFinances={monthlyFinances}
            goals={goals}
            loans={loans}
            transactions={transactions}
            navigateTo={navigateTo}
          />
        );
    }
  }

  return (
    <div className="app">
      <main>{renderPage()}</main>

      <nav className="bottom-nav" aria-label="Primary navigation">
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
          onClick={() => navigateTo("add")}
          aria-label="Add"
        >
          <span>+</span>
          <small>Add</small>
        </button>

        <NavItem
          icon="◫"
          label="Events"
          active={activePage === "events"}
          onClick={() => navigateTo("events")}
        />

        <NavItem
          icon="⚙"
          label="Settings"
          active={activePage === "settings"}
          onClick={() => navigateTo("settings")}
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

              <button
                className="close-btn"
                type="button"
                onClick={closeGoalForm}
              >
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

      <StatementImportModal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        onImportTransactions={handleImportStatementTransactions}
      />
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
          <button
            className="goal-edit"
            type="button"
            onClick={() => onEdit(goal)}
          >
            ✏️ Edit
          </button>
          <button
            className="goal-delete"
            type="button"
            onClick={() => onDelete(goal.id)}
          >
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Transaction({ transaction, onEdit, onDelete, detailed = false }) {
  const isPositive = transaction.type === "income";
  const typeClass = transaction.type || "expense";

  return (
    <div className="transaction">
      <div className="transaction-left">
        <div className={`transaction-icon tx-icon-${typeClass}`}>
          {transaction.icon || "💳"}
        </div>

        <div className="transaction-info">
          <div className="tx-title-row">
            <strong>{transaction.title}</strong>
            {transaction.eventId && (
              <span className="tx-badge event-badge">💍 Event</span>
            )}
            {transaction.loanId && (
              <span className="tx-badge loan-badge">🏠 Loan</span>
            )}
          </div>

          <small>
            <span className={`tx-type-tag ${typeClass}`}>
              {typeClass.replace("_", " ")}
            </span>
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
          {isPositive
            ? "+"
            : transaction.type === "transfer" ||
                transaction.type === "cash_withdrawal"
              ? "• "
              : "-"}
          {formatCurrency(transaction.amount)}
        </strong>

        {onEdit && (
          <button
            className="transaction-edit"
            type="button"
            onClick={() => onEdit(transaction)}
            aria-label={`Edit ${transaction.title}`}
          >
            ✎
          </button>
        )}
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
      {action && (
        <button type="button" onClick={onAction}>
          {action}
        </button>
      )}
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
