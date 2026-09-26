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
 * Extracts raw structured text from a PDF file page by page
 */
export async function extractTextFromPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const allRows = [];

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress({
        status: `Reading PDF page ${i} of ${numPages}...`,
        progress: 0.1 + (i / numPages) * 0.7,
      });
    }

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items || [];

    // Filter valid text items
    const validItems = items.filter(
      (item) => item.str && item.str.trim().length > 0
    );

    // Group items into rows based on vertical Y coordinate (tolerance ~4 points)
    const lineTolerance = 4;
    validItems.sort((a, b) => {
      // Y is inverted in PDF (higher y is higher on the page)
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
      if (!currentLine || Math.abs(currentLine.y - y) > lineTolerance) {
        currentLine = { y, items: [item.str.trim()] };
        lines.push(currentLine);
      } else {
        currentLine.items.push(item.str.trim());
      }
    }

    // Convert each line into a CSV/spaced row
    for (const line of lines) {
      if (line.items.length > 0) {
        // If items are separate columns, join with comma
        allRows.push(line.items.join(" , "));
      }
    }
  }

  return allRows.join("\n");
}

/**
 * Extracts CSV text from Excel spreadsheets (.xlsx, .xls, .ods)
 */
export async function extractCSVFromExcel(file, onProgress) {
  if (onProgress) onProgress({ status: "Reading Excel spreadsheet...", progress: 0.3 });

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
  });

  if (onProgress) onProgress({ status: "Converting spreadsheet data...", progress: 0.7 });

  // Find the first sheet that has content
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet, {
      dateNF: "YYYY-MM-DD",
      blankrows: false,
    });

    if (csv && csv.trim().length > 20) {
      return csv;
    }
  }

  throw new Error("No data found in the Excel spreadsheet.");
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
    const text = result.data.text || "";

    if (onProgress) onProgress({ status: "Extracting transaction lines...", progress: 0.9 });
    return text;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Unified file processor that detects file type and extracts raw text/CSV
 */
export async function extractDataFromFile(file, onProgress) {
  const fileName = (file.name || "").toLowerCase();
  const fileType = (file.type || "").toLowerCase();

  // 1. PDF Documents
  if (fileName.endsWith(".pdf") || fileType.includes("pdf")) {
    return {
      type: "pdf",
      data: await extractTextFromPDF(file, onProgress),
    };
  }

  // 2. Excel Spreadsheets (.xlsx, .xls, .csv)
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
