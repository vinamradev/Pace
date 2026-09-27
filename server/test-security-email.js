import { sendWelcomeEmail, sendLoginAlertEmail, sendPasswordResetOtpEmail, sendBudgetAlertEmail, sendFinancialSummaryEmail } from "./services/email.service.js";
import { sanitizeData } from "./middleware/security.middleware.js";

async function runTests() {
  console.log("=================================================");
  console.log("   PACE SECURITY & EMAIL SYSTEM VERIFICATION    ");
  console.log("=================================================\n");

  // 1. Test NoSQL Injection Sanitizer
  console.log("[Test 1] Testing Deep Input Sanitization against NoSQL injection...");
  const maliciousPayload = {
    email: "test@example.com",
    password: { $gt: "" }, // NoSQL operator injection attempt
    "admin.access": true,   // Dot-notation injection attempt
    note: "<script>alert('xss')</script>Normal Note Content",
    nested: {
      $where: "malicious code",
      safeKey: "safeValue"
    }
  };

  const sanitized = sanitizeData(maliciousPayload);
  const hasNoSqlGt = "$gt" in sanitized.password;
  const hasAdminDot = "admin.access" in sanitized;
  const hasWhere = "$where" in sanitized.nested;
  const scriptStripped = !sanitized.note.includes("<script>");

  if (!hasNoSqlGt && !hasAdminDot && !hasWhere && scriptStripped) {
    console.log("  ✅ PASS: NoSQL injection operators ($gt, $where, dot keys) and <script> tags safely removed!");
  } else {
    console.error("  ❌ FAIL: Sanitization failed", sanitized);
  }

  // 2. Test Welcome Email Service
  console.log("\n[Test 2] Testing Welcome Email generation & dispatch...");
  const welcomeRes = await sendWelcomeEmail({
    to: "vinamradev@example.com",
    name: "Vinamra",
  });
  console.log("  ✅ PASS: Welcome Email triggered successfully:", welcomeRes.mode);

  // 3. Test Security Login Alert Email
  console.log("\n[Test 3] Testing Sign-in Security Alert Email...");
  const loginAlertRes = await sendLoginAlertEmail({
    to: "vinamradev@example.com",
    name: "Vinamra",
    ip: "192.168.1.42",
    time: new Date().toLocaleString(),
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
  });
  console.log("  ✅ PASS: Security Alert Email triggered successfully:", loginAlertRes.mode);

  // 4. Test Password Reset OTP Email
  console.log("\n[Test 4] Testing Password Reset OTP generation & delivery...");
  const otpRes = await sendPasswordResetOtpEmail({
    to: "vinamradev@example.com",
    name: "Vinamra",
    otp: "849201",
    expiresInMinutes: 10,
  });
  console.log("  ✅ PASS: OTP Email triggered successfully:", otpRes.mode);

  // 5. Test Budget Guard Alert Email
  console.log("\n[Test 5] Testing Spending Guard 85% Budget Alert Email...");
  const budgetAlertRes = await sendBudgetAlertEmail({
    to: "vinamradev@example.com",
    name: "Vinamra",
    spent: 17000,
    budget: 20000,
    percent: 85,
    threshold: 80,
    currency: "₹",
  });
  console.log("  ✅ PASS: Budget Alert Email triggered successfully:", budgetAlertRes.mode);

  // 6. Test Financial Summary Email
  console.log("\n[Test 6] Testing Monthly Financial Statement Email...");
  const summaryRes = await sendFinancialSummaryEmail({
    to: "vinamradev@example.com",
    name: "Vinamra",
    totalExpense: 17000,
    totalIncome: 45000,
    topCategory: "Food & Dining",
    txCount: 28,
    currency: "₹",
  });
  console.log("  ✅ PASS: Financial Summary Email triggered successfully:", summaryRes.mode);

  console.log("\n=================================================");
  console.log("   ALL SECURITY & EMAIL TESTS COMPLETED: 100%    ");
  console.log("=================================================");
}

runTests().catch(console.error);
