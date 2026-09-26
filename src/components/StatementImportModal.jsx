import { useState } from "react";
import { extractDataFromFile } from "../utils/fileExtractor";
import { parseUniversalStatement } from "../utils/statementParser";

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
  const [progressInfo, setProgressInfo] = useState({ status: "", progress: 0 });
  const [error, setError] = useState("");
  const [activeFileName, setActiveFileName] = useState("");

  if (!isOpen) return null;

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setActiveFileName(file.name);
    setIsProcessing(true);
    setProgressInfo({ status: "Reading file...", progress: 0.1 });

    try {
      const extracted = await extractDataFromFile(file, (p) => {
        setProgressInfo(p);
      });

      setProgressInfo({ status: "Auto-categorizing transactions...", progress: 0.95 });

      const transactions = parseUniversalStatement(extracted.data, extracted.type);

      if (!transactions || transactions.length === 0) {
        setError(
          "No transactions could be parsed from this file. If it's a PDF bank statement, check if it's password-protected or try uploading an Excel (.xlsx) export or transaction screenshot."
        );
      } else {
        setParsedRows(transactions);
      }
    } catch (err) {
      console.error("Statement parse failed:", err);
      const msg = err.message || "";
      if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("encrypted")) {
        setError(
          "This PDF statement is password-protected. Please remove the password (or print/save to a new PDF) and re-upload, or upload an Excel (.xlsx) export."
        );
      } else {
        setError("Error processing file: " + (err.message || "Unknown error"));
      }
    } finally {
      setIsProcessing(false);
      setProgressInfo({ status: "", progress: 0 });
      // Clear input so same file can be selected again if needed
      e.target.value = "";
    }
  }

  function handlePastedSubmit() {
    if (!pastedText.trim()) {
      setError("Please paste your bank statement rows or UPI SMS text.");
      return;
    }

    setError("");
    setIsProcessing(true);

    try {
      const transactions = parseUniversalStatement(pastedText, "paste");
      if (transactions.length === 0) {
        setError(
          "Could not detect transactions from the pasted text. Please verify format (e.g. 24/09/2026, Swiggy, 450, Dr)."
        );
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
    setProgressInfo({ status: "", progress: 0 });
    setActiveFileName("");
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
                Upload Statement / Screenshot
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

            {isProcessing && (
              <div className="import-progress-box">
                <div className="spinner" style={{ margin: "0 auto 10px" }} />
                <strong>{progressInfo.status || "Analyzing file..."}</strong>
                <div className="import-progress-bar">
                  <div
                    className="import-progress-fill"
                    style={{ width: `${Math.round((progressInfo.progress || 0.2) * 100)}%` }}
                  />
                </div>
                <small style={{ color: "#71717a" }}>
                  {activeFileName ? `File: ${activeFileName}` : "Processing..."}
                </small>
              </div>
            )}

            {!isProcessing && tab === "file" && (
              <div>
                <div className="ocr-upload-area">
                  <input
                    type="file"
                    id="statement-file-input"
                    accept=".pdf,.xlsx,.xls,.csv,.txt,image/*"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <label htmlFor="statement-file-input" className="ocr-dropzone">
                    <div className="ocr-icon">📂</div>
                    <strong>Upload Statement or Screenshot</strong>
                    <p>
                      Directly import Bank PDFs, Excel sheets, CSVs, or GPay/PhonePe/Paytm screenshots
                    </p>
                    <span className="upload-browse-btn">Choose File or Image</span>
                  </label>
                </div>

                <div className="format-badges-grid">
                  <div className="format-badge">
                    <span className="format-badge-icon">📄</span>
                    <strong>Bank PDF</strong>
                    <small>HDFC, SBI, ICICI, Axis</small>
                  </div>
                  <div className="format-badge">
                    <span className="format-badge-icon">📊</span>
                    <strong>Excel / CSV</strong>
                    <small>.xlsx, .xls, .csv</small>
                  </div>
                  <div className="format-badge">
                    <span className="format-badge-icon">📱</span>
                    <strong>GPay Screen</strong>
                    <small>History screenshots</small>
                  </div>
                  <div className="format-badge">
                    <span className="format-badge-icon">⚡</span>
                    <strong>PhonePe / Paytm</strong>
                    <small>UPI payment images</small>
                  </div>
                </div>
              </div>
            )}

            {!isProcessing && tab === "paste" && (
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
                  Parse & Auto-Categorize
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
                  Selected: {selectedCount} | Expenses: ₹{totalExpense.toLocaleString("en-IN")}
                  {totalIncome > 0 && ` | Income: ₹${totalIncome.toLocaleString("en-IN")}`}
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
                          {row.type === "income" ? "+" : "-"}₹{row.amount.toLocaleString("en-IN")}
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
