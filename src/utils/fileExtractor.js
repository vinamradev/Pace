import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import { createWorker } from "tesseract.js";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Set worker source for PDF.js using local Vite asset URL with fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Direct binary PDF string & token extractor (fallback when PDF.js worker or fonts fail)
 */
export function extractTextFromPdfBinary(arrayBuffer) {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const latin1 = new TextDecoder("latin1").decode(bytes);
    const textPieces = [];

    // 1. Match Tj operators: (text) Tj
    const tjRegex = /\(([^()]{1,200})\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(latin1)) !== null) {
      const cleaned = match[1].replace(/\\([()\\])/g, "$1").trim();
      if (cleaned.length > 0) {
        textPieces.push(cleaned);
      }
    }

    // 2. Match TJ array operators: [ (text) -10 (more) ] TJ
    const tjArrayRegex = /\[([^\]]{1,500})\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(latin1)) !== null) {
      const inner = match[1];
      const stringMatches = inner.match(/\(([^()]*)\)/g) || [];
      const row = stringMatches
        .map((m) => m.slice(1, -1).replace(/\\([()\\])/g, "$1"))
        .join(" ")
        .trim();
      if (row.length > 0) {
        textPieces.push(row);
      }
    }

    // 3. Match Hex strings: <48656C6C6F> Tj
    const hexRegex = /<([0-9a-fA-F]{4,200})>\s*Tj/g;
    while ((match = hexRegex.exec(latin1)) !== null) {
      const hex = match[1];
      let decoded = "";
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substr(i, 2), 16);
        if (!isNaN(code) && code >= 32 && code <= 126) {
          decoded += String.fromCharCode(code);
        }
      }
      if (decoded.trim().length > 0) {
        textPieces.push(decoded.trim());
      }
    }

    if (textPieces.length > 0) {
      return textPieces.join("\n");
    }
  } catch (err) {
    console.warn("Direct PDF stream parser failed:", err);
  }
  return "";
}

/**
 * Extracts raw structured text from a PDF file page by page with multiple fallback layers
 */
export async function extractTextFromPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  let extractedText = "";

  // Strategy 1: PDF.js with disableFontFace and error guards
  try {
    if (onProgress) onProgress({ status: "Reading PDF document...", progress: 0.2 });

    const uint8 = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
      stopAtErrors: false,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages || 1;
    const allRows = [];

    for (let i = 1; i <= Math.min(numPages, 100); i++) {
      if (onProgress) {
        onProgress({
          status: `Reading PDF page ${i} of ${numPages}...`,
          progress: 0.2 + (i / numPages) * 0.6,
        });
      }

      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent({
          disableCombineTextItems: false,
        });
        const items = textContent?.items || [];

        // Filter valid text items with safe transform and string checks
        const validItems = items.filter(
          (item) =>
            item &&
            typeof item.str === "string" &&
            item.str.trim().length > 0 &&
            Array.isArray(item.transform) &&
            item.transform.length >= 6
        );

        if (validItems.length > 0) {
          const lineTolerance = 4;
          validItems.sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > lineTolerance) {
              return yDiff;
            }
            return a.transform[4] - b.transform[4];
          });

          const lines = [];
          let currentLine = null;

          for (const item of validItems) {
            const y = item.transform[5];
            const str = item.str.trim();
            if (!currentLine || Math.abs(currentLine.y - y) > lineTolerance) {
              currentLine = { y, items: [str] };
              lines.push(currentLine);
            } else {
              currentLine.items.push(str);
            }
          }

          for (const line of lines) {
            if (line.items && line.items.length > 0) {
              allRows.push(line.items.join(" , "));
            }
          }
        }
      } catch (pageErr) {
        console.warn(`Could not extract text from PDF page ${i}:`, pageErr);
        // Continue with other pages
      }
    }

    if (allRows.length > 0) {
      extractedText = allRows.join("\n");
    }
  } catch (pdfJsErr) {
    console.warn("PDF.js standard parse failed, falling back to direct stream parser:", pdfJsErr);
  }

  // Strategy 2: If PDF.js extracted text is empty or failed, use Binary PDF Stream Extractor
  if (!extractedText || extractedText.trim().length < 20) {
    if (onProgress) onProgress({ status: "Extracting text from PDF streams...", progress: 0.8 });
    const binaryText = extractTextFromPdfBinary(arrayBuffer);
    if (binaryText && binaryText.trim().length > 20) {
      extractedText = binaryText;
    }
  }

  // Strategy 3: Empty validation
  if (!extractedText || extractedText.trim().length < 10) {
    throw new Error(
      "Could not extract transaction text from this PDF. If your PDF is password-protected, please remove the password or export as Excel (.xlsx) / CSV or screenshot."
    );
  }

  return extractedText;
}

/**
 * Extracts CSV text from Excel spreadsheets (.xlsx, .xls, .ods)
 */
export async function extractCSVFromExcel(file, onProgress) {
  try {
    if (onProgress) onProgress({ status: "Reading Excel spreadsheet...", progress: 0.3 });

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true,
    });

    if (!workbook || !workbook.SheetNames || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
      throw new Error("No readable sheets found in this Excel file.");
    }

    if (onProgress) onProgress({ status: "Converting spreadsheet data...", progress: 0.7 });

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;
      const csv = XLSX.utils.sheet_to_csv(worksheet, {
        dateNF: "YYYY-MM-DD",
        blankrows: false,
      });

      if (csv && csv.trim().length > 10) {
        return csv;
      }
    }
  } catch (excelErr) {
    console.error("Excel extract failed:", excelErr);
    throw new Error(
      "Could not read Excel file: " + (excelErr.message || "Invalid or password-protected spreadsheet."),
      { cause: excelErr }
    );
  }

  throw new Error("No transaction rows found in the Excel spreadsheet.");
}

/**
 * Extracts text from an Image or Screenshot (GPay, PhonePe, Paytm, Bank App) using Tesseract OCR
 */
export async function extractTextFromScreenshot(file, onProgress) {
  let worker = null;
  try {
    if (onProgress) onProgress({ status: "Preparing screenshot...", progress: 0.2 });

    worker = await createWorker("eng");

    if (onProgress) onProgress({ status: "Scanning text from screenshot...", progress: 0.6 });

    const result = await worker.recognize(file);
    const text = result?.data?.text || "";

    if (onProgress) onProgress({ status: "Extracting transaction lines...", progress: 0.9 });
    return text;
  } catch (ocrErr) {
    console.error("Screenshot OCR failed:", ocrErr);
    throw new Error("Could not read text from screenshot: " + (ocrErr.message || "OCR engine error."), {
      cause: ocrErr,
    });
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore termination errors
      }
    }
  }
}

/**
 * Unified file processor that detects file type and extracts raw text/CSV
 */
export async function extractDataFromFile(file, onProgress) {
  if (!file) {
    throw new Error("No file provided.");
  }

  const fileName = (file.name || "").toLowerCase();
  const fileType = (file.type || "").toLowerCase();

  // 1. PDF Documents
  if (fileName.endsWith(".pdf") || fileType.includes("pdf")) {
    return {
      type: "pdf",
      data: await extractTextFromPDF(file, onProgress),
    };
  }

  // 2. Excel Spreadsheets (.xlsx, .xls, .ods)
  if (
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".ods") ||
    fileType.includes("spreadsheet") ||
    fileType.includes("excel")
  ) {
    return {
      type: "excel",
      data: await extractCSVFromExcel(file, onProgress),
    };
  }

  // 3. Images & App Screenshots (.png, .jpg, .jpeg, .webp)
  if (
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".webp") ||
    fileType.startsWith("image/")
  ) {
    return {
      type: "screenshot",
      data: await extractTextFromScreenshot(file, onProgress),
    };
  }

  // 4. Standard CSV & Plain Text
  return new Promise((resolve, reject) => {
    if (onProgress) onProgress({ status: "Reading text file...", progress: 0.5 });
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        type: "csv",
        data: e.target?.result || "",
      });
    };
    reader.onerror = () => reject(new Error("Failed to read text file."));
    reader.readAsText(file);
  });
}

/**
 * Sanitized CSV Exporter for User Transactions
 */
export function exportTransactionsToCSV(transactions = [], filename = "pace_transactions.csv") {
  if (!transactions || transactions.length === 0) {
    alert("No transactions available to export.");
    return;
  }

  const headers = [
    "Date",
    "Title",
    "Type",
    "Amount (INR)",
    "Category",
    "Major Head",
    "Merchant",
    "Account",
    "Payment Method",
    "Note",
  ];

  const rows = transactions.map((t) => [
    `"${t.date || ""}"`,
    `"${(t.title || "").replace(/"/g, '""')}"`,
    `"${t.type || "expense"}"`,
    t.amount || 0,
    `"${(t.category || "").replace(/"/g, '""')}"`,
    `"${(t.majorHead || "").replace(/"/g, '""')}"`,
    `"${(t.merchant || "").replace(/"/g, '""')}"`,
    `"${(t.account || "").replace(/"/g, '""')}"`,
    `"${(t.paymentMethod || "").replace(/"/g, '""')}"`,
    `"${(t.note || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Sanitized JSON Exporter for Complete PACE Financial Data Backup
 * Never exports passwords, secret tokens, or auth credentials
 */
export function exportFinancialDataJSON({ user, transactions = [], events = [], loans = [], goals = [], monthlyBudget, categoryBudgets }, filename = "pace_financial_backup.json") {
  const sanitizedBackup = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    profile: {
      name: user?.name || "",
      email: user?.email || "",
      currency: user?.currency || "INR",
      authProvider: user?.authProvider || "local",
    },
    monthlyBudget: Number(monthlyBudget || 0),
    categoryBudgets: categoryBudgets || {},
    transactionsCount: transactions.length,
    eventsCount: events.length,
    loansCount: loans.length,
    goalsCount: goals.length,
    transactions,
    events,
    loans,
    goals,
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sanitizedBackup, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
