import { useState } from "react";
import { parseCSVStatement, parseRawTextStatement } from "../utils/statementParser";

const CATEGORIES = [
  "Food",
  "Shopping",
  "Transport",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Subscriptions",
  "Salary",
  "Income",
  "Investment",
  "Other",
];

export default function StatementImportModal({ isOpen, onClose, onImportTransactions }) {
  const [tab, setTab] = useState("file");
  const [pastedText, setPastedText] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result || "";
        const transactions = parseCSVStatement(content);

        if (transactions.length === 0) {
          setError("No valid transactions found in this file. Please verify it's a CSV statement.");
        } else {
          setParsedRows(transactions);
        }
      } catch (err) {
        setError("Error parsing statement file: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }

  function handlePastedSubmit() {
    if (!pastedText.trim()) {
      setError("Please paste your bank or UPI statement text.");
      return;
    }

    setError("");
    setIsProcessing(true);

    try {
      const transactions = parseRawTextStatement(pastedText);
      if (transactions.length === 0) {
        setError("Could not parse any transactions from the text. Check the format or paste CSV rows.");
      } else {
        setParsedRows(transactions);
      }
    } catch (err) {
      setError("Error parsing text: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  function toggleRowSelection(id) {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  }

  function toggleAllSelection(selectAll) {
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: selectAll })));
  }

  function updateRowCategory(id, newCat) {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, category: newCat } : r))
    );
  }

  function handleImportSubmit() {
    const selected = parsedRows.filter((r) => r.selected);
    if (selected.length === 0) {
      setError("Please select at least one transaction to import.");
      return;
    }

    onImportTransactions(selected);
    handleClose();
  }

  function handleClose() {
    setParsedRows([]);
    setPastedText("");
    setError("");
    setIsProcessing(false);
    onClose();
  }

  const selectedCount = parsedRows.filter((r) => r.selected).length;
  const totalExpense = parsedRows
    .filter((r) => r.selected && r.type === "expense")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalIncome = parsedRows
    .filter((r) => r.selected && r.type === "income")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal statement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <div>
            <span>SMART STATEMENT PARSER</span>
            <h2>Import Bank & GPay</h2>
          </div>
          <button className="close-btn" type="button" onClick={handleClose}>
            ✕
          </button>
        </div>

        {parsedRows.length === 0 ? (
          <div>
            <div className="auth-tabs" style={{ marginBottom: "16px" }}>
              <button
                type="button"
                className={`auth-tab ${tab === "file" ? "active" : ""}`}
                onClick={() => setTab("file")}
              >
                Upload File (.csv)
              </button>
              <button
                type="button"
                className={`auth-tab ${tab === "paste" ? "active" : ""}`}
                onClick={() => setTab("paste")}
              >
                Paste Text / SMS
              </button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            {tab === "file" ? (
              <div className="ocr-upload-area">
                <input
                  type="file"
                  id="statement-csv-input"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                <label htmlFor="statement-csv-input" className="ocr-dropzone">
                  <div className="ocr-icon">📄</div>
                  <strong>Upload GPay / Bank Statement CSV</strong>
                  <p>Supports Google Pay, PhonePe, Paytm, HDFC, SBI, ICICI, Axis, Kotak exports</p>
                  <span className="upload-browse-btn">Choose CSV File</span>
                </label>
              </div>
            ) : (
              <div className="statement-paste-box">
                <textarea
                  rows={8}
                  placeholder={`Paste statement rows or UPI SMS here, for example:
01/10/2026, Zomato Bangalore, 420.00, Dr
02/10/2026, Swiggy Instamart, 350.00, Dr
03/10/2026, Salary Credit Oct, 45000.00, Cr
04/10/2026, Uber India, 180.00, Dr`}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="statement-textarea"
                />
                <button
                  type="button"
                  className="submit-btn"
                  style={{ marginTop: "12px" }}
                  onClick={handlePastedSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Parsing..." : "Parse & Auto-Categorize"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="statement-preview-container">
            <div className="statement-summary-banner">
              <div>
                <strong>{parsedRows.length} Transactions Detected</strong>
                <small>
                  Selected: {selectedCount} | Expenses: ₹{totalExpense.toLocaleString()}
                  {totalIncome > 0 && ` | Income: ₹${totalIncome.toLocaleString()}`}
                </small>
              </div>
              <div className="statement-select-buttons">
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => toggleAllSelection(true)}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => toggleAllSelection(false)}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="statement-table-wrapper">
              <div className="statement-table">
                {parsedRows.map((row) => (
                  <div
                    key={row.id}
                    className={`statement-row ${row.selected ? "selected" : ""}`}
                    onClick={() => toggleRowSelection(row.id)}
                  >
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => toggleRowSelection(row.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="statement-row-info">
                      <div className="statement-row-title">
                        <strong>{row.title}</strong>
                        <span className={`statement-amt ${row.type}`}>
                          {row.type === "income" ? "+" : "-"}₹{row.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="statement-row-meta">
                        <small>{row.date}</small>
                        <select
                          value={row.category}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateRowCategory(row.id, e.target.value)}
                          className="statement-cat-select"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="statement-action-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setParsedRows([])}
              >
                Back / Reset
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={handleImportSubmit}
              >
                Import {selectedCount} Transactions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
