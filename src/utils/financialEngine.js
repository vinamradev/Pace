/**
 * PACE — Core Financial Calculation Engine
 * 
 * Provides pure, deterministic financial logic for:
 * 1. 7 Transaction Types classification & strict accounting rules
 * 2. Major Heads categorization & hierarchy
 * 3. Monthly Financial Engine (Income, Spending, Savings, Investments, Debt, Net Surplus)
 * 4. Loan EMI Amortization Schedule & "What if I pay extra?" Prepayment Simulator
 * 5. Event budget tracking & dynamic spending rollups
 * 6. Month-aware date navigation & formatting
 */

export const TRANSACTION_TYPES = [
  { id: "expense", label: "Expense", icon: "💸", color: "#f87171", description: "Actual living spending" },
  { id: "income", label: "Income", icon: "💰", color: "#34d399", description: "Salary, freelance, bonus" },
  { id: "savings", label: "Savings", icon: "🏦", color: "#60a5fa", description: "Emergency fund, FD, RD" },
  { id: "investment", label: "Investment", icon: "📈", color: "#a78bfa", description: "Mutual funds, SIP, stocks" },
  { id: "debt_repayment", label: "Debt / EMI", icon: "💳", color: "#fb923c", description: "Loan EMIs, credit card bills" },
  { id: "transfer", label: "Transfer", icon: "🔁", color: "#94a3b8", description: "Self bank-to-bank movement" },
  { id: "cash_withdrawal", label: "Cash Out", icon: "💵", color: "#cbd5e1", description: "ATM withdrawal" },
];

export const MAJOR_HEADS = [
  { id: "Essentials", label: "Essentials", icon: "🏠", description: "Rent, food, groceries, bills, health" },
  { id: "Lifestyle", label: "Lifestyle", icon: "☕", description: "Dining, entertainment, shopping, travel" },
  { id: "Financial Commitments", label: "Financial Commitments", icon: "🛡️", description: "Loans, EMIs, insurance, card dues" },
  { id: "Wealth & Future", label: "Wealth & Future", icon: "🌱", description: "Savings, SIPs, investments, emergency fund" },
  { id: "Internal Transfers", label: "Internal Transfers", icon: "🔄", description: "Transfers, ATM cash withdrawals" },
];

export const CATEGORY_TO_MAJOR_HEAD = {
  // Essentials
  Food: "Essentials",
  Groceries: "Essentials",
  Rent: "Essentials",
  Housing: "Essentials",
  Bills: "Essentials",
  Utilities: "Essentials",
  Health: "Essentials",
  Medical: "Essentials",
  Education: "Essentials",
  Transport: "Essentials",
  Fuel: "Essentials",

  // Lifestyle
  Shopping: "Lifestyle",
  Entertainment: "Lifestyle",
  Dining: "Lifestyle",
  Travel: "Lifestyle",
  Vacation: "Lifestyle",
  Subscriptions: "Lifestyle",
  Personal: "Lifestyle",
  Gift: "Lifestyle",
  Wedding: "Lifestyle",

  // Financial Commitments
  "Home Loan EMI": "Financial Commitments",
  "Car Loan EMI": "Financial Commitments",
  "Personal Loan EMI": "Financial Commitments",
  "Education Loan EMI": "Financial Commitments",
  "Credit Card Bill": "Financial Commitments",
  "Insurance": "Financial Commitments",
  "Debt Repayment": "Financial Commitments",

  // Wealth & Future
  "Emergency Fund": "Wealth & Future",
  "Mutual Fund SIP": "Wealth & Future",
  "Stocks": "Wealth & Future",
  "Fixed Deposit": "Wealth & Future",
  "Gold": "Wealth & Future",
  "PPF / EPF": "Wealth & Future",
  "Savings": "Wealth & Future",
  "Investment": "Wealth & Future",

  // Internal
  "Bank Transfer": "Internal Transfers",
  "ATM Withdrawal": "Internal Transfers",
  "Self Transfer": "Internal Transfers",
  "Wallet Topup": "Internal Transfers",
};

/**
 * Returns the Major Head for a category or type
 */
export function getMajorHead(category, type = "expense") {
  if (type === "savings" || type === "investment") return "Wealth & Future";
  if (type === "debt_repayment") return "Financial Commitments";
  if (type === "transfer" || type === "cash_withdrawal") return "Internal Transfers";
  if (type === "income") return "Income";
  return CATEGORY_TO_MAJOR_HEAD[category] || "Essentials";
}

/* ==========================================================================
   DATE & MONTH UTILITIES
   ========================================================================== */

export function toMonthKey(date = new Date()) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatMonthName(monthKey) {
  if (!monthKey || typeof monthKey !== "string" || !monthKey.includes("-")) {
    return "Current Month";
  }
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getPreviousMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const prevDate = new Date(year, month - 2, 1);
  return toMonthKey(prevDate);
}

export function getNextMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const nextDate = new Date(year, month, 1);
  return toMonthKey(nextDate);
}

export function isDateInMonth(dateString, monthKey) {
  if (!dateString) return false;
  return dateString.startsWith(monthKey);
}

export function getDaysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function getDaysLeftInMonth(monthKey) {
  const now = new Date();
  const currentKey = toMonthKey(now);
  if (monthKey < currentKey) return 0;
  if (monthKey > currentKey) return getDaysInMonth(monthKey);
  const totalDays = getDaysInMonth(monthKey);
  const today = now.getDate();
  return Math.max(totalDays - today + 1, 1);
}

/* ==========================================================================
   MONTHLY FINANCIAL ENGINE (5 PILLARS + CASH FLOW)
   ========================================================================== */

/**
 * Calculates complete transparent financial metrics for a specific month
 * Strict Rule 1: Actual spending is completely isolated from savings, investments,
 * debt repayments, and internal transfers.
 */
export function calculateMonthlyFinances(transactions = [], monthKey = toMonthKey(), monthlyBudget = 0) {
  const monthTx = transactions.filter((t) => isDateInMonth(t.date, monthKey));

  let totalIncome = 0;
  let actualSpending = 0;
  let totalSavings = 0;
  let totalInvestments = 0;
  let totalDebtRepayment = 0;
  let totalTransfers = 0;
  let totalCashWithdrawals = 0;

  // Breakdown by Major Head
  const majorHeadTotals = {
    Essentials: 0,
    Lifestyle: 0,
    "Financial Commitments": 0,
    "Wealth & Future": 0,
    "Internal Transfers": 0,
  };

  // Breakdown by Category
  const categoryTotals = {};

  monthTx.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    const type = tx.type || "expense";
    const category = tx.category || "Other";
    const majorHead = tx.majorHead || getMajorHead(category, type);

    switch (type) {
      case "income":
        totalIncome += amount;
        break;
      case "expense":
        actualSpending += amount;
        if (majorHeadTotals[majorHead] !== undefined) majorHeadTotals[majorHead] += amount;
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        break;
      case "savings":
        totalSavings += amount;
        majorHeadTotals["Wealth & Future"] += amount;
        break;
      case "investment":
        totalInvestments += amount;
        majorHeadTotals["Wealth & Future"] += amount;
        break;
      case "debt_repayment":
        totalDebtRepayment += amount;
        majorHeadTotals["Financial Commitments"] += amount;
        break;
      case "transfer":
        totalTransfers += amount;
        majorHeadTotals["Internal Transfers"] += amount;
        break;
      case "cash_withdrawal":
        totalCashWithdrawals += amount;
        majorHeadTotals["Internal Transfers"] += amount;
        break;
      default:
        actualSpending += amount;
        break;
    }
  });

  // Committed Outflows = Actual Spending + Savings + Investments + Debt Repayment
  // (Transfers & Cash withdrawals are internal asset reallocations, NOT outflows)
  const committedOutflows = actualSpending + totalSavings + totalInvestments + totalDebtRepayment;
  
  // Net Available Cash Flow
  const netAvailableCashFlow = totalIncome - committedOutflows;

  // Budget calculations (based strictly on actual spending vs budget)
  const remainingBudget = monthlyBudget - actualSpending;
  const budgetUsed = monthlyBudget > 0 ? (actualSpending / monthlyBudget) * 100 : 0;
  const daysLeft = getDaysLeftInMonth(monthKey);
  const safeToSpendDaily = remainingBudget > 0 ? Math.floor(remainingBudget / daysLeft) : 0;

  // Health Ratios
  const wealthGeneration = totalSavings + totalInvestments;
  const savingsRate = totalIncome > 0 ? (wealthGeneration / totalIncome) * 100 : 0;
  const debtToIncomeRatio = totalIncome > 0 ? (totalDebtRepayment / totalIncome) * 100 : 0;
  const spendingRatio = totalIncome > 0 ? (actualSpending / totalIncome) * 100 : 0;

  // Top spending category
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0] || ["None", 0];

  return {
    monthKey,
    monthName: formatMonthName(monthKey),
    transactionsCount: monthTx.length,
    // 5 Pillars
    totalIncome,
    actualSpending,
    totalSavings,
    totalInvestments,
    totalDebtRepayment,
    // Internal
    totalTransfers,
    totalCashWithdrawals,
    // Combined / Net
    wealthGeneration,
    committedOutflows,
    netAvailableCashFlow,
    // Budget & Health
    monthlyBudget,
    remainingBudget,
    budgetUsed,
    safeToSpendDaily,
    savingsRate,
    debtToIncomeRatio,
    spendingRatio,
    // Breakdowns
    majorHeadTotals,
    categoryTotals,
    sortedCategories,
    topCategory,
  };
}

/* ==========================================================================
   LOAN EMI & AMORTIZATION CALCULATIONS
   ========================================================================== */

/**
 * Standard EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
 */
export function calculateEMI(principal, annualRatePercent, tenureMonths) {
  if (tenureMonths <= 0 || principal <= 0) return 0;
  if (annualRatePercent <= 0) return Math.round(principal / tenureMonths);

  const monthlyRate = annualRatePercent / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi);
}

/**
 * Generates full monthly amortization schedule
 */
export function generateAmortizationSchedule(loan, maxMonths = 360) {
  const principal = Number(loan.currentOutstanding || loan.originalPrincipal || 0);
  const annualRate = Number(loan.interestRate || 0);
  const monthlyRate = annualRate / 12 / 100;
  const emi = Number(loan.emiAmount) || calculateEMI(principal, annualRate, Number(loan.remainingTenureMonths || loan.tenureMonths || 12));

  const schedule = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipalPaid = 0;
  let month = 1;

  while (balance > 1 && month <= maxMonths) {
    const interest = Math.round(balance * monthlyRate);
    let principalPaid = emi - interest;

    if (principalPaid > balance || month === maxMonths) {
      principalPaid = balance;
    }

    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    totalPrincipalPaid += principalPaid;

    schedule.push({
      month,
      emi: principalPaid + interest,
      principalPaid,
      interestPaid: interest,
      remainingBalance: balance,
      cumulativeInterest: totalInterest,
    });

    month++;
  }

  return {
    schedule,
    totalInterest,
    totalPrincipalPaid,
    totalAmountPaid: totalPrincipalPaid + totalInterest,
    payoffMonths: schedule.length,
  };
}

/**
 * Prepayment Simulator: "What if I pay extra?"
 * Calculates how much interest and tenure is saved if paying extra monthly or lumpsum
 */
export function simulatePrepayment(loan, { extraMonthly = 0, lumpsumAmount = 0, lumpsumMonth = 1 }) {
  const currentPrincipal = Number(loan.currentOutstanding || loan.originalPrincipal || 0);
  const annualRate = Number(loan.interestRate || 0);
  const monthlyRate = annualRate / 12 / 100;
  const regularEmi = Number(loan.emiAmount) || calculateEMI(currentPrincipal, annualRate, Number(loan.remainingTenureMonths || 60));

  // Baseline without prepayment
  const baseline = generateAmortizationSchedule(loan);

  // Accelerated schedule with prepayment
  let balance = currentPrincipal;
  let totalInterest = 0;
  let month = 1;
  const schedule = [];

  while (balance > 1 && month <= 480) {
    // Apply lumpsum if applicable
    if (month === lumpsumMonth && lumpsumAmount > 0) {
      balance = Math.max(0, balance - lumpsumAmount);
    }

    if (balance <= 0) break;

    const interest = Math.round(balance * monthlyRate);
    const standardPrincipal = regularEmi - interest;
    let actualPayment = regularEmi + extraMonthly;
    let principalPaid = actualPayment - interest;

    if (principalPaid > balance) {
      principalPaid = balance;
      actualPayment = principalPaid + interest;
    }

    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    schedule.push({
      month,
      regularEmi,
      extraPaid: extraMonthly,
      totalPaid: actualPayment,
      principalPaid,
      interestPaid: interest,
      remainingBalance: balance,
    });

    month++;
  }

  const interestSaved = Math.max(0, baseline.totalInterest - totalInterest);
  const monthsSaved = Math.max(0, baseline.payoffMonths - schedule.length);

  return {
    baselinePayoffMonths: baseline.payoffMonths,
    baselineTotalInterest: baseline.totalInterest,
    newPayoffMonths: schedule.length,
    newTotalInterest: totalInterest,
    monthsSaved,
    yearsSaved: (monthsSaved / 12).toFixed(1),
    interestSaved,
    percentageInterestSaved: baseline.totalInterest > 0 ? ((interestSaved / baseline.totalInterest) * 100).toFixed(1) : 0,
    schedule: schedule.slice(0, 36), // first 36 months for display
  };
}

/**
 * Recommends optimal monthly extra prepayment based on surplus cash flow
 */
export function recommendPrepayment(netCashFlow, loans = []) {
  if (!loans.length || netCashFlow <= 1000) {
    return { recommendedAmount: 0, reason: "Surplus cash flow is too tight for extra prepayments right now." };
  }

  // Allocate 25% of net monthly cash flow to highest-interest loan
  const recommendedAmount = Math.floor((netCashFlow * 0.25) / 500) * 500;
  const sortedLoans = [...loans].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
  const targetLoan = sortedLoans[0];

  return {
    recommendedAmount: Math.max(recommendedAmount, 1000),
    targetLoan,
    reason: `With ₹${Math.round(netCashFlow).toLocaleString("en-IN")} surplus cash flow, dedicating 25% (₹${recommendedAmount.toLocaleString("en-IN")}) to your highest-interest loan (${targetLoan.name} @ ${targetLoan.interestRate}%) maximizes wealth protection.`,
  };
}

/* ==========================================================================
   EVENT TRACKING ROLLUP
   ========================================================================== */

/**
 * Calculates dynamic event spend summary from transactions
 * Rule 2: No duplicate database writes; transactions link via eventId.
 */
export function calculateEventSummary(event, allTransactions = []) {
  const linkedTx = allTransactions.filter(
    (t) => t.eventId === event.id || t.eventId === event._id
  );

  const totalSpent = linkedTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const budget = Number(event.budget) || 0;
  const remaining = Math.max(budget - totalSpent, 0);
  const isOverBudget = totalSpent > budget && budget > 0;
  const percentageUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;

  // Group by category
  const categorySpending = {};
  linkedTx.forEach((tx) => {
    const cat = tx.category || "Uncategorized";
    categorySpending[cat] = (categorySpending[cat] || 0) + (Number(tx.amount) || 0);
  });

  // Group by month
  const monthlySpending = {};
  linkedTx.forEach((tx) => {
    const m = toMonthKey(tx.date);
    monthlySpending[m] = (monthlySpending[m] || 0) + (Number(tx.amount) || 0);
  });

  return {
    ...event,
    totalSpent,
    remaining,
    isOverBudget,
    overBudgetAmount: isOverBudget ? totalSpent - budget : 0,
    percentageUsed: Math.min(percentageUsed, 100),
    actualPercentage: percentageUsed,
    transactionCount: linkedTx.length,
    categorySpending,
    monthlySpending,
    transactions: linkedTx.sort((a, b) => b.date.localeCompare(a.date)),
  };
}
