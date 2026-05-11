/**
 * charts.js
 * Chart.js visualization layer for Smart EMI & Loan Comparison Advisor
 * Handles all chart creation, updates, and destruction lifecycle
 */

// ============================================================
// CHART REGISTRY & THEME
// ============================================================

// Registry to track active charts for cleanup
const ChartRegistry = {};

// Design tokens — synced with CSS variables
const CHART_THEME = {
  dark: {
    bg: "transparent",
    grid: "rgba(255,255,255,0.06)",
    text: "#94A3B8",
    tooltip: { bg: "#0D1B3E", border: "#1E3A5F" },
    gradient1: ["rgba(14,165,233,0.8)", "rgba(14,165,233,0.05)"],
    gradient2: ["rgba(16,185,129,0.8)", "rgba(16,185,129,0.05)"],
  },
  light: {
    bg: "transparent",
    grid: "rgba(0,0,0,0.06)",
    text: "#64748B",
    tooltip: { bg: "#FFFFFF", border: "#E2E8F0" },
    gradient1: ["rgba(14,165,233,0.7)", "rgba(14,165,233,0.05)"],
    gradient2: ["rgba(16,185,129,0.7)", "rgba(16,185,129,0.05)"],
  },
};

const COLORS = {
  primary: "#0EA5E9",     // sky blue
  success: "#10B981",     // emerald
  warning: "#F59E0B",     // amber
  danger: "#EF4444",      // red
  purple: "#8B5CF6",      // violet
  pink: "#EC4899",        // pink
  orange: "#F97316",      // orange
  teal: "#14B8A6",        // teal
  indigo: "#6366F1",      // indigo
};

function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? CHART_THEME.dark
    : CHART_THEME.light;
}

/**
 * Destroy a chart if it exists in registry
 */
function destroyChart(id) {
  if (ChartRegistry[id]) {
    ChartRegistry[id].destroy();
    delete ChartRegistry[id];
  }
}

/**
 * Create a vertical linear gradient for area charts
 */
function createGradient(ctx, colorStart, colorEnd) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

/**
 * Base chart options shared across all charts
 */
function getBaseOptions() {
  const theme = getTheme();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: "easeInOutQuart" },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: theme.text,
          font: { family: "'DM Sans', sans-serif", size: 12 },
          padding: 20,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: theme.tooltip.bg,
        borderColor: theme.tooltip.border,
        borderWidth: 1,
        titleColor: "#E2E8F0",
        bodyColor: theme.text,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "'DM Sans', sans-serif", weight: "600" },
        bodyFont: { family: "'DM Sans', sans-serif" },
        callbacks: {
          label: (ctx) => ` ₹${window.FinCalc.formatIndianNumber(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: theme.grid, drawBorder: false },
        ticks: { color: theme.text, font: { family: "'DM Sans', sans-serif", size: 11 } },
      },
      y: {
        grid: { color: theme.grid, drawBorder: false },
        ticks: {
          color: theme.text,
          font: { family: "'DM Sans', sans-serif", size: 11 },
          callback: (v) => `₹${window.FinCalc.formatCurrency(v)}`,
        },
        beginAtZero: true,
      },
    },
  };
}

// ============================================================
// EMI BREAKDOWN DOUGHNUT CHART
// ============================================================

/**
 * Render principal vs interest doughnut chart on dashboard
 */
function renderEMIBreakdownChart(canvasId, principal, totalInterest) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;
  const theme = getTheme();

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Principal Amount", "Total Interest"],
      datasets: [
        {
          data: [principal, totalInterest],
          backgroundColor: [COLORS.primary, COLORS.warning],
          borderColor: theme.tooltip.bg,
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      animation: { duration: 1000, easing: "easeInOutQuart" },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: theme.text,
            font: { family: "'DM Sans', sans-serif", size: 12 },
            padding: 16,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: theme.tooltip.bg,
          borderColor: theme.tooltip.border,
          borderWidth: 1,
          titleColor: "#E2E8F0",
          bodyColor: theme.text,
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` ₹${window.FinCalc.formatIndianNumber(ctx.raw)} (${((ctx.raw / (principal + totalInterest)) * 100).toFixed(1)}%)`,
          },
        },
      },
    },
  });
}

// ============================================================
// AMORTIZATION AREA CHART
// ============================================================

/**
 * Render principal vs interest stacked area chart over loan timeline
 */
function renderAmortizationChart(canvasId, schedule) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  // Sample every 3rd month for performance on long tenures
  const sampleRate = Math.max(1, Math.floor(schedule.length / 60));
  const sampled = schedule.filter((_, i) => i % sampleRate === 0 || i === schedule.length - 1);

  const labels = sampled.map((r) => `M${r.month}`);
  const principalData = sampled.map((r) => r.cumulativePrincipal);
  const interestData = sampled.map((r) => r.cumulativeInterest);
  const balanceData = sampled.map((r) => r.balance);

  const gradPrincipal = createGradient(ctx, "rgba(14,165,233,0.5)", "rgba(14,165,233,0.02)");
  const gradInterest = createGradient(ctx, "rgba(245,158,11,0.5)", "rgba(245,158,11,0.02)");

  const baseOpts = getBaseOptions();
  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Cumulative Principal",
          data: principalData,
          borderColor: COLORS.primary,
          backgroundColor: gradPrincipal,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: "Cumulative Interest",
          data: interestData,
          borderColor: COLORS.warning,
          backgroundColor: gradInterest,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: "Outstanding Balance",
          data: balanceData,
          borderColor: COLORS.danger,
          backgroundColor: "transparent",
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    },
    options: { ...baseOpts, interaction: { intersect: false, mode: "index" } },
  });
}

// ============================================================
// YEARLY PRINCIPAL vs INTEREST BAR CHART
// ============================================================

/**
 * Render grouped bar chart: yearly principal vs interest breakdown
 */
function renderYearlyBreakdownChart(canvasId, yearlySummary) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  const labels = yearlySummary.map((y) => `Year ${y.year}`);
  const principalData = yearlySummary.map((y) => Math.round(y.totalPrincipal));
  const interestData = yearlySummary.map((y) => Math.round(y.totalInterest));

  const baseOpts = getBaseOptions();
  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Principal",
          data: principalData,
          backgroundColor: COLORS.primary + "CC",
          borderColor: COLORS.primary,
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "Interest",
          data: interestData,
          backgroundColor: COLORS.warning + "CC",
          borderColor: COLORS.warning,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...baseOpts,
      interaction: { intersect: false, mode: "index" },
      scales: {
        ...baseOpts.scales,
        x: { ...baseOpts.scales.x, stacked: false },
        y: { ...baseOpts.scales.y, stacked: false },
      },
    },
  });
}

// ============================================================
// LOAN COMPARISON RADAR CHART
// ============================================================

/**
 * Render radar chart for multi-loan comparison
 */
function renderLoanComparisonRadar(canvasId, loans) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;
  const theme = getTheme();

  // Normalize metrics to 0-100 scale for radar
  const maxEMI = Math.max(...loans.map((l) => l.emi));
  const maxInterest = Math.max(...loans.map((l) => l.totalInterest));
  const maxRate = Math.max(...loans.map((l) => l.rate));
  const maxTenure = Math.max(...loans.map((l) => l.tenureMonths));

  const loanColors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.purple];

  const datasets = loans.map((loan, i) => ({
    label: loan.name,
    data: [
      (1 - loan.emi / maxEMI) * 100,           // Lower EMI = better
      (1 - loan.totalInterest / maxInterest) * 100, // Lower interest = better
      (1 - loan.rate / maxRate) * 100,          // Lower rate = better
      (1 - loan.tenureMonths / maxTenure) * 100, // Shorter tenure = better
      loan.isBestDeal ? 90 : 50,                // Overall score
    ],
    borderColor: loanColors[i % loanColors.length],
    backgroundColor: loanColors[i % loanColors.length] + "25",
    borderWidth: 2,
    pointBackgroundColor: loanColors[i % loanColors.length],
    pointRadius: 4,
  }));

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["Low EMI", "Low Interest", "Best Rate", "Short Tenure", "Overall"],
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800 },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { color: theme.text, font: { family: "'DM Sans', sans-serif" }, padding: 16 },
        },
        tooltip: {
          backgroundColor: theme.tooltip.bg,
          borderColor: theme.tooltip.border,
          borderWidth: 1,
          titleColor: "#E2E8F0",
          bodyColor: theme.text,
          callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(0)} score` },
        },
      },
      scales: {
        r: {
          grid: { color: theme.grid },
          angleLines: { color: theme.grid },
          pointLabels: { color: theme.text, font: { family: "'DM Sans', sans-serif", size: 12 } },
          ticks: { display: false, backdropColor: "transparent" },
          min: 0,
          max: 100,
        },
      },
    },
  });
}

// ============================================================
// LOAN COMPARISON BAR CHART
// ============================================================

/**
 * Render grouped bar chart comparing total payable across loans
 */
function renderLoanComparisonBars(canvasId, loans) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  const colors = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.purple];
  const baseOpts = getBaseOptions();

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: loans.map((l) => l.name),
      datasets: [
        {
          label: "Principal",
          data: loans.map((l) => l.principal),
          backgroundColor: colors.map((c) => c + "AA"),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: "Total Interest",
          data: loans.map((l) => l.totalInterest),
          backgroundColor: colors.map(() => COLORS.warning + "AA"),
          borderColor: colors.map(() => COLORS.warning),
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      ...baseOpts,
      scales: {
        x: { ...baseOpts.scales.x, stacked: true },
        y: { ...baseOpts.scales.y, stacked: true },
      },
      interaction: { intersect: false, mode: "index" },
    },
  });
}

// ============================================================
// PREPAYMENT SAVINGS LINE CHART
// ============================================================

/**
 * Show interest savings curve as prepayment amount increases
 */
function renderPrepaymentSavingsChart(canvasId, principal, annualRate, tenureMonths, prepaymentMonth) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  // Calculate savings at 5%, 10%, 15%, ..., 50% prepayment
  const percentages = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const savingsData = percentages.map((pct) => {
    const amount = (pct / 100) * principal;
    const result = window.FinCalc.analyzePrepayment(
      principal, annualRate, tenureMonths, amount, prepaymentMonth
    );
    return result.interestSaved;
  });

  const gradient = createGradient(ctx, "rgba(16,185,129,0.5)", "rgba(16,185,129,0.02)");
  const baseOpts = getBaseOptions();

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: percentages.map((p) => `${p}% Prepay`),
      datasets: [
        {
          label: "Interest Saved",
          data: savingsData,
          borderColor: COLORS.success,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: COLORS.success,
          pointRadius: 5,
          pointHoverRadius: 8,
        },
      ],
    },
    options: { ...baseOpts, interaction: { intersect: false, mode: "index" } },
  });
}

// ============================================================
// EMI TIMELINE CHART (monthly breakdown visualization)
// ============================================================

/**
 * Render EMI timeline with principal/interest split per month
 */
function renderEMITimeline(canvasId, schedule, maxMonths = 60) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  const displaySchedule = schedule.slice(0, maxMonths);
  const labels = displaySchedule.map((r) => `M${r.month}`);
  const principalData = displaySchedule.map((r) => r.principal);
  const interestData = displaySchedule.map((r) => r.interest);
  const baseOpts = getBaseOptions();

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Principal",
          data: principalData,
          backgroundColor: COLORS.primary + "CC",
          borderRadius: 2,
          stack: "emi",
        },
        {
          label: "Interest",
          data: interestData,
          backgroundColor: COLORS.warning + "CC",
          borderRadius: 2,
          stack: "emi",
        },
      ],
    },
    options: {
      ...baseOpts,
      scales: {
        x: {
          ...baseOpts.scales.x,
          stacked: true,
          ticks: {
            ...baseOpts.scales.x.ticks,
            maxTicksLimit: 12,
            maxRotation: 0,
          },
        },
        y: { ...baseOpts.scales.y, stacked: true },
      },
      interaction: { intersect: false, mode: "index" },
    },
  });
}

// ============================================================
// RATE SENSITIVITY CHART
// ============================================================

/**
 * Show how EMI changes with different interest rates
 */
function renderRateSensitivityChart(canvasId, principal, baseRate, tenureMonths) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;

  const rates = [];
  const emis = [];
  const totalInterests = [];

  for (let rate = Math.max(1, baseRate - 4); rate <= baseRate + 4; rate += 0.5) {
    const emi = window.FinCalc.calculateEMI(principal, rate, tenureMonths);
    const interest = window.FinCalc.calculateTotalInterest(emi, tenureMonths, principal);
    rates.push(`${rate.toFixed(1)}%`);
    emis.push(Math.round(emi));
    totalInterests.push(Math.round(interest));
  }

  const theme = getTheme();
  const baseOpts = getBaseOptions();

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: rates,
      datasets: [
        {
          label: "Monthly EMI",
          data: emis,
          borderColor: COLORS.primary,
          backgroundColor: "transparent",
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 7,
          yAxisID: "y",
        },
        {
          label: "Total Interest",
          data: totalInterests,
          borderColor: COLORS.danger,
          backgroundColor: "transparent",
          tension: 0.4,
          borderWidth: 2.5,
          borderDash: [5, 3],
          pointRadius: 4,
          pointHoverRadius: 7,
          yAxisID: "y2",
        },
      ],
    },
    options: {
      ...baseOpts,
      interaction: { intersect: false, mode: "index" },
      scales: {
        x: baseOpts.scales.x,
        y: { ...baseOpts.scales.y, title: { display: true, text: "EMI (₹)", color: theme.text } },
        y2: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: {
            color: theme.text,
            font: { family: "'DM Sans', sans-serif", size: 11 },
            callback: (v) => `₹${window.FinCalc.formatCurrency(v)}`,
          },
          title: { display: true, text: "Total Interest (₹)", color: theme.text },
        },
      },
    },
  });
}

// ============================================================
// FINANCIAL HEALTH GAUGE
// ============================================================

/**
 * Render a health score gauge chart
 */
function renderHealthGauge(canvasId, score) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) return;
  const theme = getTheme();

  const color =
    score >= 75 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.danger;

  ChartRegistry[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [score, 100 - score],
          backgroundColor: [color, theme.tooltip.bg === "transparent" ? "#1E3A5F" : "#E2E8F0"],
          borderWidth: 0,
          circumference: 180,
          rotation: -90,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      animation: { duration: 1200 },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

// Update all charts when theme changes
function updateAllChartsTheme() {
  Object.keys(ChartRegistry).forEach((id) => {
    const chart = ChartRegistry[id];
    if (chart) chart.update();
  });
}

// Export
window.Charts = {
  renderEMIBreakdownChart,
  renderAmortizationChart,
  renderYearlyBreakdownChart,
  renderLoanComparisonRadar,
  renderLoanComparisonBars,
  renderPrepaymentSavingsChart,
  renderEMITimeline,
  renderRateSensitivityChart,
  renderHealthGauge,
  updateAllChartsTheme,
  destroyChart,
};
