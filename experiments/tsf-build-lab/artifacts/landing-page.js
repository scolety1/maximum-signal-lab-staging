import { ARTIFACT_COPY } from "../visitor-copy.js?v=1";

export function mountLandingPage(container, recipe) {
  let signals = 0;
  let altTheme = false;
  let activeCard = 0;
  const copy = ARTIFACT_COPY.landing.audience[recipe.audience] || ARTIFACT_COPY.landing.audience.customers;
  const sections = buildLandingSections(recipe);

  container.innerHTML = `<div class="generated-landing generated-landing--${escapeText(recipe.layout)} generated-landing--${escapeText(recipe.style)}" style="--artifact-accent:${escapeText(recipe.accent)};--artifact-accent2:${escapeText(recipe.accent2)}" data-alt="false">
    <nav aria-label="Page navigation"><strong>${escapeText(recipe.title)}</strong><div>${sections.map((section, index) => `<button type="button" data-page-section="${index}" aria-pressed="${index === 0}">${escapeText(section.title)}</button>`).join("")}</div></nav>
    <section class="generated-hero generated-hero--${escapeText(recipe.hero)}" data-page-panel="0">
      <p>${escapeText(copy.eyebrow)}</p><h5>${escapeText(copy.headline)}</h5><span>${escapeText(copy.subhead)}</span>
      <button type="button" data-page-cta ${recipe.interaction === "theme-shift" ? 'aria-pressed="false"' : ""}>${escapeText(ARTIFACT_COPY.landing.actions[recipe.interaction])} <b aria-hidden="true">→</b></button>
      <output data-page-output aria-live="polite">Choose a section or try the main action.</output>
    </section>
    <section class="generated-sections" aria-label="Page highlights">
      ${sections.map((section, index) => `<article data-page-card="${index}" class="${index === 0 ? "is-active" : ""}"><span>0${index + 1}</span><h6>${escapeText(section.title)}</h6><p>${escapeText(section.summary)}</p><button type="button" data-card-toggle="${index}" aria-expanded="${index === 0}">${index === 0 ? "Hide detail" : "Show detail"}</button><small ${index === 0 ? "" : "hidden"} data-card-detail="${index}">${escapeText(section.detail)}</small></article>`).join("")}
    </section>
  </div>`;

  const root = container.querySelector(".generated-landing");
  const output = root.querySelector("[data-page-output]");

  function activateCard(index, announce = true) {
    activeCard = index;
    root.querySelectorAll("[data-page-card]").forEach((card) => card.classList.toggle("is-active", Number(card.dataset.pageCard) === index));
    root.querySelectorAll("[data-page-section]").forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.pageSection) === index)));
    if (announce) output.textContent = `Now showing ${sections[index].title}.`;
  }

  function onClick(event) {
    const section = event.target.closest("[data-page-section]");
    if (section) {
      activateCard(Number(section.dataset.pageSection));
      return;
    }

    const cardToggle = event.target.closest("[data-card-toggle]");
    if (cardToggle) {
      const index = Number(cardToggle.dataset.cardToggle);
      const detail = root.querySelector(`[data-card-detail="${index}"]`);
      const expanded = cardToggle.getAttribute("aria-expanded") === "true";
      cardToggle.setAttribute("aria-expanded", String(!expanded));
      cardToggle.textContent = expanded ? "Show detail" : "Hide detail";
      detail.hidden = expanded;
      activateCard(index, false);
      output.textContent = `${sections[index].title} details ${expanded ? "hidden" : "shown"}.`;
      return;
    }

    const cta = event.target.closest("[data-page-cta]");
    if (!cta) return;
    if (recipe.interaction === "theme-shift") {
      altTheme = !altTheme;
      root.dataset.alt = String(altTheme);
      cta.setAttribute("aria-pressed", String(altTheme));
      output.textContent = `${altTheme ? "Light" : "Dark"} theme active.`;
    }
    if (recipe.interaction === "section-jump") activateCard((activeCard + 1) % sections.length);
    if (recipe.interaction === "signal-launch") {
      signals += 1;
      root.dataset.activated = String(signals % 2 === 1);
      output.textContent = `Proof activated ${signals} time${signals === 1 ? "" : "s"}.`;
    }
  }

  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}

export function buildLandingSections(recipe) {
  const feature = {
    "feature-grid": [
      section("Core value", "Three benefits stay visible at a glance.", "Each card reveals supporting detail without sending the visitor to another page."),
      section("Working proof", "The main action changes visible page state.", "The result includes working behavior, not only a styled mockup."),
      section("Clear next step", "One primary action keeps the decision simple.", "The action follows the selected audience and response priority."),
    ],
    "story-scroll": [
      section("Problem", "Start with friction the visitor recognizes.", "The opening stays brief so the visitor can reach useful evidence quickly."),
      section("Decision", "Show the product choice that changed the outcome.", "The selected amount of detail controls how much supporting context appears."),
      section("Result", "Finish with an outcome the visitor can test.", "The interaction gives immediate feedback and can be repeated."),
    ],
    "live-proof": [
      section("Claim", "State one specific product promise.", "The promise stays close to the behavior that supports it."),
      section("Proof", "Use the page action and watch the result update.", "The counter and highlight are local browser state with no network request."),
      section("Method", "Explain what produced the result.", "The project choices connect layout, content, interaction, and one protected rule."),
    ],
  }[recipe.feature] || [];
  const extras = [
    section("Details", "Reveal supporting information only when it helps.", "Progressive disclosure keeps the page useful on small screens and for keyboard visitors."),
    section("Next step", "Close with a clear, reversible action.", "The final section connects the story to a practical choice without inventing an outside service."),
  ];
  return Object.freeze([...feature, ...extras].slice(0, recipe.sectionCount));
}

function section(title, summary, detail) { return Object.freeze({ title, summary, detail }); }
function escapeText(value) { const span = document.createElement("span"); span.textContent = String(value ?? ""); return span.innerHTML; }
