import { useMemo } from "react";
import MonthSwitcher from "./MonthSwitcher";
import {
  calculateMonthlyFinances,
  getPreviousMonthKey,
  formatMonthName,
  isDateInMonth,
  toMonthKey,
} from "../utils/financialEngine";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function MonthlyReviewPage({
  selectedMonthKey,
  setSelectedMonthKey,
  transactions = [],
  events = [],
  loans = [],
  monthlyBudget = 0,
  onBack,
  openTransactionForm,
}) {
  const currentMonthFinances = useMemo(
    () => calculateMonthlyFinances(transactions, selectedMonthKey, monthlyBudget),
    [transactions, selectedMonthKey, monthlyBudget]
  );

  const prevMonthKey = getPreviousMonthKey(selectedMonthKey);
  const prevMonthFinances = useMemo(
    () => calculateMonthlyFinances(transactions, prevMonthKey, monthlyBudget),
    [transactions, prevMonthKey, monthlyBudget]
  );

  const currentMonthTx = useMemo(
    () => transactions.filter((t) => isDateInMonth(t.date, selectedMonthKey)),
    [transactions, selectedMonthKey]
  );

  const hasData = currentMonthTx.length > 0;

  // 1. Financial Overview Metrics
  const {
    totalIncome,
    actualSpending,
    totalSavings,
    totalInvestments,
    totalDebtRepayment,
    netAvailableCashFlow,
    majorHeadTotals,
    sortedCategories,
    topCategory,
    budgetUsed,
    remainingBudget,
    savingsRate,
  } = currentMonthFinances;

  // 2. Budget Health Status
  let budgetStatus = "Normal";
  let budgetStatusClass = "normal";
  if (budgetUsed >= 100) {
    budgetStatus = "Over Budget";
    budgetStatusClass = "danger";
  } else if (budgetUsed >= 80) {
    budgetStatus = "Warning";
    budgetStatusClass = "warning";
  } else if (budgetUsed >= 60) {
    budgetStatus = "Attention";
    budgetStatusClass = "attention";
  }

  // 3. Commitments (Loan EMIs, Rent, Subscriptions, Recurring items configured)
  const monthlyCommitments = useMemo(() => {
    const list = [];

    // Active Loans EMIs
    loans.forEach((l) => {
      if (l.status !== "closed") {
        list.push({
          title: `${l.name} (${l.lender || "Loan EMI"})`,
          amount: Number(l.emiAmount || 0),
          type: "Loan EMI",
          icon: l.icon || "🏠",
        });
      }
    });

    // Recurring / Rent / Subscriptions from current month transactions or recurring tags
    const commitmentCategories = ["Rent", "Subscriptions", "Bills", "Insurance"];
    currentMonthTx.forEach((tx) => {
      if (
        tx.isRecurring ||
        commitmentCategories.includes(tx.category) ||
        tx.type === "debt_repayment"
      ) {
        if (!list.some((item) => item.title.toLowerCase() === tx.title.toLowerCase())) {
          list.push({
            title: tx.title,
            amount: Number(tx.amount || 0),
            type: tx.category || "Recurring",
            icon: tx.icon || "💳",
          });
        }
      }
    });

    return list;
  }, [loans, currentMonthTx]);

  // 4. Linked Event Spending for the Month
  const monthEventSpending = useMemo(() => {
    return events.map((ev) => {
      const linkedTx = currentMonthTx.filter(
        (t) => t.eventId === ev.id || t.eventId === ev._id
      );
      const monthSpent = linkedTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const totalLinkedTx = transactions.filter(
        (t) => t.eventId === ev.id || t.eventId === ev._id
      );
      const cumulativeSpent = totalLinkedTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const percentUsed = ev.budget > 0 ? (cumulativeSpent / ev.budget) * 100 : 0;

      return {
        ...ev,
        monthSpent,
        cumulativeSpent,
        percentUsed,
        txCount: linkedTx.length,
      };
    });
  }, [events, currentMonthTx, transactions]);

  // 5. Loan Payments for the Month
  const monthLoanPayments = useMemo(() => {
    return loans.map((ln) => {
      const linkedTx = currentMonthTx.filter(
        (t) => (t.loanId === ln.id || t.loanId === ln._id) && t.type === "debt_repayment"
      );
      const emiPaid = linkedTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const principalPaid = linkedTx.reduce((sum, t) => sum + (Number(t.principalAmount) || 0), 0);
      const interestPaid = linkedTx.reduce((sum, t) => sum + (Number(t.interestAmount) || 0), 0);
      const extraPaid = linkedTx.reduce(
        (sum, t) => sum + Math.max(0, (Number(t.amount) || 0) - (Number(ln.emiAmount) || 0)),
        0
      );

      return {
        ...ln,
        emiPaid,
        principalPaid,
        interestPaid,
        extraPaid,
        paymentCount: linkedTx.length,
      };
    });
  }, [loans, currentMonthTx]);

  // 6. Month-End Forecast (Estimate)
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate() || 1;
  const isCurrentMonthSelected = selectedMonthKey === toMonthKey();

  const dailyPace = actualSpending > 0 ? actualSpending / currentDay : 0;
  const projectedMonthEndSpending = Math.round(
    isCurrentMonthSelected ? dailyPace * daysInMonth : actualSpending
  );
  const projectedRemaining = monthlyBudget > 0 ? monthlyBudget - projectedMonthEndSpending : 0;

  // 7. Fact-Based Data Summary
  const summaryFact = useMemo(() => {
    if (!hasData) {
      return "No transactions logged for this month yet. Start adding transactions to generate your monthly financial review.";
    }

    const netStatusStr =
      netAvailableCashFlow >= 0
        ? `leaving a net surplus of ${formatCurrency(netAvailableCashFlow)}.`
        : `resulting in an overcommitment deficit of ${formatCurrency(Math.abs(netAvailableCashFlow))}.`;

    const topCatStr =
      topCategory[0] !== "None"
        ? `${topCategory[0]} is your highest spending category at ${formatCurrency(topCategory[1])}.`
        : "";

    return `In ${formatMonthName(selectedMonthKey)}, total income was ${formatCurrency(
      totalIncome
    )} against ${formatCurrency(
      actualSpending
    )} in living spending and ${formatCurrency(
      totalSavings + totalInvestments
    )} in wealth creation, ${netStatusStr} ${topCatStr}`;
  }, [hasData, selectedMonthKey, totalIncome, actualSpending, totalSavings, totalInvestments, netAvailableCashFlow, topCategory]);

  return (
    <div className="page-content page monthly-review-page">
      <div className="page-title-row">
        <div className="page-title">
          <span>PACE</span>
          <h2>Monthly Review</h2>
          <p>Complete 10-section financial review for {formatMonthName(selectedMonthKey)}</p>
        </div>
        {onBack && (
          <button className="back-btn" type="button" onClick={onBack}>
            ← Back
          </button>
        )}
      </div>

      {/* Month Switcher Navigation Bar */}
      <MonthSwitcher
        currentMonthKey={selectedMonthKey}
        onMonthChange={setSelectedMonthKey}
      />

      {/* Zero Data Honest Empty State */}
      {!hasData && (
        <div className="empty-state-card" style={{ padding: "32px 20px", textAlign: "center", margin: "16px 0" }}>
          <div style={{ fontSize: "42px", marginBottom: "12px" }}>📊</div>
          <h3 style={{ fontSize: "18px", color: "#f8fafc", marginBottom: "6px" }}>No Financial Data Yet</h3>
          <p style={{ color: "#94a3b8", fontSize: "13px", maxWidth: "380px", margin: "0 auto 16px auto" }}>
            You haven't logged any transactions for {formatMonthName(selectedMonthKey)}. Add an income or expense to generate your monthly review.
          </p>
          {openTransactionForm && (
            <button
              type="button"
              className="submit-btn"
              style={{ width: "auto", padding: "10px 24px", margin: "0 auto" }}
              onClick={() => openTransactionForm()}
            >
              + Add First Transaction
            </button>
          )}
        </div>
      )}

      {hasData && (
        <>
            {/* Section 1: Financial Overview (5 Pillars + Cash Flow) */}
      <section className="settings-card" style={{ marginTop: "14px" }}>
        <div className="section-title-sm" style={{ marginBottom: "12px" }}>
          <span>SECTION 1: FINANCIAL OVERVIEW</span>
          <small>5 Pillars & Net Cash Flow breakdown</small>
        </div>

        <div className="summary-row">
          <span>💰 1. Total Income</span>
          <strong>{formatCurrency(totalIncome)}</strong>
        </div>

        <div className="summary-row">
          <span>💸 2. Actual Living Spending</span>
          <strong style={{ color: "#f87171" }}>{formatCurrency(actualSpending)}</strong>
        </div>

        <div className="summary-row">
          <span>🏦 3. Savings (Emergency & FD)</span>
          <strong style={{ color: "#60a5fa" }}>{formatCurrency(totalSavings)}</strong>
        </div>

        <div className="summary-row">
          <span>📈 4. Investments (SIP & Stocks)</span>
          <strong style={{ color: "#a78bfa" }}>{formatCurrency(totalInvestments)}</strong>
        </div>

        <div className="summary-row">
          <span>💳 5. Debt Repayment (Loan EMIs)</span>
          <strong style={{ color: "#fb923c" }}>{formatCurrency(totalDebtRepayment)}</strong>
        </div>

        <div className="summary-row" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px", marginTop: "10px" }}>
          <strong>Net Available Cash Flow</strong>
          <strong style={{ fontSize: "16px", color: netAvailableCashFlow >= 0 ? "#34d399" : "#f87171" }}>
            {formatCurrency(netAvailableCashFlow)}
          </strong>
        </div>
      </section>

      {/* Section 2: Where Money Went (Category & Major Head Breakdown) */}
      <section className="settings-card" style={{ marginTop: "14px" }}>
        <div className="section-title-sm" style={{ marginBottom: "12px" }}>
          <span>SECTION 2: WHERE MONEY WENT</span>
          <small>Living spending breakdown by Major Head & Top Categories</small>
        </div>

        {hasData ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
              <div className="major-head-card" style={{ padding: "10px" }}>
                <small>Essentials</small>
                <strong>{formatCurrency(majorHeadTotals?.Essentials || 0)}</strong>
              </div>
              <div className="major-head-card" style={{ padding: "10px" }}>
                <small>Lifestyle</small>
                <strong>{formatCurrency(majorHeadTotals?.Lifestyle || 0)}</strong>
              </div>
            </div>

            <span className="card-label" style={{ marginBottom: "8px", display: "block" }}>TOP SPENDING CATEGORIES</span>
            {sortedCategories.length > 0 ? (
              sortedCategories.slice(0, 5).map(([cat, amt]) => (
                <div className="summary-row" key={cat}>
                  <span>{cat}</span>
                  <strong>{formatCurrency(amt)}</strong>
                </div>
              ))
            ) : (
              <small style={{ color: "#94a3b8" }}>No expense categories logged this month.</small>
            )}
          </>
        ) : (
          <small style={{ color: "#94a3b8" }}>No spending data logged for this month.</small>
        )}
      </section>

      {/* Section 3: Previous Month Comparison */}
      <section className="settings-card" style={{ marginTop: "14px" }}>
        <div className="section-title-sm" style={{ marginBottom: "12px" }}>
          <span>SECTION 3: PREVIOUS MONTH COMPARISON</span>
          <small>{formatMonthName(selectedMonthKey)} vs {formatMonthName(prevMonthKey)}</small>
        </div>

        <div className="summary-row">
          <span>Income ({formatMonthName(prevMonthKey)}: {formatCurrency(prevMonthFinances.totalIncome)})</span>
          <strong>
            {formatCurrency(totalIncome)}{" "}
            <small style={{ color: totalIncome >= prevMonthFinances.totalIncome ? "#34d399" : "#f87171" }}>
              ({totalIncome >= prevMonthFinances.totalIncome ? "+" : ""}{formatCurrency(totalIncome - prevMonthFinances.totalIncome)})
            </small>
          </strong>
        </div>

        <div className="summary-row">
          <span>Living Spending ({formatMonthName(prevMonthKey)}: {formatCurrency(prevMonthFinances.actualSpending)})</span>
          <strong>
            {formatCurrency(actualSpending)}{" "}
            <small style={{ color: actualSpending <= prevMonthFinances.actualSpending ? "#34d399" : "#f87171" }}>
              ({actualSpending - prevMonthFinances.actualSpending >= 0 ? "+" : ""}{formatCurrency(actualSpending - prevMonthFinances.actualSpending)})
            </small>
          </strong>
        </div>

        <div className="summary-row">
          <span>Wealth Generation ({formatMonthName(prevMonthKey)}: {formatCurrency(prevMonthFinances.wealthGeneration)})</span>
          <strong>
            {formatCurrency(totalSavings + totalInvestments)}{" "}
            <small style={{ color: (totalSavings + totalInvestments) >= prevMonthFinances.wealthGeneration ? "#34d399" : "#f87171" }}>
              ({(totalSavings + totalInvestments) >= prevMonthFinances.wealthGeneration ? "+" : ""}{formatCurrency((totalSavings + totalInvestments) - prevMonthFinances.wealthGeneration)})
            </small>
          </strong>
        </div>
      </section>

      {/* Section 4: Budget Health */}
      <section className="settings-card" style={{ marginTop: "14px" }}>
        <div className="section-title-sm" style={{ marginBottom: "12px" }}>
          <span>SECTION 4: BUDGET HEALTH</span>
          <small>Monthly living budget status</small>
        </div>

        <div className="summary-row">
          <span>Configured Monthly Budget</span>
          <strong>{monthlyBudget > 0 ? formatCurrency(monthlyBudget) : "Not Configured"}</strong>
        </div>

        {monthlyBudget > 0 ? (
          <>
            <div className="summary-row">
              <span>Actual Spent</span>
              <strong>{formatCurrency(actualSpending)} ({budgetUsed.toFixed(0)}%)</strong>
            </div>

            <div className="summary-row">
              <span>Remaining Living Budget</span>
              <strong style={{ color: remainingBudget >= 0 ? "#34d399" : "#f87171" }}>
                {formatCurrency(remainingBudget)}
              </strong>
            </div>

            <div className="summary-row">
              <span>Status</span>
              <span className={`security-badge ${budgetStatusClass}`}>{budgetStatus}</span>
            </div>
          </>
        ) : (
          <small style={{ color: "#94a3b8" }}>Set a monthly budget in Settings or Budgets page to track health.</small>
        )}
      </section>

      {/* Section 5: Savings Target & Pace */}
      <section className="settings-card" style={{ marginTop: "14px" }}>
        <div className="section-title-sm" style={{ marginBottom: "12px" }}>
          <span>SECTION 5: SAVINGS TARGET & PACE</span>
          <small>Wealth rate and savings gap</small>
        </div>

        <div className="summary-row">
          <span>Actual Savings & Investments</span>
          <strong>{formatCurrency(totalSavings + totalInvestments)}</strong>
        </div>

        <div className="summary-row">
          <span>Savings Rate</span>
          <strong>{savingsRate.toFixed(1)}% of income</strong>
        </div>
      </section>

      {/* Section 6: Configured Commitments */}
      <section className="settings-card" style={{ marginTop: "14px" }}>
        <div className="section-title-sm" style={{ marginBottom: "12px" }}>
          <span>SECTION 6: CONFIGURED COMMITMENTS</span>
          <small>Known EMIs, Rent, Subscriptions & Recurring items</small>
        </div>

        {monthlyCommitments.length > 0 ? (
          monthlyCommitments.map((item, idx) => (
            <div className="summary-row" key={idx}>
              <span>{item.icon} {item.title} <small>({item.type})</small></span>
              <strong>{formatCurrency(item.amount)}</strong>
            </div>
          ))
        ) : (
          <small style={{ color: "#94a3b8" }}>No active recurring commitments configured.</small>
        )}
      </section>

      {/* Section 7: Event Spending */}
      <section className="settings-card" style={{ marginTop: "14px" }}>
        <div className="section-title-sm" style={{ marginBottom: "12px" }}>
          <span>SECTION 7: EVENT SPENDING</span>
          <small>Linked milestone event expenses for {formatMonthName(selectedMonthKey)}</small>
        </div>

        {monthEventSpending.length > 0 ? (
          monthEventSpending.map((ev) => (
            <div className="summary-row" key={ev.id}>
              <span>{ev.icon} {ev.name}</span>
              <div>
                <strong>{formatCurrency(ev.monthSpent)} this month</strong>
                <br />
                <small style={{ color: "#94a3b8" }}>Total: {formatCurrency(ev.cumulativeSpent)} / {formatCurrency(ev.budget)} ({ev.percentUsed.toFixed(0)}%)</small>
              </div>
            </div>
          ))
        ) : (
          <small style={{ color: "#94a3b8" }}>No active events linked to transactions this month.</small>
        )}
      </section>

      {/* Section 8: Loan Review */}
      <section className="settings-card" style={{ marginTop: "14px" }}>
        <div className="section-title-sm" style={{ marginBottom: "12px" }}>
          <span>SECTION 8: LOAN REVIEW</span>
          <small>Loan payments, principal, and interest paid this month</small>
        </div>

        {monthLoanPayments.length > 0 ? (
          monthLoanPayments.map((ln) => (
            <div className="summary-row" key={ln.id}>
              <span>{ln.icon || "🏠"} {ln.name}</span>
              <div>
                <strong>{formatCurrency(ln.emiPaid)} paid this month</strong>
                <br />
                <small style={{ color: "#94a3b8" }}>Outstanding: {formatCurrency(ln.currentOutstanding)}</small>
              </div>
            </div>
          ))
        ) : (
          <small style={{ color: "#94a3b8" }}>No active loans configured or payments logged this month.</small>
        )}
      </section>

      {/* Section 9: Month-End Forecast (ESTIMATE) */}
      <section className="settings-card" style={{ marginTop: "14px" }}>
        <div className="section-title-sm" style={{ marginBottom: "12px" }}>
          <span>SECTION 9: MONTH-END FORECAST</span>
          <span className="security-badge" style={{ backgroundColor: "#334155", color: "#f8fafc" }}>ESTIMATE</span>
        </div>

        <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>
          Projections are estimates based on your current daily spending pace ({formatCurrency(dailyPace)}/day).
        </p>

        <div className="summary-row">
          <span>Projected Month-End Living Spending</span>
          <strong>{formatCurrency(projectedMonthEndSpending)}</strong>
        </div>

        {monthlyBudget > 0 && (
          <div className="summary-row">
            <span>Projected Remaining Living Budget</span>
            <strong style={{ color: projectedRemaining >= 0 ? "#34d399" : "#f87171" }}>
              {formatCurrency(projectedRemaining)}
            </strong>
          </div>
        )}
      </section>

      {/* Section 10: Data-Driven Summary */}
      <section className="settings-card" style={{ marginTop: "14px", borderLeft: "3px solid #38bdf8" }}>
        <div className="section-title-sm" style={{ marginBottom: "8px" }}>
          <span>SECTION 10: DATA-DRIVEN SUMMARY</span>
        </div>
        <p style={{ fontSize: "13px", color: "#f8fafc", lineHeight: "1.5", margin: 0 }}>
          {summaryFact}
        </p>
      </section>
        </>
      )}
    </div>
  );
}
