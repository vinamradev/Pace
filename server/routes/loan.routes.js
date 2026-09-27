import express from "express";
import Loan from "../models/Loan.js";
import Transaction from "../models/Transaction.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticateToken);

/**
 * Standard Financial Amortization Formula
 * Calculates monthly EMI and full amortization schedule
 */
export function calculateAmortizationSchedule(principal, annualRate, tenureMonths) {
  if (principal <= 0 || tenureMonths <= 0) return [];

  const monthlyRate = annualRate / 12 / 100;
  let emi = 0;

  if (monthlyRate === 0) {
    emi = principal / tenureMonths;
  } else {
    emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  }

  const schedule = [];
  let balance = principal;

  for (let m = 1; m <= tenureMonths; m++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(balance, emi - interest);
    balance = Math.max(0, balance - principalPaid);

    schedule.push({
      monthNumber: m,
      emi: Math.round(emi),
      principalComponent: Math.round(principalPaid),
      interestComponent: Math.round(interest),
      outstandingBalance: Math.round(balance),
    });

    if (balance <= 0) break;
  }

  return schedule;
}

/**
 * Prepayment Simulator
 * Calculates tenure reduction & interest savings when paying extra
 */
export function simulatePrepayment(principal, annualRate, normalEmi, extraMonthly = 0, lumpSum = 0) {
  const monthlyRate = annualRate / 12 / 100;
  let normalBalance = principal;
  let normalTotalInterest = 0;
  let normalMonths = 0;

  // Baseline scenario
  while (normalBalance > 0 && normalMonths < 600) {
    normalMonths++;
    const interest = normalBalance * monthlyRate;
    const principalPaid = Math.min(normalBalance, normalEmi - interest);
    normalTotalInterest += interest;
    normalBalance = Math.max(0, normalBalance - principalPaid);
  }

  // Prepayment scenario
  let prepayBalance = Math.max(0, principal - lumpSum);
  let prepayTotalInterest = 0;
  let prepayMonths = 0;
  const newEmi = normalEmi + extraMonthly;

  while (prepayBalance > 0 && prepayMonths < 600) {
    prepayMonths++;
    const interest = prepayBalance * monthlyRate;
    const principalPaid = Math.min(prepayBalance, newEmi - interest);
    prepayTotalInterest += interest;
    prepayBalance = Math.max(0, prepayBalance - principalPaid);
  }

  const interestSaved = Math.max(0, Math.round(normalTotalInterest - prepayTotalInterest));
  const monthsSaved = Math.max(0, normalMonths - prepayMonths);
  const yearsSaved = (monthsSaved / 12).toFixed(1);

  return {
    normalMonths,
    newMonths: prepayMonths,
    monthsSaved,
    yearsSaved,
    normalTotalInterest: Math.round(normalTotalInterest),
    newTotalInterest: Math.round(prepayTotalInterest),
    interestSaved,
    extraMonthly,
    lumpSum,
  };
}

/**
 * GET /api/loans
 * Fetch all user loans with payment stats
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const loans = await Loan.find({ userId }).sort({ createdAt: -1 });

    const loansWithStats = await Promise.all(
      loans.map(async (loan) => {
        const loanIdMatches = [loan._id.toString(), loan._id];
        const payments = await Transaction.find({
          userId,
          loanId: { $in: loanIdMatches },
        });

        const totalPaid = payments.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        const totalPrincipalPaid = payments.reduce(
          (sum, tx) => sum + (Number(tx.principalAmount) || 0),
          0
        );
        const totalInterestPaid = payments.reduce(
          (sum, tx) => sum + (Number(tx.interestAmount) || 0),
          0
        );

        return {
          ...loan.toObject(),
          totalPaid,
          totalPrincipalPaid,
          totalInterestPaid,
          paymentCount: payments.length,
        };
      })
    );

    res.json({ success: true, count: loansWithStats.length, loans: loansWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch loans", error: error.message });
  }
});

/**
 * POST /api/loans
 * Create a new loan
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      type,
      lender,
      originalPrincipal,
      currentOutstanding,
      interestRate,
      tenureMonths,
      remainingTenureMonths,
      emiAmount,
      dueDay,
      startDate,
      accountNumber,
      notes,
    } = req.body;

    if (!name || originalPrincipal === undefined || interestRate === undefined) {
      return res.status(400).json({ success: false, message: "Name, principal and interest rate are required" });
    }

    const principal = Number(originalPrincipal);
    const rate = Number(interestRate);
    const tenure = Number(tenureMonths) || 240;

    // Calculate auto EMI if not provided
    let calculatedEmi = Number(emiAmount);
    if (!calculatedEmi || calculatedEmi <= 0) {
      const monthlyRate = rate / 12 / 100;
      if (monthlyRate === 0) {
        calculatedEmi = Math.round(principal / tenure);
      } else {
        calculatedEmi = Math.round(
          (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1)
        );
      }
    }

    const loan = await Loan.create({
      userId,
      name: String(name).trim(),
      type: type || "Home Loan",
      lender: lender || "",
      originalPrincipal: principal,
      currentOutstanding: currentOutstanding !== undefined ? Number(currentOutstanding) : principal,
      interestRate: rate,
      tenureMonths: tenure,
      remainingTenureMonths: remainingTenureMonths !== undefined ? Number(remainingTenureMonths) : tenure,
      emiAmount: calculatedEmi,
      dueDay: Math.min(31, Math.max(1, Number(dueDay) || 5)),
      startDate: startDate || new Date().toISOString().split("T")[0],
      accountNumber: accountNumber || "",
      notes: notes || "",
      status: "active",
    });

    res.status(201).json({ success: true, message: "Loan created successfully", loan });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create loan", error: error.message });
  }
});

/**
 * GET /api/loans/:id
 * Retrieve loan with complete payment history and amortization
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const loan = await Loan.findOne({ _id: req.params.id, userId });

    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    const loanIdMatches = [loan._id.toString(), loan._id];
    const payments = await Transaction.find({
      userId,
      loanId: { $in: loanIdMatches },
    }).sort({ date: -1, createdAt: -1 });

    const totalPaid = payments.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const totalPrincipalPaid = payments.reduce(
      (sum, tx) => sum + (Number(tx.principalAmount) || 0),
      0
    );
    const totalInterestPaid = payments.reduce(
      (sum, tx) => sum + (Number(tx.interestAmount) || 0),
      0
    );

    const schedule = calculateAmortizationSchedule(
      loan.currentOutstanding,
      loan.interestRate,
      loan.remainingTenureMonths || loan.tenureMonths
    );

    res.json({
      success: true,
      loan: {
        ...loan.toObject(),
        totalPaid,
        totalPrincipalPaid,
        totalInterestPaid,
        payments,
        scheduleSample: schedule.slice(0, 12), // Next 12 months preview
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch loan details", error: error.message });
  }
});

/**
 * PUT /api/loans/:id
 * Update loan
 */
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const updated = await Loan.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Loan not found or unauthorized" });
    }

    res.json({ success: true, message: "Loan updated successfully", loan: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update loan", error: error.message });
  }
});

/**
 * DELETE /api/loans/:id
 * Delete loan and unlink transactions
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await Loan.findOneAndDelete({ _id: req.params.id, userId });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Loan not found or unauthorized" });
    }

    const loanIdMatches = [deleted._id.toString(), deleted._id];
    await Transaction.updateMany(
      { userId, loanId: { $in: loanIdMatches } },
      { $set: { loanId: null } }
    );

    res.json({ success: true, message: "Loan deleted and associated transactions unlinked", id: req.params.id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete loan", error: error.message });
  }
});

/**
 * GET /api/loans/:id/amortization
 * Complete amortization schedule
 */
router.get("/:id/amortization", async (req, res) => {
  try {
    const userId = req.user.id;
    const loan = await Loan.findOne({ _id: req.params.id, userId });

    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    const schedule = calculateAmortizationSchedule(
      loan.currentOutstanding,
      loan.interestRate,
      loan.remainingTenureMonths || loan.tenureMonths
    );

    res.json({ success: true, schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to compute amortization schedule", error: error.message });
  }
});

/**
 * POST /api/loans/:id/prepayment-calculation
 * Extra payment / Prepayment simulator
 */
router.post("/:id/prepayment-calculation", async (req, res) => {
  try {
    const userId = req.user.id;
    const loan = await Loan.findOne({ _id: req.params.id, userId });

    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    const { extraMonthly = 0, lumpSum = 0 } = req.body;

    const result = simulatePrepayment(
      loan.currentOutstanding,
      loan.interestRate,
      loan.emiAmount,
      Number(extraMonthly) || 0,
      Number(lumpSum) || 0
    );

    res.json({ success: true, simulation: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Prepayment calculation failed", error: error.message });
  }
});

export default router;
