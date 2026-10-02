import { useState, useMemo } from "react";
import {
  calculateMonthlyFinances,
  formatMonthName,
  getPreviousMonthKey,
  toMonthKey,
} from "../utils/financialEngine";

export default function ReportsPage({ transactions = [], monthlyBudget = 0, onBack }) {
  const currentKey = toMonthKey();
  const prevKey = getPreviousMonthKey(currentKey);

  const [monthA, setMonthA] = useState(currentKey);
  const [monthB, setMonthB] = useState(prevKey);

  // Available unique months from transactions
  const availableMonths = useMemo(() => {
    const set = new Set([currentKey, prevKey]);
    transactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 7) {
        set.add(tx.date.slice(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions, currentKey, prevKey]);

  // Financial calculations for both months
  const finA = useMemo(
    () => calculateMonthlyFinances(transactions, monthA, monthlyBudget),
    [transactions, monthA, monthlyBudget]
  );

  const finB = useMemo(
    () => calculateMonthlyFinances(transactions, monthB, monthlyBudget),
    [transactions, monthB, monthlyBudget]
  );

  // Diffs: Month A minus Month B
  const diffs = useMemo(() => {
    const incomeDiff = finA.totalIncome - finB.totalIncome;
    const spendDiff = finA.actualSpending - finB.actualSpending;
    const wealthDiff = finA.wealthGeneration - finB.wealthGeneration;
    const debtDiff = finA.totalDebtRepayment - finB.totalDebtRepayment;
    const cashFlowDiff = finA.netAvailableCashFlow - finB.netAvailableCashFlow;

    const spendPct = finB.actualSpending > 0 ? (spendDiff / finB.actualSpending) * 100 : 0;
    const incomePct = finB.totalIncome > 0 ? (incomeDiff / finB.totalIncome) * 100 : 0;

    return {
      incomeDiff,
      spendDiff,
      wealthDiff,
      debtDiff,
      cashFlowDiff,
      spendPct,
      incomePct,
    };
  }, [finA, finB]);

  // Combined Category Diffs
  const categoryDiffList = useMemo(() => {
    const allCats = new Set([
      ...Object.keys(finA.categoryTotals),
      ...Object.keys(finB.categoryTotals),
    ]);

    return Array.from(allCats)
      .map((cat) => {
        const amtA = finA.categoryTotals[cat] || 0;
        const amtB = finB.categoryTotals[cat] || 0;
        const diff = amtA - amtB;
        const pct = amtB > 0 ? (diff / amtB) * 100 : amtA > 0 ? 100 : 0;
        return { category: cat, amtA, amtB, diff, pct };
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [finA, finB]);

  return (
    <div className="page-content page reports-page">
      <div className="page-title-row">
        <div>
          <span>PACE INTELLIGENCE</span>
          <h2>Financial Reports & Comparison</h2>
          <p>Month-to-month dynamic comparison & spending shifts</p>
        </div>
        {onBack && (
          <button type="button" className="secondary-btn small" onClick={onBack}>
            ← Back
          </button>
        )}
      </div>

      {/* Month Selectors */}
      <div className="compare-selectors-card">
        <div className="compare-selector-col">
          <label>Base Month (A):</label>
          <select
            className="input-select"
            value={monthA}
            onChange={(e) => setMonthA(e.target.value)}
          >
            {availableMonths.map((m) => (
              <option key={`a_${m}`} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>
        </div>

        <div className="compare-vs-badge">VS</div>

        <div className="compare-selector-col">
          <label>Compare Against (B):</label>
          <select
            className="input-select"
            value={monthB}
            onChange={(e) => setMonthB(e.target.value)}
          >
            {availableMonths.map((m) => (
              <option key={`b_${m}`} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* High-level Narrative Insight */}
      <div className="report-narrative-card">
        <div className="report-narrative-icon">📊</div>
        <div className="report-narrative-text">
          <strong>Key Trend Analysis:</strong>
          <p>
            In {finA.monthName}, your actual living spending was{" "}
            <strong>₹{finA.actualSpending.toLocaleString("en-IN")}</strong>{" "}
            compared to{" "}
            <strong>₹{finB.actualSpending.toLocaleString("en-IN")}</strong> in{" "}
            {finB.monthName}{" "}
            ({diffs.spendDiff >= 0 ? "+" : ""}
            {diffs.spendDiff.toLocaleString("en-IN")}, {diffs.spendPct.toFixed(1)}%).
            {diffs.wealthDiff > 0
              ? ` Great job! Wealth generation (savings & investments) grew by ₹${diffs.wealthDiff.toLocaleString("en-IN")}.`
              : ""}
          </p>
        </div>
      </div>

      {/* 5-Pillar Side-by-Side Comparison */}
      <div className="comparison-metric-grid">
        <div className="compare-metric-card">
          <div className="compare-metric-label">Actual Spending</div>
          <div className="compare-metric-values">
            <span className="val-a">₹{finA.actualSpending.toLocaleString("en-IN")}</span>
            <span className="val-b">₹{finB.actualSpending.toLocaleString("en-IN")}</span>
          </div>
          <div className={`compare-diff-tag ${diffs.spendDiff <= 0 ? "positive" : "negative"}`}>
            {diffs.spendDiff >= 0 ? "▲ +" : "▼ "}
            ₹{Math.abs(diffs.spendDiff).toLocaleString("en-IN")} ({diffs.spendPct.toFixed(1)}%)
          </div>
        </div>

        <div className="compare-metric-card">
          <div className="compare-metric-label">Total Income</div>
          <div className="compare-metric-values">
            <span className="val-a">₹{finA.totalIncome.toLocaleString("en-IN")}</span>
            <span className="val-b">₹{finB.totalIncome.toLocaleString("en-IN")}</span>
          </div>
          <div className={`compare-diff-tag ${diffs.incomeDiff >= 0 ? "positive" : "negative"}`}>
            {diffs.incomeDiff >= 0 ? "▲ +" : "▼ "}
            ₹{Math.abs(diffs.incomeDiff).toLocaleString("en-IN")} ({diffs.incomePct.toFixed(1)}%)
          </div>
        </div>

        <div className="compare-metric-card">
          <div className="compare-metric-label">Wealth Generated (SIP + Savings)</div>
          <div className="compare-metric-values">
            <span className="val-a">₹{finA.wealthGeneration.toLocaleString("en-IN")}</span>
            <span className="val-b">₹{finB.wealthGeneration.toLocaleString("en-IN")}</span>
          </div>
          <div className={`compare-diff-tag ${diffs.wealthDiff >= 0 ? "positive" : "neutral"}`}>
            {diffs.wealthDiff >= 0 ? "▲ +" : "▼ "}
            ₹{Math.abs(diffs.wealthDiff).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="compare-metric-card">
          <div className="compare-metric-label">Net Available Cash Flow</div>
          <div className="compare-metric-values">
            <span className="val-a">₹{finA.netAvailableCashFlow.toLocaleString("en-IN")}</span>
            <span className="val-b">₹{finB.netAvailableCashFlow.toLocaleString("en-IN")}</span>
          </div>
          <div className={`compare-diff-tag ${diffs.cashFlowDiff >= 0 ? "positive" : "negative"}`}>
            {diffs.cashFlowDiff >= 0 ? "▲ +" : "▼ "}
            ₹{Math.abs(diffs.cashFlowDiff).toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Major Heads Breakdown Comparison */}
      <div className="report-section">
        <div className="section-heading">
          <h3>Major Heads Comparison</h3>
          <small>Structural spending distribution</small>
        </div>

        <div className="major-heads-compare-list">
          {["Essentials", "Lifestyle", "Financial Commitments", "Wealth & Future"].map((head) => {
            const valA = finA.majorHeadTotals[head] || 0;
            const valB = finB.majorHeadTotals[head] || 0;
            const diff = valA - valB;

            return (
              <div key={head} className="head-compare-row">
                <div className="head-compare-title">
                  <strong>{head}</strong>
                  <small>
                    {finA.monthName}: ₹{valA.toLocaleString("en-IN")} | {finB.monthName}: ₹{valB.toLocaleString("en-IN")}
                  </small>
                </div>
                <div className="head-compare-right">
                  <span className={`head-diff-pill ${diff <= 0 ? "good" : "bad"}`}>
                    {diff >= 0 ? "+" : ""}
                    ₹{diff.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Level Diff Table */}
      <div className="report-section">
        <div className="section-heading">
          <h3>Category Spending Shifts</h3>
          <small>Detailed breakdown of where your expenses changed</small>
        </div>

        {categoryDiffList.length === 0 ? (
          <div className="empty-subtext">No category expenses recorded in these months.</div>
        ) : (
          <div className="category-shifts-table-wrapper">
            <table className="category-shifts-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>{finA.monthName}</th>
                  <th>{finB.monthName}</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {categoryDiffList.map((row) => (
                  <tr key={row.category}>
                    <td>
                      <strong>{row.category}</strong>
                    </td>
                    <td>₹{row.amtA.toLocaleString("en-IN")}</td>
                    <td>₹{row.amtB.toLocaleString("en-IN")}</td>
                    <td>
                      <span className={`diff-badge ${row.diff > 0 ? "increase" : row.diff < 0 ? "decrease" : "zero"}`}>
                        {row.diff > 0 ? `+₹${row.diff.toLocaleString("en-IN")}` : row.diff < 0 ? `-₹${Math.abs(row.diff).toLocaleString("en-IN")}` : "₹0"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
