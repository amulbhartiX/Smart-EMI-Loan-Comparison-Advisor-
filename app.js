/**
 * app.js
 * Main application controller for Smart EMI & Loan Comparison Advisor
 * Handles UI state, user events, tab navigation, and data export
 */

// ============================================================
// APPLICATION STATE
// ============================================================

const AppState = {
  // Current loan parameters
  loan: {
    principal: 2500000,   // ₹25 Lakh default
    annualRate: 8.5,
    tenureYears: 20,
    tenureMonths: 240,
  },

  // Amortization data
  schedule: [],
  yearlySummary: [],

  // Comparison loans
  comparisonLoans: [
    { id: 1, name: "HDFC Bank", principal: 2500000, rate: 8.5, tenureYears: 20 },
    { id: 2, name: "SBI Home Loan", principal: 2500000, rate: 8.2, tenureYears: 20 },
    { id: 3, name: "ICICI Bank", principal: 2500000, rate: 8.75, tenureYears: 20 },
  ],

  // Prepayment
  prepayment: {
    amount: 250000,
    month: 12,
    option: "reduce_tenure",
  },

  // UI
  activeTab: "dashboard",
  theme: "dark",
  amortizationPage: 1,
  rowsPerPage: 12,
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavigation();
  initEMICalculator();
  initLoanComparison();
  initPrepayment();
  initDownloadReport();
  calculateAndRender();
  initAnimations();
  initMobileMenu();
  console.log("✅ Smart EMI Advisor initialized");
});

// ============================================================
// THEME MANAGEMENT
// ============================================================

function initTheme() {
  const saved = localStorage.getItem("emi-theme") || "dark";
  setTheme(saved);
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = AppState.theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("emi-theme", next);
    // Re-render charts with new theme
    setTimeout(() => calculateAndRender(), 100);
  });
}

function setTheme(theme) {
  AppState.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.innerHTML = theme === "dark"
      ? '<span class="icon">☀️</span><span>Light</span>'
      : '<span class="icon">🌙</span><span>Dark</span>';
  }
}

// ============================================================
// NAVIGATION
// ============================================================

function initNavigation() {
  document.querySelectorAll(".nav-item[data-tab]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = item.getAttribute("data-tab");
      switchTab(tab);
      // Close mobile menu after selection
      document.getElementById("sidebar")?.classList.remove("open");
      document.getElementById("overlay")?.classList.remove("active");
    });
  });
}

function switchTab(tabId) {
  AppState.activeTab = tabId;

  // Update nav items
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-tab") === tabId);
  });

  // Update tab panels with animation
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.remove("active");
  });

  const target = document.getElementById(`tab-${tabId}`);
  if (target) {
    target.classList.add("active");
    // Trigger chart renders for the active tab
    requestAnimationFrame(() => renderTabCharts(tabId));
  }
}

function renderTabCharts(tabId) {
  const { schedule, yearlySummary, loan } = AppState;
  const result = window.FinCalc.calculateEMI(loan.principal, loan.annualRate, loan.tenureMonths);
  const totalInterest = window.FinCalc.calculateTotalInterest(result, loan.tenureMonths, loan.principal);

  switch (tabId) {
    case "dashboard":
      window.Charts.renderEMIBreakdownChart("emiDonutChart", loan.principal, totalInterest);
      window.Charts.renderEMITimeline("emiTimelineChart", schedule, 60);
      break;
    case "amortization":
      window.Charts.renderAmortizationChart("amortizationChart", schedule);
      window.Charts.renderYearlyBreakdownChart("yearlyBreakdownChart", yearlySummary);
      renderAmortizationTable();
      break;
    case "comparison":
      renderComparisonResults();
      break;
    case "prepayment":
      renderPrepaymentResults();
      break;
    case "insights":
      renderInsights();
      break;
    case "recommendations":
      renderRecommendations();
      break;
  }
}

// ============================================================
// MAIN CALCULATION & RENDER
// ============================================================

function calculateAndRender() {
  const { principal, annualRate, tenureMonths } = AppState.loan;
  const emi = window.FinCalc.calculateEMI(principal, annualRate, tenureMonths);
  const totalInterest = window.FinCalc.calculateTotalInterest(emi, tenureMonths, principal);
  const totalPayable = window.FinCalc.calculateTotalPayable(emi, tenureMonths);

  // Generate schedule
  AppState.schedule = window.FinCalc.generateAmortizationSchedule(principal, annualRate, tenureMonths);
  AppState.yearlySummary = window.FinCalc.getYearlySummary(AppState.schedule);

  // Update stat cards
  updateStatCards({ emi, totalInterest, totalPayable, principal, annualRate, tenureMonths });

  // Render active tab charts
  renderTabCharts(AppState.activeTab);
  
  // Update EMI input display
  updateEMIDisplay(emi, totalInterest, totalPayable);
}

function updateStatCards({ emi, totalInterest, totalPayable, principal, annualRate, tenureMonths }) {
  animateCounter("statEMI", emi, (v) => `₹${window.FinCalc.formatIndianNumber(v)}`);
  animateCounter("statInterest", totalInterest, (v) => `₹${window.FinCalc.formatCurrency(v)}`);
  animateCounter("statPayable", totalPayable, (v) => `₹${window.FinCalc.formatCurrency(v)}`);
  animateCounter("statInterestRatio", (totalInterest / principal) * 100, (v) => `${v.toFixed(1)}%`);

  // Update secondary info
  setTextContent("statEMILabel", `@ ${annualRate}% for ${tenureMonths / 12}y`);
  setTextContent("statPayableLabel", window.FinCalc.monthsToHuman(tenureMonths));
}

function updateEMIDisplay(emi, totalInterest, totalPayable) {
  setTextContent("calcEMIResult", `₹${window.FinCalc.formatIndianNumber(emi)}`);
  setTextContent("calcTotalInterest", `₹${window.FinCalc.formatIndianNumber(totalInterest)}`);
  setTextContent("calcTotalPayable", `₹${window.FinCalc.formatIndianNumber(totalPayable)}`);
  setTextContent("calcPrincipal", `₹${window.FinCalc.formatIndianNumber(AppState.loan.principal)}`);
  setTextContent("calcMonthlyRate", `${(AppState.loan.annualRate / 12).toFixed(3)}%/mo`);
}

// ============================================================
// EMI CALCULATOR UI
// ============================================================

function initEMICalculator() {
  const inputs = ["loanAmount", "interestRate", "loanTenure"];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", debounce(handleEMIInput, 300));
    // Sync range and number inputs
    const rangeId = id + "Range";
    const rangeEl = document.getElementById(rangeId);
    if (rangeEl) {
      rangeEl.addEventListener("input", () => {
        el.value = rangeEl.value;
        handleEMIInput();
      });
      el.addEventListener("input", () => {
        rangeEl.value = el.value;
      });
    }
  });
}

function handleEMIInput() {
  const principal = parseFloat(document.getElementById("loanAmount")?.value) || 0;
  const rate = parseFloat(document.getElementById("interestRate")?.value) || 0;
  const years = parseFloat(document.getElementById("loanTenure")?.value) || 1;

  if (principal <= 0 || rate <= 0 || years <= 0) return;

  AppState.loan = {
    principal,
    annualRate: rate,
    tenureYears: years,
    tenureMonths: years * 12,
  };

  calculateAndRender();
}

// ============================================================
// LOAN COMPARISON
// ============================================================

function initLoanComparison() {
  document.getElementById("addLoan")?.addEventListener("click", addComparisonLoan);
  document.getElementById("compareLoans")?.addEventListener("click", runLoanComparison);
  renderComparisonInputs();
}

function addComparisonLoan() {
  if (AppState.comparisonLoans.length >= 4) {
    showNotification("Maximum 4 loans can be compared", "warning");
    return;
  }
  const newId = Date.now();
  AppState.comparisonLoans.push({
    id: newId,
    name: `Loan ${AppState.comparisonLoans.length + 1}`,
    principal: AppState.loan.principal,
    rate: AppState.loan.annualRate,
    tenureYears: AppState.loan.tenureYears,
  });
  renderComparisonInputs();
}

function renderComparisonInputs() {
  const container = document.getElementById("comparisonInputs");
  if (!container) return;

  container.innerHTML = AppState.comparisonLoans.map((loan, idx) => `
    <div class="comparison-loan-input glass-card" data-id="${loan.id}">
      <div class="loan-input-header">
        <div class="loan-badge loan-badge-${idx + 1}">${String.fromCharCode(65 + idx)}</div>
        <input class="loan-name-input" type="text" value="${loan.name}"
          oninput="updateLoanField(${loan.id}, 'name', this.value)" />
        ${idx >= 3 ? `<button class="remove-loan" onclick="removeLoan(${loan.id})">✕</button>` : ""}
      </div>
      <div class="loan-inputs-grid">
        <div class="input-group">
          <label>Principal (₹)</label>
          <input type="number" value="${loan.principal}" min="10000" step="10000"
            oninput="updateLoanField(${loan.id}, 'principal', +this.value)" />
        </div>
        <div class="input-group">
          <label>Rate (%)</label>
          <input type="number" value="${loan.rate}" min="1" max="30" step="0.1"
            oninput="updateLoanField(${loan.id}, 'rate', +this.value)" />
        </div>
        <div class="input-group">
          <label>Tenure (Years)</label>
          <input type="number" value="${loan.tenureYears}" min="1" max="30"
            oninput="updateLoanField(${loan.id}, 'tenureYears', +this.value)" />
        </div>
      </div>
    </div>
  `).join("");
}

function updateLoanField(id, field, value) {
  const loan = AppState.comparisonLoans.find((l) => l.id === id);
  if (loan) loan[field] = value;
}

function removeLoan(id) {
  AppState.comparisonLoans = AppState.comparisonLoans.filter((l) => l.id !== id);
  renderComparisonInputs();
}

function runLoanComparison() {
  const loans = AppState.comparisonLoans.filter(
    (l) => l.principal > 0 && l.rate > 0 && l.tenureYears > 0
  );
  if (loans.length < 2) {
    showNotification("Please add at least 2 loans to compare", "warning");
    return;
  }
  renderComparisonResults(loans);
}

function renderComparisonResults(loans) {
  const loansToUse = loans || AppState.comparisonLoans;
  const results = window.FinCalc.compareLoans(loansToUse);

  // Render comparison table
  const tableBody = document.getElementById("comparisonTableBody");
  if (tableBody) {
    tableBody.innerHTML = results.map((loan, idx) => `
      <tr class="${loan.isBestDeal ? "best-row" : ""}">
        <td>
          <div class="loan-name-cell">
            <span class="loan-rank rank-${idx + 1}">#${loan.rank}</span>
            ${loan.name}
            ${loan.isBestDeal ? '<span class="best-badge">✓ Best</span>' : ""}
          </div>
        </td>
        <td>₹${window.FinCalc.formatIndianNumber(loan.principal)}</td>
        <td class="rate-cell">${loan.rate}%</td>
        <td>${loan.tenureYears}y</td>
        <td class="highlight-cell">₹${window.FinCalc.formatIndianNumber(loan.emi)}</td>
        <td class="${loan.isBestDeal ? "green-text" : "orange-text"}">₹${window.FinCalc.formatIndianNumber(loan.totalInterest)}</td>
        <td class="bold-cell">₹${window.FinCalc.formatIndianNumber(loan.totalPayable)}</td>
        <td class="${loan.isBestDeal ? "green-text" : "red-text"}">
          ${loan.isBestDeal ? "—" : `+₹${window.FinCalc.formatIndianNumber(loan.savingsVsBest)}`}
        </td>
      </tr>
    `).join("");
  }

  // Charts
  window.Charts.renderLoanComparisonBars("comparisonBarsChart", results);
  window.Charts.renderLoanComparisonRadar("comparisonRadarChart", results);

  // Winner card
  const winner = results[0];
  const winnerEl = document.getElementById("comparisonWinner");
  if (winnerEl) {
    winnerEl.innerHTML = `
      <div class="winner-card glass-card">
        <div class="winner-badge">🏆 Best Deal</div>
        <h3>${winner.name}</h3>
        <div class="winner-stats">
          <div><span>EMI</span><strong>₹${window.FinCalc.formatIndianNumber(winner.emi)}/mo</strong></div>
          <div><span>Rate</span><strong>${winner.rate}%</strong></div>
          <div><span>You Save</span><strong class="green-text">₹${window.FinCalc.formatIndianNumber(results[results.length - 1].savingsVsBest - winner.savingsVsBest)}</strong></div>
        </div>
      </div>
    `;
  }
}

// ============================================================
// PREPAYMENT ANALYSIS
// ============================================================

function initPrepayment() {
  const inputs = ["prepayAmount", "prepayMonth", "prepayOption"];
  inputs.forEach((id) => {
    document.getElementById(id)?.addEventListener("change", debounce(renderPrepaymentResults, 300));
    document.getElementById(id)?.addEventListener("input", debounce(renderPrepaymentResults, 300));
  });
}

function renderPrepaymentResults() {
  const { principal, annualRate, tenureMonths } = AppState.loan;

  const prepayAmount = parseFloat(document.getElementById("prepayAmount")?.value) || 250000;
  const prepayMonth = parseInt(document.getElementById("prepayMonth")?.value) || 12;
  const prepayOption = document.getElementById("prepayOption")?.value || "reduce_tenure";

  if (prepayMonth >= tenureMonths) {
    showNotification("Prepayment month cannot exceed loan tenure", "warning");
    return;
  }

  const result = window.FinCalc.analyzePrepayment(
    principal, annualRate, tenureMonths, prepayAmount, prepayMonth, prepayOption
  );

  AppState.prepayment = { amount: prepayAmount, month: prepayMonth, option: prepayOption };

  // Update result cards
  setTextContent("prepayInterestSaved", `₹${window.FinCalc.formatIndianNumber(result.interestSaved)}`);
  setTextContent("prepayMonthsSaved", window.FinCalc.monthsToHuman(result.monthsSaved));
  setTextContent("prepayNewEMI", `₹${window.FinCalc.formatIndianNumber(result.newEMI)}`);
  setTextContent("prepayNewTenure", window.FinCalc.monthsToHuman(result.newTenure));
  setTextContent("prepayROI", `${result.roi}%`);
  setTextContent("prepayOriginalInterest", `₹${window.FinCalc.formatIndianNumber(result.originalTotalInterest)}`);
  setTextContent("prepayNewInterest", `₹${window.FinCalc.formatIndianNumber(result.newTotalInterest)}`);

  // Charts
  window.Charts.renderPrepaymentSavingsChart(
    "prepaymentSavingsChart", principal, annualRate, tenureMonths, prepayMonth
  );
}

// ============================================================
// AMORTIZATION TABLE
// ============================================================

function renderAmortizationTable(page) {
  page = page || AppState.amortizationPage;
  AppState.amortizationPage = page;

  const { schedule, rowsPerPage } = AppState;
  const totalPages = Math.ceil(schedule.length / rowsPerPage);
  const startIdx = (page - 1) * rowsPerPage;
  const pageData = schedule.slice(startIdx, startIdx + rowsPerPage);

  const tbody = document.getElementById("amortizationTableBody");
  if (!tbody) return;

  tbody.innerHTML = pageData.map((row) => `
    <tr class="${row.isYearEnd ? "year-end-row" : ""}">
      <td>${row.month} ${row.isYearEnd ? `<span class="year-tag">Y${row.year}</span>` : ""}</td>
      <td>₹${window.FinCalc.formatIndianNumber(row.emi)}</td>
      <td class="blue-text">₹${window.FinCalc.formatIndianNumber(row.principal)}</td>
      <td class="orange-text">₹${window.FinCalc.formatIndianNumber(row.interest)}</td>
      <td>₹${window.FinCalc.formatIndianNumber(row.balance)}</td>
      <td class="muted-text">${((row.cumulativePrincipal / AppState.loan.principal) * 100).toFixed(1)}%</td>
    </tr>
  `).join("");

  // Pagination
  const pagination = document.getElementById("amortizationPagination");
  if (pagination) {
    pagination.innerHTML = `
      <button class="page-btn" ${page === 1 ? "disabled" : ""} onclick="renderAmortizationTable(${page - 1})">← Prev</button>
      <span class="page-info">Page ${page} of ${totalPages} · ${schedule.length} months total</span>
      <button class="page-btn" ${page === totalPages ? "disabled" : ""} onclick="renderAmortizationTable(${page + 1})">Next →</button>
    `;
  }
}

// ============================================================
// FINANCIAL INSIGHTS
// ============================================================

function renderInsights() {
  const { principal, annualRate, tenureMonths } = AppState.loan;
  window.Charts.renderRateSensitivityChart(
    "rateSensitivityChart", principal, annualRate, tenureMonths
  );

  // Render tenure comparison table
  const tenures = [5, 10, 15, 20, 25, 30];
  const tbody = document.getElementById("tenureComparisonBody");
  if (tbody) {
    tbody.innerHTML = tenures.map((years) => {
      const months = years * 12;
      const emi = window.FinCalc.calculateEMI(principal, annualRate, months);
      const interest = window.FinCalc.calculateTotalInterest(emi, months, principal);
      const isActive = Math.abs(months - tenureMonths) < 6;
      return `
        <tr class="${isActive ? "active-row" : ""}">
          <td>${years} Years ${isActive ? '<span class="current-tag">Current</span>' : ""}</td>
          <td class="highlight-cell">₹${window.FinCalc.formatIndianNumber(emi)}</td>
          <td class="orange-text">₹${window.FinCalc.formatIndianNumber(interest)}</td>
          <td>₹${window.FinCalc.formatIndianNumber(emi * months)}</td>
          <td>${((interest / principal) * 100).toFixed(0)}%</td>
        </tr>
      `;
    }).join("");
  }
}

// ============================================================
// SMART RECOMMENDATIONS
// ============================================================

function renderRecommendations() {
  const recs = window.FinCalc.generateRecommendations(AppState.loan);

  // Health gauge
  window.Charts.renderHealthGauge("healthGaugeChart", recs.healthScore);
  setTextContent("healthScoreValue", `${recs.healthScore}/100`);
  setTextContent("riskLevel", recs.riskLevel);

  const riskEl = document.getElementById("riskLevel");
  if (riskEl) {
    riskEl.className = `risk-badge risk-${recs.riskLevel.toLowerCase()}`;
  }

  // Recommendations list
  const container = document.getElementById("recommendationsList");
  if (container) {
    container.innerHTML = recs.recommendations.map((rec) => `
      <div class="rec-card rec-${rec.type} glass-card">
        <div class="rec-header">
          <span class="rec-icon">${rec.icon}</span>
          <div>
            <h4>${rec.title}</h4>
            <span class="impact-badge impact-${rec.impact.toLowerCase()}">${rec.impact} IMPACT</span>
          </div>
        </div>
        <p>${rec.message}</p>
        <button class="rec-action" onclick="handleRecAction('${rec.action}')">
          ${rec.action} →
        </button>
      </div>
    `).join("");
  }

  // Key metrics
  setTextContent("recEMI", `₹${window.FinCalc.formatIndianNumber(recs.emi)}`);
  setTextContent("recInterest", `₹${window.FinCalc.formatCurrency(recs.totalInterest)}`);
  setTextContent("recRatio", `${recs.interestRatio}%`);
}

function handleRecAction(action) {
  const actionMap = {
    "Reduce Tenure": () => switchTab("insights"),
    "Plan Prepayment": () => switchTab("prepayment"),
    "Calculate Prepayment": () => switchTab("prepayment"),
    "Explore Refinancing": () => switchTab("comparison"),
    "Optimize Tenure": () => switchTab("insights"),
  };
  const fn = actionMap[action];
  if (fn) fn();
}

// ============================================================
// DOWNLOAD / EXPORT
// ============================================================

function initDownloadReport() {
  document.getElementById("downloadCSV")?.addEventListener("click", downloadCSV);
  document.getElementById("downloadSummary")?.addEventListener("click", downloadSummary);
}

function downloadCSV() {
  const { schedule, loan } = AppState;
  const headers = ["Month", "EMI (₹)", "Principal (₹)", "Interest (₹)", "Balance (₹)", "Cumulative Principal (₹)", "Cumulative Interest (₹)"];
  const rows = schedule.map((r) => [
    r.month, r.emi, r.principal, r.interest, r.balance, r.cumulativePrincipal, r.cumulativeInterest,
  ]);

  const csv = [
    `Smart EMI Advisor - Amortization Schedule`,
    `Loan: ₹${window.FinCalc.formatIndianNumber(loan.principal)} @ ${loan.annualRate}% for ${loan.tenureYears} years`,
    `Generated: ${new Date().toLocaleDateString("en-IN")}`,
    "",
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `EMI_Schedule_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification("CSV downloaded successfully!", "success");
}

function downloadSummary() {
  const { loan, yearlySummary } = AppState;
  const emi = window.FinCalc.calculateEMI(loan.principal, loan.annualRate, loan.tenureMonths);
  const totalInterest = window.FinCalc.calculateTotalInterest(emi, loan.tenureMonths, loan.principal);

  const content = `
SMART EMI & LOAN COMPARISON ADVISOR
Loan Summary Report
Generated: ${new Date().toLocaleString("en-IN")}
${"=".repeat(60)}

LOAN DETAILS
Principal:        ₹${window.FinCalc.formatIndianNumber(loan.principal)}
Interest Rate:    ${loan.annualRate}% per annum
Tenure:           ${loan.tenureYears} years (${loan.tenureMonths} months)
Monthly EMI:      ₹${window.FinCalc.formatIndianNumber(emi)}
Total Interest:   ₹${window.FinCalc.formatIndianNumber(totalInterest)}
Total Payable:    ₹${window.FinCalc.formatIndianNumber(emi * loan.tenureMonths)}
Interest Burden:  ${((totalInterest / loan.principal) * 100).toFixed(1)}%

YEARLY BREAKDOWN
${"─".repeat(60)}
Year | EMI Paid      | Principal     | Interest      | Balance
${"─".repeat(60)}
${yearlySummary.map((y) => 
  `${String(y.year).padStart(4)} | ₹${window.FinCalc.formatIndianNumber(y.totalEMI).padEnd(13)} | ₹${window.FinCalc.formatIndianNumber(y.totalPrincipal).padEnd(13)} | ₹${window.FinCalc.formatIndianNumber(y.totalInterest).padEnd(13)} | ₹${window.FinCalc.formatIndianNumber(y.closingBalance)}`
).join("\n")}

Generated by Smart EMI & Loan Comparison Advisor
  `.trim();

  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Loan_Summary_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification("Summary report downloaded!", "success");
}

// ============================================================
// UI UTILITIES
// ============================================================

function setTextContent(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * Animate a counter from current to target value
 */
function animateCounter(id, target, formatter, duration = 600) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0;
  const startTime = performance.now();
  const update = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    const current = start + (target - start) * eased;
    el.textContent = formatter(current);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/**
 * Debounce utility
 */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Show a toast notification
 */
function showNotification(message, type = "info") {
  const container = document.getElementById("notifications");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${{ success: "✓", warning: "⚠", error: "✗", info: "ℹ" }[type]}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Initialize entrance animations
 */
function initAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll(".glass-card, .stat-card").forEach((el) => observer.observe(el));
}

/**
 * Mobile sidebar toggle
 */
function initMobileMenu() {
  document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("open");
    document.getElementById("overlay")?.classList.toggle("active");
  });
  document.getElementById("overlay")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("overlay")?.classList.remove("active");
  });
}

// Global access for inline handlers
window.renderAmortizationTable = renderAmortizationTable;
window.updateLoanField = updateLoanField;
window.removeLoan = removeLoan;
window.handleRecAction = handleRecAction;
window.switchTab = switchTab;
