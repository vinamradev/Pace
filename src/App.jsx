import { useEffect, useMemo, useState } from "react";
import "./App.css";

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

function getDemoTransactions() {
  return [
    {
      id: 1,
      title: "Zomato",
      category: "Food",
      amount: 320,
      type: "expense",
      date: getDemoDate(0),
      icon: "🍔",
      paymentMethod: "UPI",
      note: "",
    },
    {
      id: 2,
      title: "Blinkit",
      category: "Shopping",
      amount: 540,
      type: "expense",
      date: getDemoDate(1),
      icon: "🛒",
      paymentMethod: "UPI",
      note: "",
    },
    {
      id: 3,
      title: "Starbucks",
      category: "Food",
      amount: 280,
      type: "expense",
      date: getDemoDate(2),
      icon: "☕",
      paymentMethod: "UPI",
      note: "",
    },
    {
      id: 4,
      title: "Salary",
      category: "Income",
      amount: 30000,
      type: "income",
      date: getDemoMonthStart(),
      icon: "💰",
      paymentMethod: "Bank Transfer",
      note: "",
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
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupBudget, setSignupBudget] = useState("20000");

  const [error, setError] = useState("");

  function handleLoginSubmit(event) {
    event.preventDefault();
    setError("");

    if (!loginEmail.trim() || !loginPassword) {
      setError("Please fill in your email and password.");
      return;
    }

    const users = loadLocal("pace_users", []);
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === loginEmail.trim().toLowerCase() &&
        u.password === loginPassword
    );

    if (!user) {
      setError("Invalid email or password. Please try again or create an account.");
      return;
    }

    onLogin(user);
  }

  function handleSignupSubmit(event) {
    event.preventDefault();
    setError("");

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

    if (password.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    const users = loadLocal("pace_users", []);
    if (users.some((u) => u.email.toLowerCase() === email)) {
      setError("An account with this email already exists. Please log in.");
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

    // Initialize clean fresh state for the new user
    saveLocal(`pace_${newUser.id}_transactions`, []);
    saveLocal(`pace_${newUser.id}_goals`, []);
    saveLocal(`pace_${newUser.id}_monthly-budget`, budget);
    saveLocal(`pace_${newUser.id}_category-budgets`, {});
    saveLocal(`pace_${newUser.id}_guard-threshold`, 80);

    onLogin(newUser);
  }

  return (
    <div className="auth-page">
      <div className="auth-header">
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
            }}
          >
            Create Account
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {tab === "login" ? (
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
              Password
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
        ) : (
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
              Password
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
  guardActive,
  budgetUsed,
  safeToSpendToday,
  totalExpenses,
  monthlyBudget,
  totalIncome,
  remainingBudget,
  currentSavings,
  savingsRate,
  overLimitCategories,
  nearLimitCategories,
  categoryBudgetAlerts,
  goals,
  transactions,
  setActivePage,
  openNewGoalForm,
  editGoal,
  deleteGoal,
  openTransactionForm,
  deleteTransaction,
}) {
  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "P";

  return (
    <div className="page-content">
      <header className="header">
        <div>
          <h1 className="logo">PACE</h1>
          <p className="tagline">Welcome, {currentUser?.name || "Friend"}</p>
        </div>

        <button
          className="profile-btn"
          onClick={() => setActivePage("settings")}
          aria-label="Open settings"
        >
          {userInitial}
        </button>
      </header>

      <section className="safe-card">
        <div className="safe-badge">
          <span className="pulse-dot" />
          <span>SAFE TO SPEND TODAY</span>
        </div>
        <h2>{formatCurrency(safeToSpendToday)}</h2>
        <p className="safe-text">Based on your remaining monthly budget</p>

        <div className="progress">
          <div
            className="progress-bar safe-progress-bar"
            style={{ width: `${budgetUsed}%` }}
          />
        </div>

        <div className="progress-info">
          <span>Budget used ({budgetUsed.toFixed(0)}%)</span>
          <span>{formatCurrency(Math.max(remainingBudget, 0))} remaining</span>
        </div>
      </section>

      <div className="stats">
        <StatCard label="Spent" value={totalExpenses} hint="This month" type="spent" />
        <StatCard label="Budget" value={monthlyBudget} hint="Monthly limit" type="budget" />
        <StatCard label="Income" value={totalIncome} hint="This month" type="income" />
        <StatCard
          label="Remaining"
          value={Math.max(remainingBudget, 0)}
          hint={remainingBudget < 0 ? "Over budget" : "Budget left"}
          type={remainingBudget < 0 ? "over" : "remaining"}
        />
      </div>

      <div className="saving-card">
        <div>
          <span>Current savings</span>
          <strong>{formatCurrency(currentSavings)}</strong>
        </div>

        <div className="saving-circle">{savingsRate.toFixed(0)}%</div>
      </div>

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
              : "You're on track"}
          </h3>

          <p>
            {overLimitCategories.length > 0
              ? `${formatCurrency(
                  overLimitCategories[0].spent
                )} spent against a ${formatCurrency(
                  overLimitCategories[0].limit
                )} limit.`
              : guardActive
              ? `You've used ${budgetUsed.toFixed(0)}% of your monthly budget.`
              : nearLimitCategories.length > 0
              ? `${nearLimitCategories[0].category} is at ${nearLimitCategories[0].percentage.toFixed(
                  0
                )}% of its limit.`
              : `You have ${formatCurrency(
                  Math.max(remainingBudget, 0)
                )} left in your monthly budget.`}
          </p>
        </div>
      </div>

      <section className="section">
        <div className="section-heading">
          <h2>Category Budgets</h2>
          <button className="text-btn" onClick={() => setActivePage("budgets")}>
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
            <button onClick={() => setActivePage("budgets")}>
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
                  className={`dashboard-category-budget ${
                    item.overLimit ? "over-budget" : ""
                  }`}
                  key={item.category}
                >
                  <div className="dashboard-category-top">
                    <div className="dashboard-category-name">
                      <span>{CATEGORY_ICONS[item.category] || "💳"}</span>
                      <div>
                        <strong>{item.category}</strong>
                        <small>
                          {formatCurrency(item.spent)} spent of{" "}
                          {formatCurrency(item.limit)}
                        </small>
                      </div>
                    </div>
                    <strong>{percentage.toFixed(0)}%</strong>
                  </div>

                  <div className="progress">
                    <div
                      className="progress-bar"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="dashboard-category-bottom">
                    <span>
                      {item.overLimit
                        ? `${formatCurrency(item.spent - item.limit)} over limit`
                        : `${formatCurrency(
                            Math.max(item.limit - item.spent, 0)
                          )} left`}
                    </span>
                    <span>{formatCurrency(item.spent)} spent</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Your Goals</h2>
          <button className="text-btn" onClick={() => setActivePage("goals")}>
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

      <section className="transactions">
        <div className="section-header">
          <h2>Recent Transactions</h2>
          <button onClick={() => setActivePage("activity")}>View all →</button>
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
            .slice(0, 5)
            .map((transaction) => (
              <Transaction
                key={transaction.id}
                transaction={transaction}
                onDelete={deleteTransaction}
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
}) {
  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Activity</h2>
          <p>All your transactions.</p>
        </div>

        <button className="goal-add-btn" onClick={openTransactionForm}>
          + Add
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

        <div className="filter-row">
          <button
            className={
              activityType === "all" ? "filter-chip active" : "filter-chip"
            }
            onClick={() => setActivityType("all")}
          >
            All
          </button>
          <button
            className={
              activityType === "expense" ? "filter-chip active" : "filter-chip"
            }
            onClick={() => setActivityType("expense")}
          >
            Expenses
          </button>
          <button
            className={
              activityType === "income" ? "filter-chip active" : "filter-chip"
            }
            onClick={() => setActivityType("income")}
          >
            Income
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

        <button className="goal-add-btn" onClick={openNewGoalForm}>
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
  setActivePage,
}) {
  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Budgets</h2>
          <p>Give every month a spending boundary.</p>
        </div>
        <button className="back-btn" onClick={() => setActivePage("home")}>
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
  setActivePage,
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
        <button className="back-btn" onClick={() => setActivePage("home")}>
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
  setActivePage,
}) {
  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Insights</h2>
          <p>A quick read of your current month.</p>
        </div>
        <button className="back-btn" onClick={() => setActivePage("home")}>
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
  setActivePage,
}) {
  return (
    <div className="page-content page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Settings</h2>
          <p>Manage your account and preferences.</p>
        </div>
        <button className="back-btn" onClick={() => setActivePage("home")}>
          ← Back
        </button>
      </div>

      <div className="settings-card">
        <div className="settings-row">
          <div>
            <strong>Account</strong>
            <small>{currentUser?.email || "Guest"}</small>
          </div>
          <span className="status-dot">{currentUser?.name || "User"}</span>
        </div>

        <div className="settings-row">
          <div>
            <strong>Transactions</strong>
            <small>{transactions.length} saved transactions</small>
          </div>
          <span className="settings-value">↕</span>
        </div>

        <div className="settings-row">
          <div>
            <strong>Goals</strong>
            <small>{goals.length} saved goals</small>
          </div>
          <span className="settings-value">◎</span>
        </div>

        <div className="settings-row">
          <div>
            <strong>Storage</strong>
            <small>Local offline PWA storage</small>
          </div>
          <span className="status-dot">Active</span>
        </div>
      </div>

      <div className="danger-card">
        <div>
          <strong>Reset account data</strong>
          <small>
            Clears all transactions and goals for this account.
          </small>
        </div>

        <button onClick={onResetAccountData}>Clear</button>
      </div>

      <div className="settings-card" style={{ marginTop: "14px" }}>
        <div className="settings-row">
          <div>
            <strong>Demo sample data</strong>
            <small>Populate sample transactions and goals.</small>
          </div>
          <button className="text-btn" onClick={onLoadDemoData}>
            Load Demo
          </button>
        </div>
      </div>

      <button className="logout-btn" onClick={onLogout}>
        Log Out ({currentUser?.name || "Account"})
      </button>
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

  const [monthlyBudget, setMonthlyBudget] = useState(() =>
    Number(loadLocal(`${userKey}_monthly-budget`, defaultBudget))
  );

  const [categoryBudgets, setCategoryBudgets] = useState(() =>
    loadLocal(`${userKey}_category-budgets`, {})
  );

  const [guardThreshold, setGuardThreshold] = useState(() =>
    Number(loadLocal(`${userKey}_guard-threshold`, defaultGuardThreshold))
  );

  const [activePage, setActivePage] = useState("home");
  const [showForm, setShowForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "Food",
    amount: "",
    type: "expense",
    paymentMethod: "UPI",
    date: toDateKey(),
    note: "",
  });

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

  function handleLogout() {
    saveLocal("pace_active_user", null);
    setCurrentUser(null);
  }

  function handleResetAccountData() {
    const confirmed = window.confirm(
      "Reset your account data? All transactions and goals will be cleared."
    );
    if (!confirmed) return;

    setTransactions([]);
    setGoals([]);
    setCategoryBudgets({});
    saveLocal(`${userKey}_transactions`, []);
    saveLocal(`${userKey}_goals`, []);
    saveLocal(`${userKey}_category-budgets`, {});
  }

  function handleLoadDemoData() {
    const demoTx = getDemoTransactions();
    const demoG = getDemoGoals();

    setTransactions(demoTx);
    setGoals(demoG);
    setMonthlyBudget(defaultBudget);
    setCategoryBudgets({});

    saveLocal(`${userKey}_transactions`, demoTx);
    saveLocal(`${userKey}_goals`, demoG);
    saveLocal(`${userKey}_monthly-budget`, defaultBudget);
    saveLocal(`${userKey}_category-budgets`, {});
  }

  const currentMonthTransactions = useMemo(
    () => transactions.filter((item) => isSameMonth(item.date)),
    [transactions]
  );

  const totalIncome = useMemo(
    () =>
      currentMonthTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [currentMonthTransactions]
  );

  const totalExpenses = useMemo(
    () =>
      currentMonthTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [currentMonthTransactions]
  );

  const remainingBudget = monthlyBudget - totalExpenses;
  const budgetUsed =
    monthlyBudget > 0 ? Math.min((totalExpenses / monthlyBudget) * 100, 100) : 0;

  const safeToSpendToday =
    remainingBudget > 0
      ? Math.floor(remainingBudget / daysLeftInMonth())
      : 0;

  const currentSavings = Math.max(totalIncome - totalExpenses, 0);

  const savingsRate =
    totalIncome > 0 ? Math.min((currentSavings / totalIncome) * 100, 100) : 0;

  const topCategory = useMemo(() => {
    const totals = {};

    currentMonthTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        totals[item.category] =
          (totals[item.category] || 0) + Number(item.amount || 0);
      });

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    return sorted[0] || ["None", 0];
  }, [currentMonthTransactions]);

  const averageDailyExpense =
    totalExpenses > 0 ? Math.round(totalExpenses / new Date().getDate()) : 0;

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
          transaction.category.toLowerCase().includes(query) ||
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

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openTransactionForm() {
    setFormData({
      title: "",
      category: "Food",
      amount: "",
      type: "expense",
      paymentMethod: "UPI",
      date: toDateKey(),
      note: "",
    });
    setShowForm(true);
  }

  function closeTransactionForm() {
    setShowForm(false);
  }

  function addTransaction(event) {
    event.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.amount ||
      Number(formData.amount) <= 0
    ) {
      return;
    }

    const amount = Number(formData.amount);

    const newTransaction = {
      id: Date.now(),
      title: formData.title.trim(),
      category: formData.category,
      amount,
      type: formData.type,
      date: formData.date || toDateKey(),
      icon:
        formData.type === "income"
          ? CATEGORY_ICONS[formData.category] || "💰"
          : CATEGORY_ICONS[formData.category] || "💳",
      paymentMethod: formData.paymentMethod,
      note: formData.note.trim(),
    };

    setTransactions((previous) => [newTransaction, ...previous]);
    closeTransactionForm();
  }

  function deleteTransaction(id) {
    const confirmed = window.confirm("Delete this transaction?");

    if (!confirmed) return;

    setTransactions((previous) =>
      previous.filter((transaction) => transaction.id !== id)
    );
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

  const guardActive = budgetUsed >= guardThreshold;

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
            totalExpenses={totalExpenses}
            remainingBudget={remainingBudget}
            categoryBudgets={categoryBudgets}
            currentMonthTransactions={currentMonthTransactions}
            updateCategoryBudget={updateCategoryBudget}
            saveBudgetSettings={saveBudgetSettings}
            setActivePage={setActivePage}
          />
        );
      case "guard":
        return (
          <SpendingGuardPage
            overLimitCategories={overLimitCategories}
            budgetUsed={budgetUsed}
            guardThreshold={guardThreshold}
            setGuardThreshold={setGuardThreshold}
            nearLimitCategories={nearLimitCategories}
            categoryBudgetAlerts={categoryBudgetAlerts}
            setActivePage={setActivePage}
          />
        );
      case "insights":
        return (
          <InsightsPage
            topCategory={topCategory}
            averageDailyExpense={averageDailyExpense}
            savingsRate={savingsRate}
            currentSavings={currentSavings}
            currentMonthTransactions={currentMonthTransactions}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            budgetUsed={budgetUsed}
            setActivePage={setActivePage}
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
            setActivePage={setActivePage}
          />
        );
      default:
        return (
          <HomePage
            currentUser={currentUser}
            guardActive={guardActive}
            budgetUsed={budgetUsed}
            safeToSpendToday={safeToSpendToday}
            totalExpenses={totalExpenses}
            monthlyBudget={monthlyBudget}
            totalIncome={totalIncome}
            remainingBudget={remainingBudget}
            currentSavings={currentSavings}
            savingsRate={savingsRate}
            overLimitCategories={overLimitCategories}
            nearLimitCategories={nearLimitCategories}
            categoryBudgetAlerts={categoryBudgetAlerts}
            goals={goals}
            transactions={transactions}
            setActivePage={setActivePage}
            openNewGoalForm={openNewGoalForm}
            editGoal={editGoal}
            deleteGoal={deleteGoal}
            openTransactionForm={openTransactionForm}
            deleteTransaction={deleteTransaction}
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
          onClick={() => setActivePage("home")}
        />

        <NavItem
          icon="↕"
          label="Activity"
          active={activePage === "activity"}
          onClick={() => setActivePage("activity")}
        />

        <button className="add-btn" onClick={openTransactionForm}>
          +
        </button>

        <NavItem
          icon="◎"
          label="Goals"
          active={activePage === "goals"}
          onClick={() => setActivePage("goals")}
        />

        <NavItem
          icon="☰"
          label="More"
          active={
            activePage === "more" ||
            ["budgets", "guard", "insights", "settings"].includes(activePage)
          }
          onClick={() =>
            setActivePage((prev) => (prev === "more" ? "home" : "more"))
          }
        />
      </nav>

      {activePage === "more" && (
        <>
          <div
            className="more-backdrop"
            onClick={() => setActivePage("home")}
          />
          <div className="more-panel">
            <button onClick={() => setActivePage("budgets")}>
              <span>💰 Budgets</span>
              <span>→</span>
            </button>
            <button onClick={() => setActivePage("guard")}>
              <span>🛡 Spending Guard</span>
              <span>→</span>
            </button>
            <button onClick={() => setActivePage("insights")}>
              <span>📊 Insights</span>
              <span>→</span>
            </button>
            <button onClick={() => setActivePage("settings")}>
              <span>⚙️ Settings</span>
              <span>→</span>
            </button>
          </div>
        </>
      )}

      {showForm && (
        <div className="modal-overlay" onMouseDown={closeTransactionForm}>
          <div
            className="modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-handle" />
            <div className="modal-header">
              <div>
                <span>PACE</span>
                <h2>Add Transaction</h2>
              </div>

              <button className="close-btn" onClick={closeTransactionForm}>
                ×
              </button>
            </div>

            <form onSubmit={addTransaction}>
              <label>
                Title
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Zomato"
                  value={formData.title}
                  onChange={handleInputChange}
                  autoFocus
                />
              </label>

              <label>
                Amount
                <input
                  type="number"
                  name="amount"
                  placeholder="₹0"
                  min="1"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                />
              </label>

              <label>
                Type
                <div className="transaction-type-toggle">
                  <button
                    type="button"
                    className={
                      formData.type === "expense"
                        ? "type-btn active"
                        : "type-btn"
                    }
                    onClick={() =>
                      setFormData((previous) => ({
                        ...previous,
                        type: "expense",
                        category: EXPENSE_CATEGORIES.includes(previous.category)
                          ? previous.category
                          : "Food",
                      }))
                    }
                  >
                    Expense
                  </button>

                  <button
                    type="button"
                    className={
                      formData.type === "income"
                        ? "type-btn active"
                        : "type-btn"
                    }
                    onClick={() =>
                      setFormData((previous) => ({
                        ...previous,
                        type: "income",
                        category: INCOME_CATEGORIES.includes(previous.category)
                          ? previous.category
                          : "Salary",
                      }))
                    }
                  >
                    Income
                  </button>
                </div>
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  {(formData.type === "income"
                    ? INCOME_CATEGORIES
                    : EXPENSE_CATEGORIES
                  ).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-row">
                <label>
                  Payment
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Date
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </label>
              </div>

              <label>
                Note <span className="optional-label">Optional</span>
                <input
                  type="text"
                  name="note"
                  placeholder="What was this for?"
                  value={formData.note}
                  onChange={handleInputChange}
                />
              </label>

              <button className="submit-btn" type="submit">
                Add Transaction
              </button>
            </form>
          </div>
        </div>
      )}

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

              <button className="close-btn" onClick={closeGoalForm}>
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
          <button className="goal-edit" onClick={() => onEdit(goal)}>
            ✏️ Edit
          </button>
          <button className="goal-delete" onClick={() => onDelete(goal.id)}>
            🗑 Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Transaction({ transaction, onDelete, detailed = false }) {
  return (
    <div className="transaction">
      <div className="transaction-left">
        <div className="transaction-icon">{transaction.icon || "💳"}</div>

        <div className="transaction-info">
          <strong>{transaction.title}</strong>

          <small>
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
        <strong className={transaction.type}>
          {transaction.type === "income" ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </strong>

        <button
          className="transaction-delete"
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
      {action && <button onClick={onAction}>{action}</button>}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <span>{icon}</span>
      <small>{label}</small>
    </button>
  );
}

export default App;