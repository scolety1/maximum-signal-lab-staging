const CHOICE_SELECTOR = "[data-route-choice]:not([disabled])";

export function bindChoiceInputMap(container) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("Choice input map requires an HTML container.");
  }

  const choices = () => [...container.querySelectorAll(CHOICE_SELECTOR)];

  function setActive(target) {
    for (const choice of choices()) {
      choice.tabIndex = choice === target ? 0 : -1;
    }
  }

  function onFocusIn(event) {
    if (event.target.matches?.(CHOICE_SELECTOR)) {
      setActive(event.target);
    }
  }

  function onKeyDown(event) {
    const buttons = choices();
    if (buttons.length === 0) return;

    const currentIndex = Math.max(0, buttons.indexOf(document.activeElement));
    let nextIndex = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % buttons.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    } else if (/^[1-9]$/.test(event.key)) {
      const numericIndex = Number(event.key) - 1;
      if (buttons[numericIndex]) {
        event.preventDefault();
        buttons[numericIndex].click();
      }
      return;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      setActive(buttons[nextIndex]);
      buttons[nextIndex].focus();
    }
  }

  const initial = choices();
  initial.forEach((choice, index) => {
    choice.tabIndex = index === 0 ? 0 : -1;
  });

  container.addEventListener("focusin", onFocusIn);
  container.addEventListener("keydown", onKeyDown);

  return () => {
    container.removeEventListener("focusin", onFocusIn);
    container.removeEventListener("keydown", onKeyDown);
  };
}
