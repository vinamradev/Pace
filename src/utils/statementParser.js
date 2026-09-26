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

/**
 * Parses CSV text into structured transactions
 */
export function parseCSVStatement(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Helper to split CSV line considering quotes
  function parseCSVLine(line) {
    const values = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ""));
    return values;
  }

  // Find header row index
  let headerIndex = -1;
  let headers = [];

  const commonHeaderKeywords = ["date", "description", "narration", "particulars", "amount", "debit", "withdrawal"];

  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const row = parseCSVLine(lines[i]).map((h) => h.toLowerCase());
    const matches = commonHeaderKeywords.filter((kw) => row.some((col) => col.includes(kw)));
    if (matches.length >= 2) {
      headerIndex = i;
      headers = row;
      break;
    }
  }

  if (headerIndex === -1) {
    // If no header found, assume standard format: Date, Narration, Amount
    headers = ["date", "narration", "amount"];
    headerIndex = -1;
  }

  // Map column indexes
  const dateCol = headers.findIndex((h) => h.includes("date") || h.includes("txn date") || h.includes("time"));
  const descCol = headers.findIndex(
    (h) => h.includes("description") || h.includes("narration") || h.includes("particulars") || h.includes("remarks") || h.includes("paid to")
  );
  const amountCol = headers.findIndex((h) => h.includes("amount") && !h.includes("balance"));
  const debitCol = headers.findIndex((h) => h.includes("debit") || h.includes("withdrawal") || h.includes("dr"));
  const creditCol = headers.findIndex((h) => h.includes("credit") || h.includes("deposit") || h.includes("cr"));
  const typeCol = headers.findIndex((h) => h === "type" || h.includes("txn type") || h.includes("cr/dr"));

  const transactions = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    // Extract raw fields
    const rawDate = dateCol >= 0 && cols[dateCol] ? cols[dateCol] : "";
    const rawDesc = descCol >= 0 && cols[descCol] ? cols[descCol] : cols[1] || "";

    let amount = 0;
    let type = "expense";

    // Determine amount and type
    if (debitCol >= 0 && creditCol >= 0) {
      const debitVal = parseFloat((cols[debitCol] || "0").replace(/[^0-9.]/g, ""));
      const creditVal = parseFloat((cols[creditCol] || "0").replace(/[^0-9.]/g, ""));

      if (creditVal > 0) {
        amount = creditVal;
        type = "income";
      } else if (debitVal > 0) {
        amount = debitVal;
        type = "expense";
      }
    } else if (amountCol >= 0) {
      const rawAmt = cols[amountCol] || "0";
      amount = parseFloat(rawAmt.replace(/[^0-9.]/g, ""));

      if (typeCol >= 0) {
        const typeVal = (cols[typeCol] || "").toLowerCase();
        if (typeVal.includes("cr") || typeVal.includes("credit") || typeVal.includes("receive")) {
          type = "income";
        }
      } else if (rawAmt.startsWith("+") || rawDesc.toLowerCase().includes("refund") || rawDesc.toLowerCase().includes("cashback")) {
        type = "income";
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) continue;

    // Normalize date
    let formattedDate = new Date().toISOString().split("T")[0];
    if (rawDate) {
      const dateParts = rawDate.match(/(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})/);
      if (dateParts) {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toISOString().split("T")[0];
          }
        } catch {
          // Keep current date fallback
        }
      }
    }

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
 * Parses raw text (e.g. pasted bank SMS, copy-pasted statement rows)
 */
export function parseRawTextStatement(text) {
  // Try CSV first if comma or tab separated
  if (text.includes(",") && text.split("\n").length > 2) {
    const csvResult = parseCSVStatement(text);
    if (csvResult.length > 0) return csvResult;
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const transactions = [];

  for (const line of lines) {
    // Look for amount (e.g., Rs. 500, INR 1,200.50, ₹450)
    const amtMatch = line.match(/(?:(?:INR|Rs\.?|₹)\s*)?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
    if (!amtMatch) continue;

    const amount = parseFloat(amtMatch[1].replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0 || amount > 10000000) continue;

    // Detect type
    const lower = line.toLowerCase();
    const isCredit = lower.includes("credited") || lower.includes("credit") || lower.includes("received") || lower.includes("deposit");
    const type = isCredit ? "income" : "expense";

    // Clean description
    const title = cleanMerchantTitle(line);
    const category = isCredit ? "Income" : predictCategory(line);

    transactions.push({
      id: "imp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title,
      amount,
      type,
      category,
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "UPI / Bank",
      note: line.slice(0, 100),
      selected: true,
    });
  }

  return transactions;
}
