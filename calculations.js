/**
 * calculations.js
 * Core financial calculation engine for Smart EMI & Loan Comparison Advisor
 * All formulas are industry-standard banking mathematics
 */

// ============================================================
// EMI CALCULATION ENGINE
// ============================================================

/**
 * Calculate monthly EMI
 * Formula: EMI = P × r × (1+r)^n / [(1+r)^n - 1]
 * @param {number} principal - Loan amount in ₹
 * @param {number} annualRate - Annual interest rate in %
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {number} Monthly EMI amount
 */
function calculateEMI(principal, annualRate, tenureMonths) {
  if (annualRate === 0) return principal / tenureMonths;
  const r = annualRate / 100 / 12; // Monthly interest rate
  const n = tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return emi;
}

/**
 * Calculate total interest payable over loan tenure
 * @param {number} emi - Monthly EMI
 * @param {number} tenureMonths - Loan tenure in months
 * @param {number} principal - Original loan amount
 * @returns {number} Total interest amount
 */
function calculateTotalInterest(emi, tenureMonths, principal) {
  return emi * tenureMonths - principal;
}

/**
 * Calculate total amount payable (principal + interest)
 * @param {number} emi - Monthly EMI
 * @param {number} tenureMonths - Loan tenure in months
 * @returns {number} Total payable amount
 */
function calculateTotalPayable(emi, tenureMonths) {
  return emi * tenureMonths;
}

// ============================================================
// AMORTIZATION SCHEDULE ENGINE
// ============================================================

/**
 * Generate complete amortization schedule
 * Each row shows: month, EMI, principal portion, interest portion, outstanding balance
 * @param {number} principal - Loan amount
 * @param {number} annualRate - Annual interest rate %
 * @param {number} tenureMonths - Tenure in months
 * @returns {Array} Array of monthly repayment objects
 */
function generateAmortizationSchedule(principal, annualRate, tenureMonths) {
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const r = annualRate / 100 / 12;
  let outstandingBalance = principal;
  const schedule = [];
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  for (let month = 1; month <= tenureMonths; month++) {
    const interestComponent = outstandingBalance * r;
    const principalComponent = emi - interestComponent;
    outstandingBalance -= principalComponent;

    // Correct for floating point in last month
    if (month === tenureMonths) outstandingBalance = 0;

    totalInterestPaid += interestComponent;
    totalPrincipalPaid += principalComponent;

    schedule.push({
      month,
      emi: Math.round(emi * 100) / 100,
      principal: Math.round(principalComponent * 100) / 100,
      interest: Math.round(interestComponent * 100) / 100,
      balance: Math.round(Math.max(outstandingBalance, 0) * 100) / 100,
      cumulativeInterest: Math.round(totalInterestPaid * 100) / 100,
      cumulativePrincipal: Math.round(totalPrincipalPaid * 100) / 100,
      // Yearly milestone flag
      isYearEnd: month % 12 === 0,
      year: Math.ceil(month / 12),
    });
  }
  return schedule;
}

/**
 * Get yearly summary from amortization schedule
 * @param {Array} schedule - Full amortization schedule
 * @returns {Array} Yearly aggregated data
 */
function getYearlySummary(schedule) {
  const yearly = {};
  schedule.forEach((row) => {
    if (!yearly[row.year]) {
      yearly[row.year] = {
        year: row.year,
        totalEMI: 0,
        totalPrincipal: 0,
        totalInterest: 0,
        closingBalance: 0,
      };
    }
    yearly[row.year].totalEMI += row.emi;
    yearly[row.year].totalPrincipal += row.principal;
    yearly[row.year].totalInterest += row.interest;
    yearly[row.year].closingBalance = row.balance;
  });
  return Object.values(yearly);
}

// ============================================================
// PREPAYMENT ANALYSIS ENGINE
// ============================================================

/**
 * Calculate impact of lump sum prepayment
 * @param {number} principal - Original loan amount
 * @param {number} annualRate - Annual interest rate %
 * @param {number} tenureMonths - Original tenure in months
 * @param {number} prepaymentAmount - Lump sum prepayment
 * @param {number} prepaymentMonth - Month at which prepayment is made
 * @param {string} option - 'reduce_emi' or 'reduce_tenure'
 * @returns {Object} Analysis result with savings and new schedule
 */
function analyzePrepayment(
  principal,
  annualRate,
  tenureMonths,
  prepaymentAmount,
  prepaymentMonth,
  option = "reduce_tenure"
) {
  const originalSchedule = generateAmortizationSchedule(principal, annualRate, tenureMonths);
  const originalEMI = calculateEMI(principal, annualRate, tenureMonths);
  const originalTotalInterest = calculateTotalInterest(originalEMI, tenureMonths, principal);

  // Outstanding balance at prepayment month
  const outstandingAtPrepayment = originalSchedule[prepaymentMonth - 1]?.balance || 0;
  const newPrincipal = Math.max(0, outstandingAtPrepayment - prepaymentAmount);

  let newSchedule = [];
  let newEMI = originalEMI;
  let newTenure = tenureMonths - prepaymentMonth;

  if (option === "reduce_tenure") {
    // Keep same EMI, calculate new tenure
    newTenure = calculateNewTenure(newPrincipal, annualRate, originalEMI);
    newEMI = originalEMI;
  } else {
    // Keep same tenure, calculate new EMI
    newTenure = tenureMonths - prepaymentMonth;
    newEMI = newTenure > 0 ? calculateEMI(newPrincipal, annualRate, newTenure) : 0;
  }

  if (newPrincipal > 0 && newTenure > 0) {
    newSchedule = generateAmortizationSchedule(newPrincipal, annualRate, newTenure);
  }

  const interestAfterPrepayment = newSchedule.reduce((sum, row) => sum + row.interest, 0);
  const interestBeforePrepayment = originalSchedule
    .slice(0, prepaymentMonth)
    .reduce((sum, row) => sum + row.interest, 0);
  const newTotalInterest = interestBeforePrepayment + interestAfterPrepayment;

  return {
    originalEMI: Math.round(originalEMI),
    newEMI: Math.round(newEMI),
    originalTenure: tenureMonths,
    newTenure: prepaymentMonth + newTenure,
    monthsSaved: tenureMonths - (prepaymentMonth + newTenure),
    originalTotalInterest: Math.round(originalTotalInterest),
    newTotalInterest: Math.round(newTotalInterest),
    interestSaved: Math.round(originalTotalInterest - newTotalInterest),
    totalAmountSaved: Math.round(originalTotalInterest - newTotalInterest),
    roi: Math.round(((originalTotalInterest - newTotalInterest) / prepaymentAmount) * 100),
    outstandingAtPrepayment: Math.round(outstandingAtPrepayment),
    newSchedule,
  };
}

/**
 * Calculate new tenure when keeping EMI constant after prepayment
 * Reverse-engineer tenure using logarithm
 * @param {number} principal - Remaining principal
 * @param {number} annualRate - Annual rate %
 * @param {number} emi - Fixed EMI
 * @returns {number} New tenure in months
 */
function calculateNewTenure(principal, annualRate, emi) {
  if (principal <= 0) return 0;
  if (annualRate === 0) return Math.ceil(principal / emi);
  const r = annualRate / 100 / 12;
  // n = -log(1 - P*r/EMI) / log(1+r)
  const ratio = (principal * r) / emi;
  if (ratio >= 1) return Infinity; // EMI doesn't cover interest
  const n = -Math.log(1 - ratio) / Math.log(1 + r);
  return Math.ceil(n);
}

// ============================================================
// MULTI-LOAN COMPARISON ENGINE
// ============================================================

/**
 * Compare multiple loan options side by side
 * @param {Array} loans - Array of loan objects {name, principal, rate, tenure}
 * @returns {Array} Sorted and ranked loan comparisons with winner flags
 */
function compareLoans(loans) {
  const results = loans.map((loan) => {
    const tenureMonths = loan.tenureYears * 12;
    const emi = calculateEMI(loan.principal, loan.rate, tenureMonths);
    const totalInterest = calculateTotalInterest(emi, tenureMonths, loan.principal);
    const totalPayable = calculateTotalPayable(emi, tenureMonths);
    const interestToLoanRatio = (totalInterest / loan.principal) * 100;

    return {
      ...loan,
      tenureMonths,
      emi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayable: Math.round(totalPayable),
      interestToLoanRatio: Math.round(interestToLoanRatio * 10) / 10,
      effectiveMonthlyRate: loan.rate / 12,
      // Score: lower is better (normalized metric)
      score: totalPayable,
    };
  });

  // Sort by total payable (ascending = best first)
  results.sort((a, b) => a.score - b.score);

  // Assign rankings and labels
  results.forEach((r, idx) => {
    r.rank = idx + 1;
    r.isBestDeal = idx === 0;
    r.isWorstDeal = idx === results.length - 1;
    r.savingsVsBest = Math.round(r.totalPayable - results[0].totalPayable);
    r.emiSavingsVsBest = r.emi - results[0].emi;
  });

  return results;
}

// ============================================================
// SMART RECOMMENDATION ENGINE
// ============================================================

/**
 * Generate AI-style smart recommendations based on loan profile
 * @param {Object} loanData - Current loan parameters
 * @returns {Object} Recommendations with insights, tips, and risk assessment
 */
function generateRecommendations(loanData) {
  const { principal, annualRate, tenureMonths } = loanData;
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const totalInterest = calculateTotalInterest(emi, tenureMonths, principal);
  const interestRatio = (totalInterest / principal) * 100;

  const recommendations = [];
  const insights = [];
  let riskLevel = "LOW";
  let riskScore = 0;

  // --- Interest Burden Analysis ---
  if (interestRatio > 100) {
    riskScore += 3;
    recommendations.push({
      type: "warning",
      title: "High Interest Burden",
      message: `You'll pay ₹${formatCurrency(totalInterest)} in interest — ${interestRatio.toFixed(0)}% of your loan amount. Consider reducing tenure or negotiating a lower rate.`,
      action: "Reduce Tenure",
      impact: "HIGH",
      icon: "⚠️",
    });
  } else if (interestRatio > 60) {
    riskScore += 1;
    recommendations.push({
      type: "info",
      title: "Moderate Interest Cost",
      message: `Interest is ${interestRatio.toFixed(0)}% of principal. A partial prepayment in year 1-2 could save significantly.`,
      action: "Plan Prepayment",
      impact: "MEDIUM",
      icon: "💡",
    });
  }

  // --- Rate vs Market Analysis ---
  const marketRate = 8.5; // RBI repo-linked benchmark
  if (annualRate > marketRate + 3) {
    riskScore += 2;
    recommendations.push({
      type: "warning",
      title: "Above-Market Interest Rate",
      message: `Your rate (${annualRate}%) is ${(annualRate - marketRate).toFixed(1)}% above the current benchmark. Shop for better rates or refinance.`,
      action: "Explore Refinancing",
      impact: "HIGH",
      icon: "📊",
    });
  }

  // --- Tenure Optimization ---
  const optimalTenureMonths = Math.min(tenureMonths, 180); // 15 years max recommended
  if (tenureMonths > optimalTenureMonths) {
    recommendations.push({
      type: "tip",
      title: "Long Tenure Alert",
      message: `${tenureMonths / 12} years is a long commitment. Reducing to ${optimalTenureMonths / 12} years saves ₹${formatCurrency(
        calculateTotalInterest(calculateEMI(principal, annualRate, optimalTenureMonths), optimalTenureMonths, principal) - totalInterest > 0 ? 0 : totalInterest -
        calculateTotalInterest(calculateEMI(principal, annualRate, optimalTenureMonths), optimalTenureMonths, principal)
      )}.`,
      action: "Optimize Tenure",
      impact: "MEDIUM",
      icon: "📅",
    });
  }

  // --- EMI-to-Income Rule ---
  const maxSafeEMI = principal * 0.003; // Rough heuristic: EMI should be ~0.3% of loan for healthy finances
  insights.push({
    label: "EMI-to-Principal Ratio",
    value: `${((emi / principal) * 100).toFixed(2)}%/month`,
    status: emi / principal < 0.01 ? "good" : emi / principal < 0.02 ? "moderate" : "high",
  });

  // --- Prepayment Opportunity ---
  const prepaymentSavings = analyzePrepayment(principal, annualRate, tenureMonths, principal * 0.1, 12);
  if (prepaymentSavings.interestSaved > 0) {
    recommendations.push({
      type: "opportunity",
      title: "10% Prepayment Sweet Spot",
      message: `Paying ₹${formatCurrency(principal * 0.1)} extra in month 12 saves ₹${formatCurrency(prepaymentSavings.interestSaved)} in interest and reduces tenure by ${prepaymentSavings.monthsSaved} months.`,
      action: "Calculate Prepayment",
      impact: "HIGH",
      icon: "💰",
    });
  }

  // Risk Level
  if (riskScore >= 4) riskLevel = "HIGH";
  else if (riskScore >= 2) riskLevel = "MEDIUM";
  else riskLevel = "LOW";

  // Financial Health Metrics
  const healthScore = Math.max(0, 100 - riskScore * 15 - Math.min(30, interestRatio / 3));

  return {
    recommendations,
    insights,
    riskLevel,
    riskScore,
    healthScore: Math.round(healthScore),
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    interestRatio: Math.round(interestRatio * 10) / 10,
    totalPayable: Math.round(calculateTotalPayable(emi, tenureMonths)),
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format number as Indian currency (₹ with lakhs/crores)
 */
function formatCurrency(amount) {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return Math.round(amount).toLocaleString("en-IN");
}

/**
 * Format raw number with Indian locale commas
 */
function formatIndianNumber(num) {
  return Math.round(num).toLocaleString("en-IN");
}

/**
 * Convert months to human-readable duration
 */
function monthsToHuman(months) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} months`;
  if (remainingMonths === 0) return `${years} year${years > 1 ? "s" : ""}`;
  return `${years}y ${remainingMonths}m`;
}

/**
 * Calculate break-even point for refinancing
 * @param {number} closingCosts - Cost of refinancing
 * @param {number} monthlySavings - Monthly EMI savings after refinancing
 */
function calculateRefinancingBreakeven(closingCosts, monthlySavings) {
  if (monthlySavings <= 0) return Infinity;
  return Math.ceil(closingCosts / monthlySavings);
}

// Export all functions for use in app.js
window.FinCalc = {
  calculateEMI,
  calculateTotalInterest,
  calculateTotalPayable,
  generateAmortizationSchedule,
  getYearlySummary,
  analyzePrepayment,
  calculateNewTenure,
  compareLoans,
  generateRecommendations,
  formatCurrency,
  formatIndianNumber,
  monthsToHuman,
  calculateRefinancingBreakeven,
};
