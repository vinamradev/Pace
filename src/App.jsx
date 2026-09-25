import { useEffect, useState } from "react";
import "./App.css";

const initialTransactions = [
  {
    id: 1,
    icon: "🍔",
    title: "Zomato",
    category: "Food",
    amount: 420,
    type: "expense",
    time: "Today, 1:20 PM",
  },
  {
    id: 2,
    icon: "🛒",
    title: "Blinkit",
    category: "Groceries",
    amount: 680,
    type: "expense",
    time: "Today, 10:15 AM",
  },
  {
    id: 3,
    icon: "☕",
    title: "Starbucks",
    category: "Food",
    amount: 280,
    type: "expense",
    time: "Yesterday, 6:42 PM",
  },
  {
    id: 4,
    icon: "💰",
    title: "Salary",
    category: "Income",
    amount: 42000,
    type: "income",
    time: "24 Sep, 10:00 AM",
  },
];

function App() {
  // =============================
  // STATE
  // =============================

  const [transactions, setTransactions] = useState(() => {
    try {
      const savedTransactions = localStorage.getItem(
        "pace-transactions"
      );

      if (savedTransactions) {
        return JSON.parse(savedTransactions);
      }

      return initialTransactions;
    } catch (error) {
      console.error(
        "Failed to load transactions:",
        error
      );

      return initialTransactions;
    }
  });

  const [showForm, setShowForm] = useState(false);

  const [activePage, setActivePage] = useState("Home");

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "Food",
    type: "expense",
  });

  // =============================
  // SAVE TRANSACTIONS
  // =============================

  useEffect(() => {
    try {
      localStorage.setItem(
        "pace-transactions",
        JSON.stringify(transactions)
      );
    } catch (error) {
      console.error(
        "Failed to save transactions:",
        error
      );
    }
  }, [transactions]);

  // =============================
  // CALCULATIONS
  // =============================

  const expenses = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense"
    )
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  const income = transactions
    .filter(
      (transaction) =>
        transaction.type === "income"
    )
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0
    );

  const budget = 30000;

  const remaining = budget - expenses;

  const safeToSpend = Math.max(
    Math.floor(remaining / 6),
    0
  );

  const budgetPercentage = Math.min(
    Math.max(
      Math.round((expenses / budget) * 100),
      0
    ),
    100
  );

  const availableMoney = Math.max(
    income - expenses,
    0
  );

  const savingsPercentage =
    income > 0
      ? Math.round(
        (availableMoney / income) * 100
      )
      : 0;

  // =============================
  // FORM INPUT
  // =============================

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  // =============================
  // ADD TRANSACTION
  // =============================

  function addTransaction(event) {
    event.preventDefault();

    const title = formData.title.trim();

    const amount = Number(formData.amount);

    if (!title) {
      alert("Please enter a transaction name.");
      return;
    }

    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const newTransaction = {
      id: Date.now(),

      icon:
        formData.type === "income"
          ? "💰"
          : "💳",

      title,

      category: formData.category,

      amount,

      type: formData.type,

      time: "Just now",
    };

    setTransactions((previousTransactions) => [
      newTransaction,
      ...previousTransactions,
    ]);

    setFormData({
      title: "",
      amount: "",
      category: "Food",
      type: "expense",
    });

    setShowForm(false);
  }

  // =============================
  // DELETE TRANSACTION
  // =============================

  function deleteTransaction(id) {
    setTransactions((previousTransactions) =>
      previousTransactions.filter(
        (transaction) =>
          transaction.id !== id
      )
    );
  }

  // =============================
  // RESET DEMO DATA
  // =============================

  function resetTransactions() {
    const confirmed = window.confirm(
      "Reset all transactions to demo data?"
    );

    if (!confirmed) {
      return;
    }

    setTransactions(initialTransactions);
  }

  // =============================
  // UI
  // =============================

  return (
    <main className="app">

      {/* HEADER */}

      <header className="header">

        <div>
          <h1 className="logo">
            PACE
          </h1>

          <p className="tagline">
            Spend with intention. Save with
            purpose.
          </p>
        </div>

        <button className="profile-btn">
          VK
        </button>

      </header>


      {/* =========================
          HOME
      ========================== */}

      {activePage === "Home" && (
        <>
          {/* SAFE TO SPEND */}

          <section className="safe-card">

            <p className="eyebrow">
              SAFE TO SPEND TODAY
            </p>

            <h2>
              ₹
              {safeToSpend.toLocaleString(
                "en-IN"
              )}
            </h2>

            <p className="safe-text">
              {remaining > 0
                ? "You're currently within your budget."
                : "You've crossed your monthly budget."}
            </p>

            <div className="progress">

              <div
                className="progress-bar"
                style={{
                  width: `${budgetPercentage}%`,
                }}
              />

            </div>

            <div className="progress-info">

              <span>
                ₹
                {expenses.toLocaleString(
                  "en-IN"
                )}{" "}
                spent
              </span>

              <span>
                ₹
                {budget.toLocaleString(
                  "en-IN"
                )}{" "}
                budget
              </span>

            </div>

          </section>


          {/* STATS */}

          <section className="stats">

            <div className="stat-card">

              <span>
                Spent
              </span>

              <strong>
                ₹
                {expenses.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <small>
                This month
              </small>

            </div>


            <div className="stat-card">

              <span>
                Income
              </span>

              <strong>
                ₹
                {income.toLocaleString(
                  "en-IN"
                )}
              </strong>

              <small>
                This month
              </small>

            </div>

          </section>


          {/* SAVINGS */}

          <section className="saving-card">

            <div>

              <span>
                Available after spending
              </span>

              <strong>
                ₹
                {availableMoney.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

            <div className="saving-circle">
              {savingsPercentage}%
            </div>

          </section>


          {/* ALERT */}

          <section className="alert-card">

            <div className="alert-icon">
              !
            </div>

            <div>

              <h3>
                Spending Alert
              </h3>

              <p>
                Food and shopping are taking
                a large portion of your
                monthly spending.
              </p>

            </div>

          </section>


          {/* RECENT ACTIVITY */}

          <section className="transactions">

            <div className="section-header">

              <h2>
                Recent Activity
              </h2>

              <button
                onClick={() =>
                  setActivePage("Activity")
                }
              >
                View all
              </button>

            </div>


            {transactions.length === 0 ? (
              <EmptyState />
            ) : (
              transactions
                .slice(0, 5)
                .map((transaction) => (
                  <Transaction
                    key={transaction.id}
                    transaction={transaction}
                    onDelete={
                      deleteTransaction
                    }
                  />
                ))
            )}

          </section>

        </>
      )}


      {/* =========================
          ACTIVITY
      ========================== */}

      {activePage === "Activity" && (
        <section className="page">

          <div className="page-title">

            <span>
              TRANSACTIONS
            </span>

            <h2>
              All Activity
            </h2>

          </div>


          {transactions.length === 0 ? (
            <EmptyState />
          ) : (
            transactions.map(
              (transaction) => (
                <Transaction
                  key={transaction.id}
                  transaction={transaction}
                  onDelete={
                    deleteTransaction
                  }
                />
              )
            )
          )}

        </section>
      )}


      {/* =========================
          GOALS
      ========================== */}

      {activePage === "Goals" && (
        <section className="page">

          <div className="page-title">

            <span>
              YOUR MONEY
            </span>

            <h2>
              Savings Goals
            </h2>

          </div>


          <div className="goal-card">

            <div className="goal-top">

              <div>

                <span>
                  🎯
                </span>

                <h3>
                  Emergency Fund
                </h3>

              </div>

              <strong>
                42%
              </strong>

            </div>


            <div className="goal-progress">
              <div />
            </div>


            <div className="goal-info">

              <span>
                ₹42,000 saved
              </span>

              <span>
                ₹1,00,000 goal
              </span>

            </div>

          </div>


          <div className="goal-card">

            <div className="goal-top">

              <div>

                <span>
                  ✈️
                </span>

                <h3>
                  Travel
                </h3>

              </div>

              <strong>
                28%
              </strong>

            </div>


            <div className="goal-progress">

              <div className="travel-progress" />

            </div>


            <div className="goal-info">

              <span>
                ₹14,000 saved
              </span>

              <span>
                ₹50,000 goal
              </span>

            </div>

          </div>

        </section>
      )}


      {/* =========================
          MORE
      ========================== */}

      {activePage === "More" && (
        <section className="page">

          <div className="page-title">

            <span>
              PACE
            </span>

            <h2>
              More
            </h2>

          </div>


          <div className="menu-list">

            <button>
              <span>
                📊 Budgets
              </span>

              <span>
                ›
              </span>
            </button>


            <button>
              <span>
                🛡️ Spending Guard
              </span>

              <span>
                ›
              </span>
            </button>


            <button>
              <span>
                💡 Insights
              </span>

              <span>
                ›
              </span>
            </button>


            <button>
              <span>
                ⚙️ Settings
              </span>

              <span>
                ›
              </span>
            </button>


            <button
              onClick={resetTransactions}
            >
              <span>
                🔄 Reset Demo Data
              </span>

              <span>
                ›
              </span>
            </button>

          </div>

        </section>
      )}


      {/* =========================
          ADD TRANSACTION MODAL
      ========================== */}

      {showForm && (
        <div
          className="modal-overlay"
          onClick={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              setShowForm(false);
            }

          }}
        >

          <div className="modal">

            <div className="modal-header">

              <div>

                <span>
                  PACE
                </span>

                <h2>
                  Add Transaction
                </h2>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="close-btn"
              >
                ×
              </button>

            </div>


            <form
              onSubmit={addTransaction}
            >

              <label>
                Transaction name
              </label>

              <input
                type="text"
                name="title"
                placeholder="e.g. Zomato"
                value={formData.title}
                onChange={
                  handleInputChange
                }
              />


              <label>
                Amount
              </label>

              <input
                type="number"
                name="amount"
                min="1"
                placeholder="₹ 0"
                value={formData.amount}
                onChange={
                  handleInputChange
                }
              />


              <label>
                Category
              </label>

              <select
                name="category"
                value={formData.category}
                onChange={
                  handleInputChange
                }
              >

                <option value="Food">
                  Food
                </option>

                <option value="Groceries">
                  Groceries
                </option>

                <option value="Shopping">
                  Shopping
                </option>

                <option value="Travel">
                  Travel
                </option>

                <option value="Bills">
                  Bills
                </option>

                <option value="Subscriptions">
                  Subscriptions
                </option>

                <option value="Health">
                  Health
                </option>

                <option value="Other">
                  Other
                </option>

              </select>


              <label>
                Type
              </label>


              <div className="type-selector">

                <button
                  type="button"
                  className={
                    formData.type ===
                      "expense"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setFormData(
                      (previousData) => ({
                        ...previousData,
                        type: "expense",
                      })
                    )
                  }
                >
                  Expense
                </button>


                <button
                  type="button"
                  className={
                    formData.type ===
                      "income"
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setFormData(
                      (previousData) => ({
                        ...previousData,
                        type: "income",
                      })
                    )
                  }
                >
                  Income
                </button>

              </div>


              <button
                className="submit-btn"
                type="submit"
              >
                Add Transaction
              </button>

            </form>

          </div>

        </div>
      )}


      {/* =========================
          BOTTOM NAVIGATION
      ========================== */}

      <nav className="bottom-nav">

        <NavItem
          icon="⌂"
          label="Home"
          active={
            activePage === "Home"
          }
          onClick={() =>
            setActivePage("Home")
          }
        />


        <NavItem
          icon="↕"
          label="Activity"
          active={
            activePage === "Activity"
          }
          onClick={() =>
            setActivePage("Activity")
          }
        />


        <button
          className="add-btn"
          onClick={() =>
            setShowForm(true)
          }
        >
          +
        </button>


        <NavItem
          icon="◎"
          label="Goals"
          active={
            activePage === "Goals"
          }
          onClick={() =>
            setActivePage("Goals")
          }
        />


        <NavItem
          icon="☰"
          label="More"
          active={
            activePage === "More"
          }
          onClick={() =>
            setActivePage("More")
          }
        />

      </nav>

    </main>
  );
}


/* =============================
   TRANSACTION COMPONENT
============================= */

function Transaction({
  transaction,
  onDelete,
}) {

  const {
    id,
    icon,
    title,
    category,
    amount,
    type,
    time,
  } = transaction;

  return (
    <div className="transaction">

      <div className="transaction-icon">
        {icon}
      </div>


      <div className="transaction-info">

        <h3>
          {title}
        </h3>

        <p>
          {category} · {time}
        </p>

      </div>


      <strong
        className={
          type === "income"
            ? "income"
            : ""
        }
      >

        {type === "income"
          ? "+"
          : "-"}

        ₹
        {Number(amount).toLocaleString(
          "en-IN"
        )}

      </strong>


      <button
        className="delete-btn"
        onClick={() =>
          onDelete(id)
        }
        aria-label="Delete transaction"
      >
        ×
      </button>

    </div>
  );
}


/* =============================
   NAV ITEM COMPONENT
============================= */

function NavItem({
  icon,
  label,
  active,
  onClick,
}) {

  return (
    <button
      className={`nav-item ${active ? "active" : ""
        }`}
      onClick={onClick}
    >

      <span>
        {icon}
      </span>

      <small>
        {label}
      </small>

    </button>
  );
}


/* =============================
   EMPTY STATE
============================= */

function EmptyState() {

  return (
    <div className="empty-state">

      <div className="empty-icon">
        +
      </div>

      <h3>
        No transactions yet
      </h3>

      <p>
        Add your first transaction
        using the + button.
      </p>

    </div>
  );
}


export default App;