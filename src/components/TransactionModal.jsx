import React, { useState, useEffect } from "react";
import {
  TRANSACTION_TYPES,
  MAJOR_HEADS,
  getMajorHead,
} from "../utils/financialEngine";

const TYPE_CATEGORIES = {
  expense: ["Food", "Shopping", "Transport", "Bills", "Rent", "Entertainment", "Health", "Education", "Wedding", "Other"],
  income: ["Salary", "Freelance", "Investment", "Business", "Bonus", "Rental Income", "Gift", "Other"],
  savings: ["Emergency Fund", "Fixed Deposit", "Recurring Deposit", "Savings Account", "Other"],
  investment: ["Mutual Fund SIP", "Stocks", "PPF / EPF", "Gold", "Crypto", "Real Estate", "Other"],
  debt_repayment: ["Home Loan EMI", "Car Loan EMI", "Personal Loan EMI", "Credit Card Bill", "Education Loan EMI", "Debt Repayment"],
  transfer: ["Bank Transfer", "Self Transfer", "Wallet Topup", "Other"],
  cash_withdrawal: ["ATM Withdrawal", "Cash Out", "Other"],
};

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  events = [],
  loans = [],
  initialData = null,
  onOpenOcr,
}) {
  const [type, setType] = useState("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [majorHead, setMajorHead] = useState("Essentials");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [note, setNote] = useState("");
  const [eventId, setEventId] = useState("");
  const [loanId, setLoanId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestAmount, setInterestAmount] = useState("");
  const [fromAccount, setFromAccount] = useState("HDFC Bank");
  const [toAccount, setToAccount] = useState("SBI Savings");

  useEffect(() => {
    if (initialData) {
      setType(initialData.type || "expense");
      setTitle(initialData.title || "");
      setAmount(initialData.amount ? String(initialData.amount) : "");
      setCategory(initialData.category || "Food");
      setMajorHead(initialData.majorHead || getMajorHead(initialData.category || "Food", initialData.type || "expense"));
      setDate(initialData.date || new Date().toISOString().slice(0, 10));
      setPaymentMethod(initialData.paymentMethod || "UPI");
      setNote(initialData.note || "");
      setEventId(initialData.eventId || "");
      setLoanId(initialData.loanId || "");
      setPrincipalAmount(initialData.principalAmount ? String(initialData.principalAmount) : "");
      setInterestAmount(initialData.interestAmount ? String(initialData.interestAmount) : "");
      setFromAccount(initialData.fromAccount || "HDFC Bank");
      setToAccount(initialData.toAccount || "SBI Savings");
    } else {
      setType("expense");
      setTitle("");
      setAmount("");
      setCategory("Food");
      setMajorHead("Essentials");
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("UPI");
      setNote("");
      setEventId("");
      setLoanId("");
      setPrincipalAmount("");
      setInterestAmount("");
    }
  }, [initialData, isOpen]);

  // When type changes, adjust default category & major head
  function handleTypeChange(newType) {
    setType(newType);
    const available = TYPE_CATEGORIES[newType] || ["Other"];
    const newCat = available[0];
    setCategory(newCat);
    setMajorHead(getMajorHead(newCat, newType));
  }

  // When category changes, adjust default major head
  function handleCategoryChange(newCat) {
    setCategory(newCat);
    setMajorHead(getMajorHead(newCat, type));
  }

  // Handle amount change and auto principal/interest split for loan
  function handleAmountChange(val) {
    setAmount(val);
    if (type === "debt_repayment" && loanId) {
      const selectedLoan = loans.find((l) => l.id === loanId);
      if (selectedLoan && Number(val) > 0) {
        // Approximate split based on current interest
        const monthlyRate = Number(selectedLoan.interestRate || 8.5) / 12 / 100;
        const interest = Math.round(Number(selectedLoan.currentOutstanding || 0) * monthlyRate);
        const principal = Math.max(0, Number(val) - interest);
        setInterestAmount(String(interest));
        setPrincipalAmount(String(principal));
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      alert("Please provide a valid title and amount.");
      return;
    }

    const payload = {
      id: initialData?.id || Date.now(),
      title: title.trim(),
      amount: numAmount,
      type,
      category,
      majorHead,
      date: date || new Date().toISOString().slice(0, 10),
      paymentMethod,
      note: note.trim(),
      eventId: eventId || null,
      loanId: loanId || null,
      principalAmount: principalAmount ? Number(principalAmount) : null,
      interestAmount: interestAmount ? Number(interestAmount) : null,
      fromAccount: type === "transfer" ? fromAccount : undefined,
      toAccount: type === "transfer" ? toAccount : undefined,
      icon:
        type === "income"
          ? "💰"
          : type === "savings"
          ? "🏦"
          : type === "investment"
          ? "📈"
          : type === "debt_repayment"
          ? "💳"
          : type === "transfer"
          ? "🔁"
          : type === "cash_withdrawal"
          ? "💵"
          : "💸",
    };

    onSubmit(payload);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal tx-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <div>
            <span>PACE FINANCIAL CONTROL</span>
            <h2>{initialData ? "Edit Transaction" : "Add Transaction"}</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* 7 Transaction Type Selector Chips */}
        <div className="tx-type-chips-wrapper">
          <div className="tx-type-chips">
            {TRANSACTION_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tx-type-chip ${type === t.id ? "active" : ""}`}
                style={type === t.id ? { borderColor: t.color, backgroundColor: `${t.color}20` } : {}}
                onClick={() => handleTypeChange(t.id)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {onOpenOcr && (
          <button
            type="button"
            className="ocr-quick-trigger-btn"
            onClick={() => {
              onClose();
              onOpenOcr();
            }}
          >
            📸 Scan Bill / Receipt (Instant AI Autofill)
          </button>
        )}

        <form onSubmit={handleSubmit} className="tx-form">
          {/* Title & Amount */}
          <div className="form-group">
            <label>Title / Description</label>
            <input
              type="text"
              className="input-text"
              placeholder={
                type === "income"
                  ? "e.g. Monthly Salary, Freelance"
                  : type === "debt_repayment"
                  ? "e.g. SBI Home Loan EMI"
                  : type === "investment"
                  ? "e.g. Nifty 50 SIP"
                  : "e.g. Blinkit Groceries, Zomato"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                className="input-text amount-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                className="input-text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category & Major Head */}
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                className="input-select"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {(TYPE_CATEGORIES[type] || ["Other"]).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Major Head</label>
              <select
                className="input-select"
                value={majorHead}
                onChange={(e) => setMajorHead(e.target.value)}
              >
                {MAJOR_HEADS.map((head) => (
                  <option key={head.id} value={head.id}>
                    {head.icon} {head.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contextual Link: Debt / Loan Split */}
          {type === "debt_repayment" && (
            <div className="contextual-link-box">
              <div className="form-group">
                <label>Link to Loan / EMI</label>
                <select
                  className="input-select"
                  value={loanId}
                  onChange={(e) => setLoanId(e.target.value)}
                >
                  <option value="">None / General Repayment</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.icon} {l.name} ({l.lender})
                    </option>
                  ))}
                </select>
              </div>

              {loanId && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Principal Component (₹)</label>
                    <input
                      type="number"
                      className="input-text"
                      placeholder="e.g. 11200"
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Interest Component (₹)</label>
                    <input
                      type="number"
                      className="input-text"
                      placeholder="e.g. 13300"
                      value={interestAmount}
                      onChange={(e) => setInterestAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contextual Link: Event / Wedding Milestone */}
          {events.length > 0 && type !== "debt_repayment" && (
            <div className="contextual-link-box">
              <div className="form-group">
                <label>Tag Milestone Event (Optional)</label>
                <select
                  className="input-select"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                >
                  <option value="">None</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.icon} {ev.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Contextual: Transfer From/To Accounts */}
          {type === "transfer" && (
            <div className="form-row">
              <div className="form-group">
                <label>From Account</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. HDFC Salary A/c"
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>To Account</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. SBI Savings A/c"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Payment Method</label>
              <select
                className="input-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
                <option value="Auto-Debit">Auto-Debit / NACH</option>
              </select>
            </div>

            <div className="form-group">
              <label>Note / Tag (Optional)</label>
              <input
                type="text"
                className="input-text"
                placeholder="e.g. Sabyasachi outfit, bill"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-btn-row">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-action-btn">
              {initialData ? "Save Changes" : "Record Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
