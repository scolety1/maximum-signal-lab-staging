const launcher = document.querySelector("[data-experiment-launcher]");
const mount = launcher?.querySelector("[data-experiment-mount]");
const status = launcher?.querySelector(".experiment-load-status");
const failure = launcher?.querySelector("[data-experiment-failure]");
const stage = launcher?.querySelector("[data-experiment-stage]");
const returnButton = launcher?.querySelector("[data-return-launcher]");
const restartButton = launcher?.querySelector("[data-restart-experiment]");
const launches = [...document.querySelectorAll("[data-launch-experiment]")];
const baseDocumentTitle = document.title;
let activeId = null;
let activeButton = null;

for (const button of launches) button.addEventListener("click", () => loadExperiment(button));
returnButton?.addEventListener("click", returnToLauncher);
restartButton?.addEventListener("click", () => activeButton && loadExperiment(activeButton));

async function loadExperiment(button) {
  const id = button.dataset.launchExperiment;
  if (!launcher || !mount || !id) return;

  activeButton = button;
  for (const launch of launches) {
    launch.disabled = true;
    launch.removeAttribute("aria-current");
  }
  button.setAttribute("aria-current", "true");
  button.setAttribute("aria-busy", "true");
  if (status) status.textContent = "Loading experience…";
  if (failure) failure.hidden = true;

  try {
    const [{ getExperiment }] = await Promise.all([
      import("./registry.js?v=24"),
      import("./capsule-core/project-game.js?v=9"),
    ]);
    const entry = getExperiment(id);
    if (!entry) throw new Error("Experience is not registered for this Lab build.");

    await Promise.all(entry.styles.map(loadStylesheet));
    const gameModule = await entry.load();
    const host = document.createElement("project-game");
    const seed = new URLSearchParams(location.search).get("seed") || undefined;
    mount.replaceChildren(host);
    await host.configure({ entry, gameModule, seed });
    activeId = id;
    document.title = `${entry.title} — Spencer Colety`;
    if (stage) stage.hidden = false;
    launcher.classList.add("is-playing");
    button.removeAttribute("aria-busy");
    if (status) status.textContent = `${entry.title} ready.`;
    for (const launch of launches) launch.disabled = false;
    requestAnimationFrame(() => {
      stage?.scrollIntoView({ block: "start", behavior: "instant" });
      host.querySelector("button")?.focus({ preventScroll: true });
    });
  } catch (error) {
    document.title = baseDocumentTitle;
    button.removeAttribute("aria-busy");
    for (const launch of launches) launch.disabled = false;
    if (status) status.textContent = "Experience unavailable; explanation preserved.";
    if (failure) failure.hidden = false;
    console.error("[Maximum Signal Lab] Isolated capsule load failed.", error);
  }
}

function returnToLauncher() {
  mount?.replaceChildren();
  if (stage) stage.hidden = true;
  launcher?.classList.remove("is-playing");
  const focusTarget = activeButton;
  activeId = null;
  document.title = baseDocumentTitle;
  for (const launch of launches) launch.removeAttribute("aria-current");
  if (status) status.textContent = "Choose a playable project.";
  focusTarget?.focus({ preventScroll: true });
}

function loadStylesheet(href) {
  const url = new URL(href, import.meta.url).href;
  const existing = [...document.styleSheets].find((sheet) => sheet.href === url);
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", () => reject(new Error(`Stylesheet failed: ${href}`)), { once: true });
    document.head.append(link);
  });
}

export { activeId };
