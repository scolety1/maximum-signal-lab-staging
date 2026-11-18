import { ARTIFACT_COPY } from "../visitor-copy.js?v=1";

const PERIODS = Object.freeze({ "7d": [18, 26, 31, 44, 39, 52, 61], "30d": [32, 48, 41, 63, 57, 76, 82], "90d": [45, 39, 62, 58, 78, 72, 91] });
const CATEGORY_FACTORS = Object.freeze({ operators: 2, founders: 5, analysts: 7, quality: -4, delivery: 3, empty: 0 });
const KPI_LABELS = Object.freeze(["Active items", "Completed", "Completion rate", "Quality", "Needs review"]);

export function mountDashboard(container, recipe) {
  let period = "7d";
  let category = recipe.audience;
  let warnings = recipe.alerts !== "calm";

  container.innerHTML = dashboardMarkup(recipe);
  const root = container.querySelector(".generated-dashboard");
  const elements = collectDashboardElements(root);

  function update() {
    const empty = category === "empty";
    const metrics = metricModel(period, category);
    const values = empty ? [] : PERIODS[period].map((value, index) => clamp(value + CATEGORY_FACTORS[category] + index, 8, 98));
    const warning = !empty && metrics.successRate < 80;

    elements.periodButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.period === period)));
    elements.category.value = category;
    elements.warnings.setAttribute("aria-pressed", String(warnings));
    elements.warnings.textContent = `Warnings ${warnings ? "on" : "off"}`;

    elements.warning.classList.toggle("is-visible", warning && warnings);
    elements.warning.setAttribute("aria-hidden", String(!(warning && warnings)));
    elements.warningRate.textContent = `Completion is ${metrics.successRate}%. The target for this view is 80%.`;

    const kpiValues = [metrics.active, metrics.accepted, `${metrics.successRate}%`, `${metrics.quality}%`, metrics.recovery];
    elements.kpis.forEach((card, index) => {
      card.hidden = index >= recipe.kpiCount;
      card.classList.toggle("is-warning", index === 2 && metrics.successRate < 80 && !empty);
      card.querySelector("span").textContent = KPI_LABELS[index];
      card.querySelector("strong").textContent = kpiValues[index];
      card.querySelector("small").textContent = `${period.toUpperCase()} · ${categoryLabel(category)}`;
    });

    elements.main.hidden = empty || recipe.tableFallback;
    elements.table.hidden = empty || !recipe.tableFallback;
    elements.empty.hidden = !empty;

    elements.chartKind.textContent = ARTIFACT_COPY.dashboard.chart[recipe.chart] || "Activity trend";
    elements.chartTopic.textContent = ARTIFACT_COPY.dashboard.panels[recipe.primaryPanel] || "Project health";
    elements.chart.setAttribute("aria-label", `Trend values ${values.join(", ")}`);
    elements.bars.forEach((bar, index) => {
      const value = values[index] || 0;
      bar.style.setProperty("--bar", `${value}%`);
      bar.querySelector("span").textContent = String(value);
    });

    elements.feedItems.forEach((item, index) => {
      item.hidden = index >= recipe.feedLength;
      item.querySelector("b").textContent = String(index + 1).padStart(2, "0");
      item.querySelector("span").textContent = feedCopy(index, recipe.alerts, period, category);
    });

    elements.tableActive.textContent = metrics.active;
    elements.tableCompleted.textContent = metrics.accepted;
    elements.tableCompletion.textContent = `${metrics.successRate}%`;
    elements.tableHealth.textContent = metrics.successRate >= 80 ? "Healthy" : "Review";
    elements.status.textContent = empty
      ? "No activity matches these filters. Try another group or time period."
      : `Showing ${categoryLabel(category)} for ${period.toUpperCase()}. Warnings are ${warnings ? "on" : "off"}.`;
  }

  function onClick(event) {
    const nextPeriod = event.target.closest("[data-period]")?.dataset.period;
    if (nextPeriod) {
      period = nextPeriod;
      update();
      return;
    }
    if (event.target.closest("[data-warnings]")) {
      warnings = !warnings;
      update();
      return;
    }
    if (event.target.closest("[data-clear-filters]")) {
      period = "30d";
      category = recipe.audience;
      update();
      queueMicrotask(() => elements.category.focus({ preventScroll: true }));
    }
  }

  function onChange(event) {
    if (!event.target.matches("[data-category]")) return;
    category = event.target.value;
    update();
  }

  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  update();
  return () => {
    root.removeEventListener("click", onClick);
    root.removeEventListener("change", onChange);
  };
}

function dashboardMarkup(recipe) {
  return `<div class="generated-dashboard generated-dashboard--${escapeText(recipe.density)} generated-dashboard--primary-${escapeText(recipe.primaryPanel)}" style="--artifact-accent:${escapeText(recipe.accent)};--artifact-accent2:${escapeText(recipe.accent2)}">
    <header><div><span>${ARTIFACT_COPY.dashboard.title}</span><strong>${escapeText(recipe.title)}</strong><small>${escapeText(ARTIFACT_COPY.dashboard.purposes[recipe.audience] || "Project health")}</small></div><div class="dashboard-filters" aria-label="Dashboard filters"><div aria-label="Time period">${Object.keys(PERIODS).map((id) => `<button type="button" data-period="${id}" aria-pressed="${id === "7d"}">${id.toUpperCase()}</button>`).join("")}</div><label>Group<select data-category><optgroup label="People"><option value="operators">Operators</option><option value="founders">Founders</option><option value="analysts">Analysts</option></optgroup><optgroup label="Topic"><option value="quality">Quality</option><option value="delivery">Delivery</option></optgroup><optgroup label="Test state"><option value="empty">No activity</option></optgroup></select></label><button type="button" data-warnings aria-pressed="true">Warnings on</button></div></header>
    <div class="dashboard-warning" data-dashboard-warning aria-hidden="true"><strong>Completion rate needs attention</strong><span data-warning-rate></span></div>
    <section class="dashboard-kpis" aria-label="Project metrics">${Array.from({ length: 5 }, () => '<article><span></span><strong></strong><small></small></article>').join("")}</section>
    <div class="dashboard-content-slot">
      <section class="dashboard-main" data-dashboard-main><article class="dashboard-chart"><div><span data-chart-kind></span><strong data-chart-topic></strong></div><div class="dashboard-bars" data-dashboard-chart role="img">${Array.from({ length: 7 }, () => '<i><span></span></i>').join("")}</div></article><aside class="dashboard-feed"><span>Recent activity</span>${Array.from({ length: 5 }, () => '<p><b></b><span></span></p>').join("")}</aside></section>
      <section class="dashboard-table-wrap" data-dashboard-table hidden><table><caption>Metric details</caption><thead><tr><th>Measure</th><th>Current</th><th>Status</th></tr></thead><tbody><tr><td>Active items</td><td data-table-active></td><td>Active</td></tr><tr><td>Completed</td><td data-table-completed></td><td>Complete</td></tr><tr><td>Completion rate</td><td data-table-completion></td><td data-table-health></td></tr></tbody></table></section>
      <section class="dashboard-empty" data-dashboard-empty hidden><span>No matching activity</span><strong>${recipe.emptyState === "data-guidance" ? "Choose a broader group or time period." : "Reset the filters to see current work."}</strong><button type="button" data-clear-filters>Reset filters</button></section>
    </div>
    <p class="dashboard-announcement" data-dashboard-status role="status" aria-live="polite"></p>
  </div>`;
}

function collectDashboardElements(root) {
  return {
    periodButtons: [...root.querySelectorAll("[data-period]")],
    category: root.querySelector("[data-category]"),
    warnings: root.querySelector("[data-warnings]"),
    warning: root.querySelector("[data-dashboard-warning]"),
    warningRate: root.querySelector("[data-warning-rate]"),
    kpis: [...root.querySelectorAll(".dashboard-kpis article")],
    main: root.querySelector("[data-dashboard-main]"),
    table: root.querySelector("[data-dashboard-table]"),
    empty: root.querySelector("[data-dashboard-empty]"),
    chartKind: root.querySelector("[data-chart-kind]"),
    chartTopic: root.querySelector("[data-chart-topic]"),
    chart: root.querySelector("[data-dashboard-chart]"),
    bars: [...root.querySelectorAll(".dashboard-bars i")],
    feedItems: [...root.querySelectorAll(".dashboard-feed p")],
    tableActive: root.querySelector("[data-table-active]"),
    tableCompleted: root.querySelector("[data-table-completed]"),
    tableCompletion: root.querySelector("[data-table-completion]"),
    tableHealth: root.querySelector("[data-table-health]"),
    status: root.querySelector("[data-dashboard-status]"),
  };
}

function metricModel(period, category) {
  if (category === "empty") return { active: 0, accepted: 0, successRate: 0, quality: 0, recovery: 0 };
  const base = PERIODS[period][PERIODS[period].length - 1] + CATEGORY_FACTORS[category];
  const active = Math.max(12, Math.round(base * 1.45));
  const successRate = clamp(72 + CATEGORY_FACTORS[category] + (period === "90d" ? 8 : period === "30d" ? 4 : 0), 62, 96);
  const accepted = Math.round(active * successRate / 100);
  return { active, accepted, successRate, quality: clamp(successRate + 5, 0, 99), recovery: Math.max(1, active - accepted) };
}

function feedCopy(index, alertTone, period, category) {
  return [
    alertTone === "calm" ? "Review requested for the completion rate" : "Completion rate fell below target",
    `Project marked complete in ${period.toUpperCase()}`,
    `View changed to ${categoryLabel(category)}`,
    "Fix verified",
    "Required check passed",
  ][index % 5];
}

function categoryLabel(value) { return ({ operators: "Operators", founders: "Founders", analysts: "Analysts", quality: "Quality", delivery: "Delivery", empty: "No activity" })[value] || "Project health"; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function escapeText(value) { const span = document.createElement("span"); span.textContent = String(value ?? ""); return span.innerHTML; }
