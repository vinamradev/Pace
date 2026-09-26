import { useState } from "react";
import { scanReceipt } from "../utils/ocrScanner";

const CATEGORIES = [
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

export default function ReceiptScannerModal({ isOpen, onClose, onApplyTransaction }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ status: "", progress: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setImagePreview(URL.createObjectURL(file));
    setResult(null);

    // Auto-start scanning
    startScan(file);
  }

  async function startScan(file) {
    setIsScanning(true);
    setError("");
    setScanProgress({ status: "Preparing image...", progress: 0.1 });

    try {
      const scanData = await scanReceipt(file, (p) => setScanProgress(p));
      if (scanData.success) {
        setResult({
          title: scanData.merchant || "Receipt Purchase",
          amount: scanData.amount || "",
          category: scanData.category || "Shopping",
          date: scanData.date || new Date().toISOString().split("T")[0],
          paymentMethod: "Card",
          type: "expense",
        });
      } else {
        setError("Could not extract details clearly. Please check the fields below.");
        setResult({
          title: "Store Purchase",
          amount: "",
          category: "Shopping",
          date: new Date().toISOString().split("T")[0],
          paymentMethod: "UPI",
          type: "expense",
        });
      }
    } catch {
      setError("OCR scan encountered an issue. You can still fill in the details.");
    } finally {
      setIsScanning(false);
    }
  }

  function handleApply() {
    if (!result || !result.amount) {
      setError("Please enter the transaction amount.");
      return;
    }
    onApplyTransaction({
      title: result.title || "Bill Expense",
      amount: result.amount,
      category: result.category,
      date: result.date,
      paymentMethod: result.paymentMethod || "UPI",
      type: "expense",
      note: "Scanned via OCR Receipt Scanner",
    });
    handleClose();
  }

  function handleClose() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setResult(null);
    setIsScanning(false);
    setError("");
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal ocr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <div>
            <span>SMART RECEIPT OCR</span>
            <h2>Scan Bill / Receipt</h2>
          </div>
          <button className="close-btn" type="button" onClick={handleClose}>
            ✕
          </button>
        </div>

        {!imagePreview ? (
          <div className="ocr-upload-area">
            <input
              type="file"
              id="receipt-file-input"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <label htmlFor="receipt-file-input" className="ocr-dropzone">
              <div className="ocr-icon">📸</div>
              <strong>Take Photo or Upload Bill</strong>
              <p>Supports camera photos, restaurant bills, supermarket receipts, petrol slips</p>
              <span className="upload-browse-btn">Choose Image</span>
            </label>
          </div>
        ) : (
          <div className="ocr-active-content">
            <div className="ocr-preview-row">
              <img src={imagePreview} alt="Receipt preview" className="ocr-thumbnail" />
              <div className="ocr-preview-actions">
                <input
                  type="file"
                  id="receipt-file-reupload"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <label htmlFor="receipt-file-reupload" className="reupload-link">
                  📷 Retake / Choose Different Photo
                </label>
              </div>
            </div>

            {isScanning && (
              <div className="ocr-scanning-card">
                <div className="ocr-spinner-bar">
                  <div
                    className="ocr-progress-fill"
                    style={{ width: `${Math.round(scanProgress.progress * 100)}%` }}
                  />
                </div>
                <div className="ocr-status-text">
                  <span>{scanProgress.status || "Reading receipt details..."}</span>
                  <strong>{Math.round(scanProgress.progress * 100)}%</strong>
                </div>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            {result && !isScanning && (
              <div className="ocr-results-card">
                <div className="ocr-results-heading">
                  <span className="success-badge">✓ Extracted Details</span>
                  <small>Verify and adjust if needed</small>
                </div>

                <div className="ocr-field-grid">
                  <label>
                    Total Amount (₹)
                    <input
                      type="number"
                      placeholder="Amount"
                      value={result.amount}
                      onChange={(e) => setResult({ ...result, amount: e.target.value })}
                      autoFocus
                    />
                  </label>

                  <label>
                    Merchant / Store Name
                    <input
                      type="text"
                      placeholder="e.g. Starbucks, D-Mart"
                      value={result.title}
                      onChange={(e) => setResult({ ...result, title: e.target.value })}
                    />
                  </label>

                  <label>
                    Category
                    <select
                      value={result.category}
                      onChange={(e) => setResult({ ...result, category: e.target.value })}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Date
                    <input
                      type="date"
                      value={result.date}
                      onChange={(e) => setResult({ ...result, date: e.target.value })}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="submit-btn ocr-apply-btn"
                  onClick={handleApply}
                >
                  Save as Expense
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
