(() => {
  "use strict";

  const PANEL_ID = "slide-notes-panel";
  let panel;
  let toggle;
  let body;
  let content;
  let slideLabel;
  let isOpen = false;

  function isEditingTarget(target) {
    return target instanceof HTMLElement &&
      (target.matches("input, textarea, select") || target.isContentEditable);
  }

  function currentSlide() {
    if (window.Reveal && typeof Reveal.getCurrentSlide === "function") {
      return Reveal.getCurrentSlide();
    }
    return document.querySelector(".reveal .slides > section.present") ||
      document.querySelector(".reveal .slides > section");
  }

  function positionLabel(slide) {
    const slides = [...document.querySelectorAll(".reveal .slides > section")];
    const index = slides.indexOf(slide);
    return index >= 0 ? `Diapositiva ${index + 1} de ${slides.length}` : "Diapositiva actual";
  }

  function update() {
    if (!panel) return;

    const slide = currentSlide();
    if (!slide) {
      slideLabel.textContent = "";
      content.textContent = "Sin notas para mostrar.";
      return;
    }

    slideLabel.textContent = positionLabel(slide);
    const source = slide.querySelector("aside.notes");

    if (!source || !source.innerHTML.trim()) {
      content.innerHTML = '<p class="slide-notes-panel__empty">Esta diapositiva no tiene notas.</p>';
      return;
    }

    content.innerHTML = source.innerHTML;
    body.scrollTop = 0;
  }

  function setOpen(nextOpen) {
    if (!panel) return;

    isOpen = nextOpen;
    panel.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    panel.setAttribute("aria-hidden", String(!isOpen));
  }

  function setup() {
    if (document.getElementById(PANEL_ID)) return;

    panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.className = "slide-notes-panel";
    panel.setAttribute("aria-label", "Notas de la diapositiva");
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <button
        class="slide-notes-panel__bar"
        type="button"
        aria-expanded="false"
        aria-controls="${PANEL_ID}-body"
        title="Mostrar u ocultar notas (N)"
      >
        <span class="slide-notes-panel__title">Notas</span>
        <span class="slide-notes-panel__slide" aria-live="polite"></span>
        <kbd class="slide-notes-panel__shortcut">N</kbd>
        <span class="slide-notes-panel__chevron" aria-hidden="true">⌃</span>
      </button>
      <div class="slide-notes-panel__body" id="${PANEL_ID}-body">
        <div class="slide-notes-panel__content"></div>
      </div>
    `;

    document.body.appendChild(panel);

    toggle = panel.querySelector(".slide-notes-panel__bar");
    body = panel.querySelector(".slide-notes-panel__body");
    content = panel.querySelector(".slide-notes-panel__content");
    slideLabel = panel.querySelector(".slide-notes-panel__slide");

    toggle.addEventListener("click", () => setOpen(!isOpen));
    panel.addEventListener("pointerdown", event => event.stopPropagation());
    update();
  }

  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isEditingTarget(event.target)) {
      return;
    }

    if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!isOpen);
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  }, true);

  if (window.Reveal && typeof Reveal.on === "function") {
    Reveal.on("ready", () => {
      setup();
      update();
    });
    Reveal.on("slidechanged", update);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();