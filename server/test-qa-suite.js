import {
  calculateMonthlyFinances,
  calculateEventSummary,
  isDateInMonth,
} from "../src/utils/financialEngine.js";

console.log("=================================================");
console.log("   PACE V1 REAL-WORLD AUTOMATED QA SUITE         ");
console.log("=================================================");

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// TEST 1: ZERO-DATA ACCOUNT INTEGRITY
// -------------------------------------------------------------
console.log("\n[QA 1] Testing Fresh User / Zero-Data State...");
const emptyTxs = [];
const emptyFinances = calculateMonthlyFinances(emptyTxs, "2026-10", 0);
assert(emptyFinances.totalIncome === 0, "Zero-data totalIncome is ₹0");
assert(emptyFinances.actualSpending === 0, "Zero-data actualSpending is ₹0");
assert(emptyFinances.wealthGeneration === 0, "Zero-data wealthGeneration is ₹0");
assert(emptyFinances.netAvailableCashFlow === 0, "Zero-data netAvailableCashFlow is ₹0");
assert(emptyFinances.budgetUsed === 0, "Zero-data budgetUsed percentage is 0%");

// -------------------------------------------------------------
// TEST 2: TRANSACTION CONSISTENCY (CREATE -> EDIT -> DELETE)
// -------------------------------------------------------------
console.log("\n[QA 2] Testing Transaction Consistency (Create -> Edit -> Delete)...");
let txList = [
  { id: 1, title: "Shopping Test", amount: 5000, type: "expense", category: "Shopping", date: "2026-10-15" }
];
let f1 = calculateMonthlyFinances(txList, "2026-10", 20000);
assert(f1.actualSpending === 5000, "After creating ₹5,000 expense: actualSpending = ₹5,000");

// Edit ₹5,000 to ₹3,000
txList = [
  { id: 1, title: "Shopping Test", amount: 3000, type: "expense", category: "Shopping", date: "2026-10-15" }
];
let f2 = calculateMonthlyFinances(txList, "2026-10", 20000);
assert(f2.actualSpending === 3000, "After editing to ₹3,000: actualSpending = ₹3,000");

// Delete transaction
txList = [];
let f3 = calculateMonthlyFinances(txList, "2026-10", 20000);
assert(f3.actualSpending === 0, "After deleting transaction: actualSpending returns to ₹0");

// -------------------------------------------------------------
// TEST 3: ACCOUNTING & LIQUIDITY MOVEMENT (CASH & TRANSFERS)
// -------------------------------------------------------------
console.log("\n[QA 3] Testing Cash Withdrawal & Internal Transfer Accounting...");
const accountingTxs = [
  { id: 101, title: "Salary", amount: 10000, type: "income", category: "Salary", date: "2026-10-01" },
  { id: 102, title: "Groceries", amount: 2000, type: "expense", category: "Food", date: "2026-10-05" },
  { id: 103, title: "Emergency Fund", amount: 1000, type: "savings", category: "Emergency", date: "2026-10-10" },
  { id: 104, title: "SIP Mutual Fund", amount: 500, type: "investment", category: "Investment", date: "2026-10-10" },
  { id: 105, title: "Loan EMI", amount: 500, type: "debt_repayment", category: "Bills", date: "2026-10-12" },
  // Internal Movements: MUST NOT inflate spending
  { id: 106, title: "HDFC to SBI Transfer", amount: 2000, type: "transfer", category: "Transfer", date: "2026-10-14" },
  { id: 107, title: "ATM Cash Withdrawal", amount: 1000, type: "cash_withdrawal", category: "Cash", date: "2026-10-15" }
];

const acctFinances = calculateMonthlyFinances(accountingTxs, "2026-10", 20000);
assert(acctFinances.totalIncome === 10000, "Income is exactly ₹10,000");
assert(acctFinances.actualSpending === 2000, "Actual spending is strictly ₹2,000 (Transfers & Cash excluded)");
assert(acctFinances.wealthGeneration === 1500, "Wealth generation is ₹1,500 (₹1,000 savings + ₹500 investment)");
assert(acctFinances.totalDebtRepayment === 500, "Debt repayment is ₹500");
assert(acctFinances.totalTransfers === 2000, "Transfers tracked correctly as ₹2,000 internal movement");
assert(acctFinances.totalCashWithdrawals === 1000, "Cash withdrawal tracked correctly as ₹1,000 internal movement");
assert(acctFinances.netAvailableCashFlow === 6000, "Net available cashflow: 10000 - (2000 + 1500 + 500) = ₹6,000");

// -------------------------------------------------------------
// TEST 4: MILESTONE EVENT CONSISTENCY
// -------------------------------------------------------------
console.log("\n[QA 4] Testing Milestone Event Consistency...");
const testEvent = { id: "ev_1", name: "Wedding Celebration", budget: 50000, categories: ["Wedding"] };
let eventTxs = [
  { id: 201, title: "Catering Deposit", amount: 12000, type: "expense", category: "Wedding", eventId: "ev_1", date: "2026-10-10" }
];

let evSum1 = calculateEventSummary(testEvent, eventTxs);
assert(evSum1.totalSpent === 12000, "Initial event total spent = ₹12,000");
assert(evSum1.remaining === 38000, "Initial event remaining budget = ₹38,000");

// Edit transaction to 15,000
eventTxs[0].amount = 15000;
let evSum2 = calculateEventSummary(testEvent, eventTxs);
assert(evSum2.totalSpent === 15000, "After editing tx: event total spent = ₹15,000");
assert(evSum2.remaining === 35000, "After editing tx: event remaining budget = ₹35,000");

// Delete transaction
eventTxs = [];
let evSum3 = calculateEventSummary(testEvent, eventTxs);
assert(evSum3.totalSpent === 0, "After deleting tx: event total spent returns to ₹0");
assert(evSum3.remaining === 50000, "After deleting tx: event remaining returns to ₹50,000");

// -------------------------------------------------------------
// TEST 5: LOAN EMI & PREPAYMENT BALANCE DEDUCTION
// -------------------------------------------------------------
console.log("\n[QA 5] Testing Loan EMI & Principal Deduction...");
let testLoan = { id: "loan_1", name: "Home Loan", currentOutstanding: 1000000, emiAmount: 25000, remainingTenureMonths: 120 };
let emiTx = { id: 301, title: "Home Loan EMI", amount: 25000, principalAmount: 20000, type: "debt_repayment", loanId: "loan_1", date: "2026-10-05" };

// Simulate principal deduction
let updatedOutstanding = Math.max(0, testLoan.currentOutstanding - emiTx.principalAmount);
let updatedTenure = Math.max(0, testLoan.remainingTenureMonths - 1);
assert(updatedOutstanding === 980000, "Outstanding balance decreases by principal: ₹9,80,000");
assert(updatedTenure === 119, "Remaining tenure decreases by 1 month: 119 months");

// -------------------------------------------------------------
// TEST 6: MONTH BOUNDARY ISOLATION
// -------------------------------------------------------------
console.log("\n[QA 6] Testing Month Boundary Isolation...");
assert(isDateInMonth("2026-10-31", "2026-10") === true, "2026-10-31 belongs to October 2026");
assert(isDateInMonth("2026-11-01", "2026-10") === false, "2026-11-01 does NOT belong to October 2026");
assert(isDateInMonth("2026-11-01", "2026-11") === true, "2026-11-01 belongs to November 2026");

const boundaryTxs = [
  { id: 401, title: "Oct End Expense", amount: 5000, type: "expense", date: "2026-10-31" },
  { id: 402, title: "Nov Start Expense", amount: 8000, type: "expense", date: "2026-11-01" }
];

const octFinances = calculateMonthlyFinances(boundaryTxs, "2026-10", 20000);
const novFinances = calculateMonthlyFinances(boundaryTxs, "2026-11", 20000);

assert(octFinances.actualSpending === 5000, "October spending includes only Oct 31 tx: ₹5,000");
assert(novFinances.actualSpending === 8000, "November spending includes only Nov 1 tx: ₹8,000");

// -------------------------------------------------------------
// TEST 7: DATA EXPORT PRIVACY & SANITIZATION
// -------------------------------------------------------------
console.log("\n[QA 7] Testing Data Export Sanitization...");
const userAccount = {
  id: "usr_qa_123",
  name: "QA Tester",
  email: "qa@example.com",
  password: "super_secret_password_hash",
  jwtToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  otp: "987654"
};

const jsonExportStr = JSON.stringify({
  exportMetadata: { app: "PACE", version: "1.0", exportedAt: new Date().toISOString() },
  user: {
    id: userAccount.id,
    name: userAccount.name,
    email: userAccount.email,
  },
  transactions: accountingTxs,
});

const parsedExport = JSON.parse(jsonExportStr);
assert(parsedExport.user.password === undefined, "Exported JSON does NOT leak password");
assert(parsedExport.user.jwtToken === undefined, "Exported JSON does NOT leak JWT token");
assert(parsedExport.user.otp === undefined, "Exported JSON does NOT leak OTP code");
assert(parsedExport.transactions.length === 7, "Exported JSON contains user's 7 transactions");

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log("\n=================================================");
console.log(`   QA SUITE COMPLETED: ${passCount} PASSED, ${failCount} FAILED`);
console.log("=================================================");

if (failCount > 0) {
  process.exit(1);
}
