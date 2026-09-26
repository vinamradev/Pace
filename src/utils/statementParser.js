// Comprehensive dictionary mapping merchant and bank narration keywords to PACE categories
const CATEGORY_RULES = [
  // Food & Dining
  {
    category: "Food",
    keywords: [
      "zomato",
      "swiggy",
      "blinkit",
      "zepto",
      "instamart",
      "mcdonald",
      "domino",
      "pizza",
      "burger",
      "starbucks",
      "kfc",
      "subway",
      "cafe",
      "coffee",
      "tea",
      "chai",
      "bakery",
      "restaurant",
      "dhaba",
      "biryani",
      "haldiram",
      "bikanervala",
      "dunkin",
      "barbeque",
      "food",
      "kitchen",
      "eatery",
      "canteen",
    ],
  },
  // Shopping & E-Commerce
  {
    category: "Shopping",
    keywords: [
      "amazon",
      "flipkart",
      "myntra",
      "ajio",
      "zara",
      "h&m",
      "nykaa",
      "dmart",
      "d-mart",
      "reliance",
      "smart point",
      "retail",
      "supermarket",
      "croma",
      "vijay sales",
      "tatacliq",
      "decathlon",
      "ikea",
      "uniqlo",
      "westside",
      "pantaloons",
      "shoppers stop",
      "lulu",
      "trends",
      "groceries",
      "bazaar",
      "store",
      "clothing",
      "fashion",
    ],
  },
  // Transport, Travel & Fuel
  {
    category: "Transport",
    keywords: [
      "uber",
      "ola",
      "rapido",
      "metro",
      "dmrc",
      "bmrc",
      "irctc",
      "railway",
      "petrol",
      "fuel",
      "hpcl",
      "bpcl",
      "indian oil",
      "ioc",
      "shell",
      "cng",
      "fastag",
      "toll",
      "indigo",
      "air india",
      "spicejet",
      "vistara",
      "makemytrip",
      "goibibo",
      "cleartrip",
      "redbus",
      "abhibus",
      "flight",
      "airline",
      "auto",
      "cab",
      "parking",
    ],
  },
  // Bills & Utilities
  {
    category: "Bills",
    keywords: [
      "airtel",
      "jio",
      "vi",
      "vodafone",
      "bsnl",
      "electricity",
      "bescom",
      "tata power",
      "adani",
      "cesc",
      "gas",
      "igl",
      "mahanagar",
      "water",
      "broadband",
      "act fibernet",
      "hathway",
      "dth",
      "tata play",
      "tata sky",
      "dish tv",
      "billdesk",
      "bbps",
      "cred",
      "rent",
      "society",
      "maintenance",
      "recharge",
    ],
  },
  // Subscriptions & Recurring
  {
    category: "Subscriptions",
    keywords: [
      "netflix",
      "spotify",
      "prime video",
      "hotstar",
      "disney",
      "youtube",
      "apple.com/bill",
      "google play",
      "chatgpt",
      "openai",
      "github",
      "medium",
      "playstation",
      "xbox",
      "membership",
      "autopay",
      "standing instruction",
    ],
  },
  // Entertainment & Leisure
  {
    category: "Entertainment",
    keywords: [
      "bookmyshow",
      "pvr",
      "inox",
      "cinepolis",
      "cinema",
      "movie",
      "theatre",
      "gaming",
      "steam",
      "playstation",
      "resort",
      "club",
      "pub",
      "brewery",
      "bar",
      "lounge",
    ],
  },
  // Health & Medical
  {
    category: "Health",
    keywords: [
      "apollo",
      "pharmeasy",
      "1mg",
      "tata 1mg",
      "netmeds",
      "medplus",
      "pharmacy",
      "chemist",
      "hospital",
      "clinic",
      "diagnostic",
      "pathology",
      "dr.",
      "doctor",
      "dental",
      "opticals",
      "lenskart",
      "gym",
      "cult.fit",
      "fitness",
      "medication",
    ],
  },
  // Education
  {
    category: "Education",
    keywords: [
      "udemy",
      "coursera",
      "unacademy",
      "byju",
      "scaler",
      "upgrad",
      "college",
      "school",
      "university",
      "tuition",
      "fees",
      "exam",
      "books",
      "library",
    ],
  },
  // Income & Salary
  {
    category: "Salary",
    keywords: [
      "salary",
      "payroll",
      "stipend",
      "bonus",
      "wages",
    ],
  },
  // Investments
  {
    category: "Investment",
    keywords: [
      "zerodha",
      "groww",
      "upstox",
      "angel one",
      "coin",
      "kuvera",
      "mutual fund",
      "sip",
      "nse",
      "bse",
      "dividend",
      "interest cr",
    ],
  },
];

/**
 * Predicts category based on transaction title or narration text
 */
export function predictCategory(narration) {
  if (!narration) return "Other";
  const lower = narration.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        return rule.category;
      }
    }
  }

  return "Other";
}

/**
 * Cleans ugly bank/UPI narration into a crisp human-readable merchant title
 */
export function cleanMerchantTitle(rawNarration) {
  if (!rawNarration) return "Transaction";

  let text = rawNarration.trim();

  // Strip UPI codes like UPI/412345678901/...
  text = text.replace(/^UPI\s*[-/:]?\s*\d*\s*[-/:]?\s*/i, "");
  // Strip POS codes like POS 41234567 ...
  text = text.replace(/^POS\s*\d*\s*[-/:]?\s*/i, "");
  // Strip NEFT/IMPS prefixes
  text = text.replace(/^(?:NEFT|IMPS|RTGS|ACH|NACH|INB|MB)\s*[-/:]?\s*[A-Z0-9]*\s*[-/:]?\s*/i, "");

  // If contains forward slashes, take the most meaningful segment
  if (text.includes("/")) {
    const parts = text.split("/").map((p) => p.trim()).filter((p) => p.length > 2);
    // Find a part that looks like a name (not all numbers or bank codes)
    const namePart = parts.find((p) => !/^\d+$/.test(p) && !/^[A-Z0-9]{12,}$/.test(p));
    if (namePart) text = namePart;
  }

  // Remove trailing bank identifiers like @okaxis, @icici, @paytm, @ybl
  text = text.replace(/@[a-zA-Z0-9._-]+/g, "");

  // Remove common filler words
  text = text.replace(/\b(?:Pvt\s*Ltd|Limited|Private|LLP|India|Paytm|GooglePay|PhonePe)\b/gi, "").trim();

  // Remove multiple spaces and trailing hyphens
  text = text.replace(/[-_]+/g, " ").replace(/\s{2,}/g, " ").trim();

  // Title case first letter
  if (text.length > 0) {
    return text.charAt(0).toUpperCase() + text.slice(1, 30);
  }

  return rawNarration.slice(0, 24);
}

const MONTH_NAMES = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

/**
 * Normalizes any Indian bank/UPI date string into ISO YYYY-MM-DD
 */
export function parseIndianDate(rawDate) {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  const str = rawDate.trim();

  // 1. ISO format: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 2. Named month format: 24 Sep 2026, 24-OCT-2026, 24-Oct-26, 24/Sep/2026
  const textMonthMatch = str.match(/(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/\s]+(\d{2,4})/);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, "0");
    const mStr = textMonthMatch[2].toLowerCase();
    const month = MONTH_NAMES[mStr] || "01";
    let year = textMonthMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // 3. Numeric format: DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
  const numMatch = str.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10);
    const p2 = parseInt(numMatch[2], 10);
    let year = numMatch[3];
    if (year.length === 2) year = `20${year}`;

    let day;
    let month;
    if (p1 > 12) {
      // p1 is definitely day
      day = String(p1).padStart(2, "0");
      month = String(p2).padStart(2, "0");
    } else if (p2 > 12) {
      // p2 is day, p1 is month
      day = String(p2).padStart(2, "0");
      month = String(p1).padStart(2, "0");
    } else {
      // Default Indian banking standard: DD/MM/YYYY
      day = String(p1).padStart(2, "0");
      month = String(p2).padStart(2, "0");
    }

    return `${year}-${month}-${day}`;
  }

  // Fallback to Date parse if standard
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2035) {
      return d.toISOString().split("T")[0];
    }
  } catch {
    // Keep fallback
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * Parses CSV or tabular text into structured transactions
 */
export function parseCSVStatement(csvText) {
  if (!csvText) return [];
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter: comma, semicolon, tab, or spaced comma
  const sample = lines.slice(0, 5).join("\n");
  const commaCount = (sample.match(/,/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;

  let delimiter = ",";
  if (tabCount > commaCount && tabCount > semiCount) delimiter = "\t";
  else if (semiCount > commaCount) delimiter = ";";

  // Helper to split CSV line considering quotes
  function parseCSVLine(line) {
    if (delimiter === "\t") {
      return line.split("\t").map((c) => c.trim().replace(/^"|"$/g, ""));
    }

    const values = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ""));
    return values;
  }

  // Find header row index (scanning up to 60 lines for bank statements with top customer meta)
  let headerIndex = -1;
  let headers = [];

  const commonHeaderKeywords = [
    "date",
    "txn date",
    "trans date",
    "value date",
    "description",
    "narration",
    "particulars",
    "remarks",
    "amount",
    "debit",
    "dr",
    "withdrawal",
    "credit",
    "cr",
    "deposit",
    "paid to",
  ];

  for (let i = 0; i < Math.min(60, lines.length); i++) {
    const row = parseCSVLine(lines[i]).map((h) => h.toLowerCase());
    const matches = commonHeaderKeywords.filter((kw) => row.some((col) => col.includes(kw)));
    if (matches.length >= 2) {
      headerIndex = i;
      headers = row;
      break;
    }
  }

  if (headerIndex === -1) {
    headers = ["date", "narration", "amount"];
    headerIndex = -1;
  }

  // Map column indexes
  const dateCol = headers.findIndex(
    (h) => h.includes("date") || h.includes("txn date") || h.includes("time") || h.includes("value dt")
  );
  const descCol = headers.findIndex(
    (h) =>
      h.includes("description") ||
      h.includes("narration") ||
      h.includes("particulars") ||
      h.includes("remarks") ||
      h.includes("paid to") ||
      h.includes("details")
  );
  const amountCol = headers.findIndex(
    (h) => (h.includes("amount") || h === "amt") && !h.includes("balance") && !h.includes("bal")
  );
  const debitCol = headers.findIndex(
    (h) => h.includes("debit") || h.includes("withdrawal") || h === "dr" || h.includes("dr amt")
  );
  const creditCol = headers.findIndex(
    (h) => h.includes("credit") || h.includes("deposit") || h === "cr" || h.includes("cr amt")
  );
  const typeCol = headers.findIndex(
    (h) => h === "type" || h.includes("txn type") || h.includes("cr/dr") || h.includes("dr/cr")
  );

  const transactions = [];
  const ignoreKeywords = [
    "opening balance",
    "closing balance",
    "total debit",
    "total credit",
    "brought forward",
    "carried forward",
    "b/f",
    "c/f",
    "statement summary",
  ];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const rawDate = dateCol >= 0 && cols[dateCol] ? cols[dateCol] : "";
    const rawDesc = descCol >= 0 && cols[descCol] ? cols[descCol] : cols[1] || "";

    // Skip summary / opening balance rows
    const lowerDesc = rawDesc.toLowerCase();
    if (ignoreKeywords.some((ik) => lowerDesc.includes(ik))) continue;

    let amount = 0;
    let type = "expense";

    // Determine amount and type
    if (debitCol >= 0 && creditCol >= 0) {
      const debitRaw = (cols[debitCol] || "0").replace(/[^0-9.]/g, "");
      const creditRaw = (cols[creditCol] || "0").replace(/[^0-9.]/g, "");
      const debitVal = parseFloat(debitRaw) || 0;
      const creditVal = parseFloat(creditRaw) || 0;

      if (creditVal > 0) {
        amount = creditVal;
        type = "income";
      } else if (debitVal > 0) {
        amount = debitVal;
        type = "expense";
      }
    } else if (amountCol >= 0) {
      const rawAmt = cols[amountCol] || "0";
      const cleanAmt = parseFloat(rawAmt.replace(/[^0-9.]/g, ""));
      if (!isNaN(cleanAmt)) amount = cleanAmt;

      if (typeCol >= 0) {
        const typeVal = (cols[typeCol] || "").toLowerCase();
        if (typeVal.includes("cr") || typeVal.includes("credit") || typeVal.includes("receive")) {
          type = "income";
        }
      } else if (
        rawAmt.startsWith("+") ||
        rawAmt.toLowerCase().includes("cr") ||
        lowerDesc.includes("refund") ||
        lowerDesc.includes("cashback") ||
        lowerDesc.includes("salary") ||
        lowerDesc.includes("credited")
      ) {
        type = "income";
      }
    } else {
      // Fallback: check all columns for currency amount
      for (const col of cols) {
        const match = col.match(/(?:(?:INR|Rs\.?|₹)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
        if (match) {
          const val = parseFloat(match[1].replace(/,/g, ""));
          if (!isNaN(val) && val > 0 && val < 10000000) {
            amount = val;
            break;
          }
        }
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) continue;

    const formattedDate = parseIndianDate(rawDate);
    const title = cleanMerchantTitle(rawDesc);
    const category = type === "income" ? "Income" : predictCategory(rawDesc);

    transactions.push({
      id: "imp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title,
      amount,
      type,
      category,
      date: formattedDate,
      paymentMethod: "Bank / GPay",
      note: rawDesc,
      selected: true,
    });
  }

  return transactions;
}

/**
 * Parses screenshot OCR text from GPay, PhonePe, Paytm, or Mobile Banking apps
 */
export function parseScreenshotStatement(ocrText) {
  if (!ocrText) return [];
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const transactions = [];

  const consumedLines = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (consumedLines.has(i)) continue;

    const line = lines[i];
    const lower = line.toLowerCase();

    // Check for payment indicator words
    const isPaid = /^(?:paid to|payment to|sent to|transferred to|to:?)\s*(.*)/i.exec(line);
    const isReceived = /^(?:received from|refund from|cashback from|from:?)\s*(.*)/i.exec(line);
    const amtInLine = line.match(/(?:[+-]\s*)?(?:₹|INR|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);

    if (isPaid || isReceived) {
      consumedLines.add(i);
      const type = isReceived ? "income" : "expense";
      let merchant = (isPaid ? isPaid[1] : isReceived[1]).trim();

      // If merchant name isn't on this line, peek next line
      if (!merchant && i + 1 < lines.length && !lines[i + 1].match(/^[0-9₹+-\s,.]+$/)) {
        merchant = lines[i + 1].trim();
        consumedLines.add(i + 1);
      }

      let foundAmount = 0;
      let foundDate = "";

      // Scan surrounding lines (-1 to +3) for amount and date
      for (let offset = -1; offset <= 3; offset++) {
        const targetIdx = i + offset;
        if (targetIdx >= 0 && targetIdx < lines.length && targetIdx !== i) {
          const checkLine = lines[targetIdx];

          if (!foundAmount) {
            const amtMatch =
              checkLine.match(/(?:₹|INR|Rs\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
              checkLine.match(/\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))\b/);
            if (amtMatch) {
              const val = parseFloat(amtMatch[1].replace(/,/g, ""));
              if (!isNaN(val) && val > 0 && val < 5000000) {
                foundAmount = val;
                consumedLines.add(targetIdx);
              }
            }
          }

          if (!foundDate) {
            const parsed = parseIndianDate(checkLine);
            if (parsed && parsed !== new Date().toISOString().split("T")[0]) {
              foundDate = parsed;
            }
          }
        }
      }

      if (foundAmount > 0) {
        const cleanTitle = cleanMerchantTitle(merchant || "UPI Transfer");
        transactions.push({
          id: "imp_ocr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          title: cleanTitle,
          amount: foundAmount,
          type,
          category: type === "income" ? "Income" : predictCategory(cleanTitle),
          date: foundDate || new Date().toISOString().split("T")[0],
          paymentMethod: "GPay / UPI",
          note: line,
          selected: true,
        });
      }
    } else if (amtInLine && !consumedLines.has(i)) {
      consumedLines.add(i);
      // Standalone amount line
      const amountVal = parseFloat(amtInLine[1].replace(/,/g, ""));
      if (!isNaN(amountVal) && amountVal > 0 && amountVal < 5000000) {
        const isCredit = line.includes("+") || lower.includes("credit") || lower.includes("received");
        const type = isCredit ? "income" : "expense";

        let candidateMerchant = "";
        for (const offset of [-1, 1, -2, 2]) {
          const idx = i + offset;
          if (idx >= 0 && idx < lines.length && !consumedLines.has(idx)) {
            const candidate = lines[idx];
            if (
              candidate.length >= 3 &&
              !candidate.match(/^[0-9.:\s/,-]+$/) &&
              !candidate.toLowerCase().includes("completed") &&
              !candidate.toLowerCase().includes("successful") &&
              !candidate.toLowerCase().includes("google pay") &&
              !candidate.toLowerCase().includes("phonepe") &&
              !candidate.toLowerCase().includes("paytm") &&
              !candidate.toLowerCase().includes("upi id")
            ) {
              candidateMerchant = candidate;
              consumedLines.add(idx);
              break;
            }
          }
        }

        const cleanTitle = cleanMerchantTitle(candidateMerchant || "UPI Transaction");
        transactions.push({
          id: "imp_ocr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          title: cleanTitle,
          amount: amountVal,
          type,
          category: type === "income" ? "Income" : predictCategory(cleanTitle),
          date: new Date().toISOString().split("T")[0],
          paymentMethod: "GPay / UPI",
          note: line,
          selected: true,
        });
      }
    }
  }

  // De-duplicate any identical items found from overlapping windows
  const uniqueList = [];
  for (const t of transactions) {
    const isDuplicate = uniqueList.some(
      (existing) =>
        existing.amount === t.amount &&
        existing.type === t.type &&
        (existing.title.toLowerCase().includes(t.title.toLowerCase()) ||
          t.title.toLowerCase().includes(existing.title.toLowerCase()))
    );
    if (!isDuplicate) {
      uniqueList.push(t);
    }
  }
  return uniqueList;
}

/**
 * Parses raw text (e.g. pasted bank SMS, copy-pasted statement rows)
 */
export function parseRawTextStatement(text) {
  if (!text) return [];

  // Try CSV first if comma or tab separated
  if ((text.includes(",") || text.includes("\t")) && text.split("\n").length >= 2) {
    const csvResult = parseCSVStatement(text);
    if (csvResult.length > 0) return csvResult;
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const transactions = [];

  for (const line of lines) {
    const amtMatch = line.match(/(?:(?:INR|Rs\.?|₹)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
    if (!amtMatch) continue;

    const amount = parseFloat(amtMatch[1].replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0 || amount > 10000000) continue;

    const lower = line.toLowerCase();
    const isCredit = lower.includes("credited") || lower.includes("credit") || lower.includes("received") || lower.includes("deposit");
    const type = isCredit ? "income" : "expense";

    const title = cleanMerchantTitle(line);
    const category = isCredit ? "Income" : predictCategory(line);
    const formattedDate = parseIndianDate(line);

    transactions.push({
      id: "imp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title,
      amount,
      type,
      category,
      date: formattedDate,
      paymentMethod: "UPI / Bank",
      note: line.slice(0, 100),
      selected: true,
    });
  }

  return transactions;
}

/**
 * Universal dispatcher that parses any format: PDF text, Excel CSV, Screenshot OCR, or raw text
 */
export function parseUniversalStatement(rawData, fileType = "csv") {
  if (fileType === "screenshot") {
    const ocrResults = parseScreenshotStatement(rawData);
    if (ocrResults.length > 0) return ocrResults;
    return parseRawTextStatement(rawData);
  }

  if (fileType === "excel" || fileType === "csv") {
    const csvResults = parseCSVStatement(rawData);
    if (csvResults.length > 0) return csvResults;
    return parseRawTextStatement(rawData);
  }

  if (fileType === "pdf") {
    const csvResults = parseCSVStatement(rawData);
    if (csvResults.length > 0) return csvResults;
    return parseRawTextStatement(rawData);
  }

  return parseRawTextStatement(rawData);
}

