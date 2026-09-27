import React, { useState, useMemo } from "react";
import {
  calculateEMI,
  generateAmortizationSchedule,
  simulatePrepayment,
  recommendPrepayment,
} from "../utils/financialEngine";

export default function LoansPage({
  loans = [],
  transactions = [],
  netAvailableCashFlow = 0,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onOpenAddPaymentForLoan,
  onBack,
}) {
  const [selectedLoanId, setSelectedLoanId] = useState(
    loans.length > 0 ? loans[0].id : null
  );
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);

  // Prepayment Simulator interactive state
  const [extraMonthly, setExtraMonthly] = useState(2000);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("🏠");
  const [formLender, setFormLender] = useState("");
  const [formPrincipal, setFormPrincipal] = useState("");
  const [formOutstanding, setFormOutstanding] = useState("");
  const [formRate, setFormRate] = useState("8.5");
  const [formTenure, setFormTenure] = useState("240");
  const [formRemainingTenure, setFormRemainingTenure] = useState("180");
  const [formEmi, setFormEmi] = useState("");
  const [formDueDay, setFormDueDay] = useState("5");

  // Selected Loan
  const currentLoan = useMemo(() => {
    return loans.find((l) => l.id === selectedLoanId) || loans[0] || null;
  }, [loans, selectedLoanId]);

  // Amortization baseline schedule
  const amortization = useMemo(() => {
    if (!currentLoan) return null;
    return generateAmortizationSchedule(currentLoan);
  }, [currentLoan]);

  // Prepayment simulation result
  const simulation = useMemo(() => {
    if (!currentLoan) return null;
    return simulatePrepayment(currentLoan, { extraMonthly: Number(extraMonthly) || 0 });
  }, [currentLoan, extraMonthly]);

  // Smart Prepayment Recommendation based on cash flow
  const recommendation = useMemo(() => {
    return recommendPrepayment(netAvailableCashFlow, loans);
  }, [netAvailableCashFlow, loans]);

  // Linked payments from transactions
  const linkedPayments = useMemo(() => {
    if (!currentLoan) return [];
    return transactions.filter(
      (t) => t.loanId === currentLoan.id || (t.type === "debt_repayment" && (t.title || "").toLowerCase().includes((currentLoan.name || "").toLowerCase()))
    );
  }, [transactions, currentLoan]);

  function handleOpenCreateModal() {
    setEditingLoan(null);
    setFormName("");
    setFormIcon("🏠");
    setFormLender("");
    setFormPrincipal("");
    setFormOutstanding("");
    setFormRate("8.5");
    setFormTenure("240");
    setFormRemainingTenure("180");
    setFormEmi("");
    setFormDueDay("5");
    setShowLoanModal(true);
  }

  function handleOpenEditModal(loan) {
    setEditingLoan(loan);
    setFormName(loan.name || "");
    setFormIcon(loan.icon || "🏠");
    setFormLender(loan.lender || "");
    setFormPrincipal(loan.originalPrincipal ? String(loan.originalPrincipal) : "");
    setFormOutstanding(loan.currentOutstanding ? String(loan.currentOutstanding) : "");
    setFormRate(loan.interestRate ? String(loan.interestRate) : "8.5");
    setFormTenure(loan.tenureMonths ? String(loan.tenureMonths) : "240");
    setFormRemainingTenure(loan.remainingTenureMonths ? String(loan.remainingTenureMonths) : "180");
    setFormEmi(loan.emiAmount ? String(loan.emiAmount) : "");
    setFormDueDay(loan.dueDay ? String(loan.dueDay) : "5");
    setShowLoanModal(true);
  }

  function handleAutoCalculateEmi() {
    const p = Number(formOutstanding || formPrincipal || 0);
    const r = Number(formRate || 0);
    const t = Number(formRemainingTenure || formTenure || 12);
    if (p > 0 && r > 0 && t > 0) {
      const computed = calculateEMI(p, r, t);
      setFormEmi(String(computed));
    }
  }

  function handleSaveLoan(e) {
    e.preventDefault();
    const principal = Number(formPrincipal || 0);
    const outstanding = Number(formOutstanding || principal || 0);
    const rate = Number(formRate || 0);
    const tenure = Number(formTenure || 60);
    const remainingTenure = Number(formRemainingTenure || tenure);
    const emi = Number(formEmi) || calculateEMI(outstanding, rate, remainingTenure);

    if (!formName.trim() || outstanding <= 0) {
      alert("Please enter a valid loan name and outstanding balance.");
      return;
    }

    const loanPayload = {
      id: editingLoan ? editingLoan.id : `loan_${Date.now()}`,
      name: formName.trim(),
      icon: formIcon.trim() || "🏠",
      lender: formLender.trim() || "Bank",
      originalPrincipal: principal || outstanding,
      currentOutstanding: outstanding,
      interestRate: rate,
      tenureMonths: tenure,
      remainingTenureMonths: remainingTenure,
      emiAmount: emi,
      dueDay: Number(formDueDay) || 5,
      status: "active",
    };

    if (editingLoan) {
      onUpdateLoan(loanPayload);
    } else {
      onAddLoan(loanPayload);
      setSelectedLoanId(loanPayload.id);
    }

    setShowLoanModal(false);
  }

  function handleDelete(id) {
    if (window.confirm("Are you sure you want to delete this loan record? Linked payment transactions will be preserved.")) {
      onDeleteLoan(id);
      if (selectedLoanId === id) {
        const remaining = loans.filter((l) => l.id !== id);
        setSelectedLoanId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  }

  return (
    <div className="page-content page loans-page">
      <div className="page-title-row">
        <div>
          <span>PACE DEBT & EMIs</span>
          <h2>Loans & Amortization</h2>
          <p>Track loan principals, interest, and test prepayment scenarios</p>
        </div>
        <button
          type="button"
          className="primary-action-btn"
          onClick={handleOpenCreateModal}
        >
          + Add Loan
        </button>
      </div>

      {/* Loan Selector Pills */}
      {loans.length > 0 && (
        <div className="event-pill-tabs">
          {loans.map((loan) => (
            <button
              key={loan.id}
              type="button"
              className={`event-pill-btn ${loan.id === currentLoan?.id ? "active" : ""}`}
              onClick={() => setSelectedLoanId(loan.id)}
            >
              <span className="pill-icon">{loan.icon || "🏠"}</span>
              <span className="pill-name">{loan.name}</span>
              <span className="pill-budget">₹{Number(loan.currentOutstanding).toLocaleString("en-IN")}</span>
            </button>
          ))}
        </div>
      )}

      {currentLoan ? (
        <div className="loan-dashboard">
          {/* Main Loan Hero Card */}
          <div className="loan-hero-card">
            <div className="loan-hero-top">
              <div className="loan-hero-title">
                <span className="loan-hero-icon">{currentLoan.icon || "🏠"}</span>
                <div>
                  <h3>{currentLoan.name}</h3>
                  <small>{currentLoan.lender} • Due day {currentLoan.dueDay}th of every month</small>
                </div>
              </div>
              <div className="loan-actions">
                <button
                  type="button"
                  className="icon-action-btn"
                  onClick={() => handleOpenEditModal(currentLoan)}
                  title="Edit Loan"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="icon-action-btn delete"
                  onClick={() => handleDelete(currentLoan.id)}
                  title="Delete Loan"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* 4-Metric Grid */}
            <div className="loan-metric-grid">
              <div className="loan-metric">
                <small>Current Outstanding</small>
                <strong>₹{Number(currentLoan.currentOutstanding).toLocaleString("en-IN")}</strong>
              </div>
              <div className="loan-metric highlight">
                <small>Monthly EMI</small>
                <strong>₹{Number(currentLoan.emiAmount).toLocaleString("en-IN")}</strong>
              </div>
              <div className="loan-metric">
                <small>Interest Rate</small>
                <strong>{currentLoan.interestRate}% p.a.</strong>
              </div>
              <div className="loan-metric">
                <small>Remaining Tenure</small>
                <strong>{currentLoan.remainingTenureMonths} mos ({Math.floor(currentLoan.remainingTenureMonths / 12)}y {currentLoan.remainingTenureMonths % 12}m)</strong>
              </div>
            </div>

            {/* Action buttons */}
            <div className="loan-quick-actions">
              <button
                type="button"
                className="loan-pay-btn"
                onClick={() => onOpenAddPaymentForLoan(currentLoan)}
              >
                + Record EMI / Prepayment
              </button>
            </div>
          </div>

          {/* Smart Prepayment Recommendation Banner */}
          {recommendation.recommendedAmount > 0 && (
            <div className="loan-smart-banner">
              <div className="smart-banner-icon">💡</div>
              <div className="smart-banner-content">
                <strong>Smart Prepayment Recommendation</strong>
                <p>{recommendation.reason}</p>
                <button
                  type="button"
                  className="smart-apply-btn"
                  onClick={() => setExtraMonthly(recommendation.recommendedAmount)}
                >
                  Apply ₹{recommendation.recommendedAmount.toLocaleString("en-IN")}/mo in Simulator →
                </button>
              </div>
            </div>
          )}

          {/* "WHAT IF I PAY EXTRA?" PREPAYMENT SIMULATOR */}
          <div className="loan-section simulator-section">
            <div className="section-heading">
              <div className="badge-row">
                <h3>"What if I pay extra?" Prepayment Simulator</h3>
                <span className="badge-highlight">LIVE ENGINE</span>
              </div>
              <small>See how small extra monthly payments destroy your loan interest and tenure</small>
            </div>

            {/* Interactive Extra Payment Controls */}
            <div className="simulator-controls">
              <label>Extra Monthly Payment: <strong>₹{Number(extraMonthly).toLocaleString("en-IN")}</strong></label>
              <div className="preset-buttons">
                {[1000, 2000, 5000, 10000, 15000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`preset-btn ${extraMonthly === amt ? "active" : ""}`}
                    onClick={() => setExtraMonthly(amt)}
                  >
                    +₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>

              <div className="slider-wrapper">
                <input
                  type="range"
                  min="0"
                  max="25000"
                  step="500"
                  value={extraMonthly}
                  onChange={(e) => setExtraMonthly(Number(e.target.value))}
                  className="simulator-slider"
                />
              </div>
            </div>

            {/* Simulation Impact Results Card */}
            {simulation && (
              <div className="simulator-results-card">
                <div className="sim-result-head">
                  <div className="sim-result-item savings">
                    <span className="sim-icon">🎉</span>
                    <div>
                      <small>Total Interest Saved</small>
                      <strong>₹{Number(simulation.interestSaved).toLocaleString("en-IN")}</strong>
                      <span className="sim-sub">({simulation.percentageInterestSaved}% less interest)</span>
                    </div>
                  </div>

                  <div className="sim-result-item tenure">
                    <span className="sim-icon">⏱️</span>
                    <div>
                      <small>Tenure Reduced By</small>
                      <strong>{simulation.monthsSaved} Months</strong>
                      <span className="sim-sub">({simulation.yearsSaved} Years Early Freedom)</span>
                    </div>
                  </div>
                </div>

                <div className="sim-comparison-bar">
                  <div className="sim-bar-col">
                    <span>Regular Payoff:</span>
                    <strong>{simulation.baselinePayoffMonths} months</strong>
                  </div>
                  <div className="sim-arrow">➔</div>
                  <div className="sim-bar-col highlight">
                    <span>With +₹{Number(extraMonthly).toLocaleString("en-IN")}/mo:</span>
                    <strong>{simulation.newPayoffMonths} months</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Amortization Schedule Table Toggle */}
          <div className="loan-section">
            <div className="section-heading-row">
              <div>
                <h3>Amortization Schedule</h3>
                <small>Principal vs. Interest distribution per monthly EMI</small>
              </div>
              <button
                type="button"
                className="secondary-btn small"
                onClick={() => setShowFullSchedule(!showFullSchedule)}
              >
                {showFullSchedule ? "Hide Schedule" : "View Schedule"}
              </button>
            </div>

            {showFullSchedule && amortization && (
              <div className="schedule-table-wrapper">
                <table className="amortization-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>EMI</th>
                      <th>Principal</th>
                      <th>Interest</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortization.schedule.slice(0, 36).map((row) => (
                      <tr key={row.month}>
                        <td>M{row.month}</td>
                        <td>₹{row.emi.toLocaleString("en-IN")}</td>
                        <td className="text-success">₹{row.principalPaid.toLocaleString("en-IN")}</td>
                        <td className="text-warning">₹{row.interestPaid.toLocaleString("en-IN")}</td>
                        <td>₹{row.remainingBalance.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <small className="table-caption">Displaying first 36 months of amortization</small>
              </div>
            )}
          </div>

          {/* Linked Payments History */}
          <div className="loan-section">
            <div className="section-heading">
              <h3>Recorded Payments & EMIs</h3>
              <small>{linkedPayments.length} payments recorded in transactions</small>
            </div>

            {linkedPayments.length === 0 ? (
              <div className="empty-state-card">
                <span className="empty-icon">💳</span>
                <p>No EMI or debt repayment logged for this loan yet.</p>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => onOpenAddPaymentForLoan(currentLoan)}
                >
                  Log First EMI Payment
                </button>
              </div>
            ) : (
              <div className="event-transactions-list">
                {linkedPayments.map((tx) => (
                  <div key={tx.id} className="event-tx-item">
                    <div className="event-tx-left">
                      <span className="event-tx-icon">🏦</span>
                      <div>
                        <strong>{tx.title}</strong>
                        <div className="event-tx-meta">
                          <span>{tx.date}</span>
                          {tx.principalAmount && <span> • Principal: ₹{tx.principalAmount}</span>}
                          {tx.interestAmount && <span> • Interest: ₹{tx.interestAmount}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="event-tx-right">
                      <span className="event-tx-amount debt">₹{Number(tx.amount).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state-card large">
          <span className="empty-icon">🏠</span>
          <h3>No Loans or EMIs Added Yet</h3>
          <p>Track your home loans, vehicle loans, personal loans, and credit card EMIs. See principal vs interest breakdown and simulate early payoff savings.</p>
          <button type="button" className="primary-action-btn" onClick={handleOpenCreateModal}>
            + Add First Loan
          </button>
        </div>
      )}

      {/* Modal for Add / Edit Loan */}
      {showLoanModal && (
        <div className="modal-overlay" onMouseDown={() => setShowLoanModal(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <div>
                <span>PACE DEBT</span>
                <h2>{editingLoan ? "Edit Loan" : "Add Loan or EMI"}</h2>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowLoanModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="loan-form">
              <div className="form-group">
                <label>Loan Icon & Name</label>
                <div className="icon-input-row">
                  <select
                    className="input-select icon-select"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                  >
                    <option value="🏠">🏠 Home Loan</option>
                    <option value="🚗">🚗 Car Loan</option>
                    <option value="📚">📚 Education Loan</option>
                    <option value="💼">💼 Personal Loan</option>
                    <option value="💳">💳 Credit Card EMI</option>
                    <option value="🏢">🏢 Business Loan</option>
                  </select>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g. SBI Home Loan"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Lender / Bank</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. State Bank of India, HDFC"
                  value={formLender}
                  onChange={(e) => setFormLender(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Current Outstanding Balance (₹)</label>
                  <input
                    type="number"
                    className="input-text"
                    placeholder="e.g. 1950000"
                    value={formOutstanding}
                    onChange={(e) => setFormOutstanding(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.05"
                    className="input-text"
                    placeholder="e.g. 8.5"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Remaining Tenure (Months)</label>
                  <input
                    type="number"
                    className="input-text"
                    placeholder="e.g. 180"
                    value={formRemainingTenure}
                    onChange={(e) => setFormRemainingTenure(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Monthly EMI (₹)</label>
                  <div className="input-with-action">
                    <input
                      type="number"
                      className="input-text"
                      placeholder="e.g. 24500"
                      value={formEmi}
                      onChange={(e) => setFormEmi(e.target.value)}
                    />
                    <button
                      type="button"
                      className="calc-btn"
                      onClick={handleAutoCalculateEmi}
                      title="Auto-calculate EMI from balance, rate & tenure"
                    >
                      Calc
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>EMI Due Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="input-text"
                  value={formDueDay}
                  onChange={(e) => setFormDueDay(e.target.value)}
                />
              </div>

              <div className="modal-btn-row">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowLoanModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-action-btn">
                  {editingLoan ? "Save Changes" : "Save Loan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
