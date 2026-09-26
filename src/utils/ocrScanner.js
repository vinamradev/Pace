import { createWorker } from "tesseract.js";

const KNOWN_MERCHANT_CATEGORIES = {
  // Food & Dining
  zomato: "Food",
  swiggy: "Food",
  blinkit: "Food",
  zepto: "Food",
  mcdonald: "Food",
  starbucks: "Food",
  domino: "Food",
  kfc: "Food",
  subway: "Food",
  pizza: "Food",
  burger: "Food",
  cafe: "Food",
  restaurant: "Food",
  bakery: "Food",
  coffee: "Food",
  dhaba: "Food",

  // Shopping & Groceries
  dmart: "Shopping",
  "d-mart": "Shopping",
  reliance: "Shopping",
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  zara: "Shopping",
  "h&m": "Shopping",
  nykaa: "Shopping",
  decathlon: "Shopping",
  supermarket: "Shopping",
  mart: "Shopping",
  grocery: "Shopping",
  store: "Shopping",
  mall: "Shopping",

  // Transport & Fuel
  petrol: "Transport",
  fuel: "Transport",
  hpcl: "Transport",
  bpcl: "Transport",
  "indian oil": "Transport",
  shell: "Transport",
  uber: "Transport",
  ola: "Transport",
  rapido: "Transport",
  metro: "Transport",
  fastag: "Transport",
  parking: "Transport",

  // Health & Medicine
  apollo: "Health",
  pharmacy: "Health",
  chemist: "Health",
  hospital: "Health",
  clinic: "Health",
  "1mg": "Health",
  pharmeasy: "Health",
  medplus: "Health",
  medical: "Health",
  dental: "Health",

  // Bills & Utilities
  electricity: "Bills",
  bescom: "Bills",
  airtel: "Bills",
  jio: "Bills",
  broadband: "Bills",
  gas: "Bills",
  water: "Bills",
  rent: "Bills",

  // Entertainment
  pvr: "Entertainment",
  inox: "Entertainment",
  cinema: "Entertainment",
  bookmyshow: "Entertainment",
  netflix: "Entertainment",
  spotify: "Entertainment",
};

/**
 * Preprocesses an image to increase OCR accuracy using HTML Canvas
 */
async function preprocessImage(imageFileOrUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Scale up small images for better OCR resolution
        const scale = Math.max(1, Math.min(2.5, 1600 / Math.max(img.width, img.height)));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to high-contrast grayscale
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Binarize / contrast stretch
          const contrast = avg > 128 ? Math.min(255, avg * 1.15) : Math.max(0, avg * 0.85);
          data[i] = contrast;
          data[i + 1] = contrast;
          data[i + 2] = contrast;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        // Fallback to original image if canvas manipulation fails
        resolve(img.src);
      }
    };
    img.onerror = reject;

    if (typeof imageFileOrUrl === "string") {
      img.src = imageFileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => (img.src = e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(imageFileOrUrl);
    }
  });
}

/**
 * Scans a bill/receipt and extracts amount, merchant, date, and predicted category
 */
export async function scanReceipt(imageFile, onProgress) {
  let worker = null;
  try {
    if (onProgress) onProgress({ status: "Preprocessing image...", progress: 0.15 });

    const processedImageUrl = await preprocessImage(imageFile);

    if (onProgress) onProgress({ status: "Loading OCR engine...", progress: 0.3 });

    worker = await createWorker("eng");

    if (onProgress) onProgress({ status: "Scanning text from receipt...", progress: 0.6 });

    const result = await worker.recognize(processedImageUrl);
    const text = result.data.text || "";

    if (onProgress) onProgress({ status: "Analyzing receipt details...", progress: 0.9 });

    const extracted = parseReceiptText(text);

    if (onProgress) onProgress({ status: "Completed!", progress: 1.0 });

    return {
      success: true,
      rawText: text,
      ...extracted,
    };
  } catch (error) {
    console.error("Receipt OCR failed:", error);
    return {
      success: false,
      error: error.message || "Failed to scan receipt",
      amount: "",
      merchant: "Receipt Expense",
      date: new Date().toISOString().split("T")[0],
      category: "Other",
      confidence: 0,
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Extracts structured transaction details from raw OCR text
 */
export function parseReceiptText(rawText) {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let detectedAmount = 0;
  let detectedDate = "";
  let detectedMerchant = "";
  let detectedCategory = "Shopping";

  // 1. Extract Amount: look for lines containing TOTAL, GRAND TOTAL, NET, PAID, AMOUNT, RS, INR, ₹
  const totalKeywords = [
    /grand\s*total/i,
    /net\s*total/i,
    /total\s*amount/i,
    /amount\s*paid/i,
    /total/i,
    /net\s*amt/i,
    /balance\s*due/i,
    /subtotal/i,
  ];

  const amountCandidates = [];

  for (const line of lines) {
    // Check if line matches any total keyword
    const hasTotalKeyword = totalKeywords.some((regex) => regex.test(line));

    // Extract all numbers that look like prices (e.g., 450, 450.00, 1,250.50)
    const matches = line.match(/(?:(?:INR|Rs\.?|₹)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi);

    if (matches) {
      for (const m of matches) {
        const cleanNum = parseFloat(m.replace(/[^0-9.]/g, ""));
        if (!isNaN(cleanNum) && cleanNum > 0 && cleanNum < 500000) {
          amountCandidates.push({
            amount: cleanNum,
            priority: hasTotalKeyword ? 10 : 1,
            line,
          });
        }
      }
    }
  }

  // Sort candidates by priority (lines with TOTAL keyword first, then by largest plausible amount)
  if (amountCandidates.length > 0) {
    const totalLines = amountCandidates.filter((c) => c.priority === 10);
    if (totalLines.length > 0) {
      // Pick the highest amount from the total lines (avoids tax/subtotal lines)
      totalLines.sort((a, b) => b.amount - a.amount);
      detectedAmount = totalLines[0].amount;
    } else {
      // Pick the highest plausible amount from the receipt
      amountCandidates.sort((a, b) => b.amount - a.amount);
      detectedAmount = amountCandidates[0].amount;
    }
  }

  // 2. Extract Date: look for common date formats
  const dateRegexes = [
    /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/, // DD/MM/YYYY or DD-MM-YYYY
    /\b(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\b/, // YYYY/MM/DD
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})\b/i, // DD Mon YYYY
  ];

  for (const line of lines) {
    for (const regex of dateRegexes) {
      const match = line.match(regex);
      if (match) {
        try {
          const parsed = new Date(match[0]);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2035) {
            detectedDate = parsed.toISOString().split("T")[0];
            break;
          }
        } catch {
          // Continue searching
        }
      }
    }
    if (detectedDate) break;
  }

  if (!detectedDate) {
    detectedDate = new Date().toISOString().split("T")[0];
  }

  // 3. Extract Merchant Name: look at the top 5 lines of the receipt
  const ignorePatterns = [
    /tax\s*invoice/i,
    /cash\s*memo/i,
    /retail\s*invoice/i,
    /gstin/i,
    /bill\s*no/i,
    /receipt/i,
    /welcome/i,
    /date/i,
    /tel/i,
    /phone/i,
    /order/i,
    /table/i,
  ];

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.length >= 3 && !ignorePatterns.some((pattern) => pattern.test(line))) {
      // Clean up special characters
      const cleaned = line.replace(/[^a-zA-Z0-9\s&'-]/g, "").trim();
      if (cleaned.length >= 3) {
        detectedMerchant = cleaned;
        break;
      }
    }
  }

  if (!detectedMerchant && lines.length > 0) {
    detectedMerchant = lines[0].slice(0, 24);
  }

  // 4. Auto-Categorize by scanning text against keyword dictionary
  const fullTextLower = rawText.toLowerCase();
  for (const [keyword, category] of Object.entries(KNOWN_MERCHANT_CATEGORIES)) {
    if (fullTextLower.includes(keyword)) {
      detectedCategory = category;
      break;
    }
  }

  return {
    amount: detectedAmount ? detectedAmount.toString() : "",
    merchant: detectedMerchant || "Store Purchase",
    date: detectedDate,
    category: detectedCategory,
  };
}
