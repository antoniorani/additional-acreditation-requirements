(() => {
  "use strict";

  const PLUGIN_ID = "speaker-gallery";
  const RECEIVER_QUERY = /(?:^|[?&])receiver(?:[=&]|$)/i;
  const GALLERY_ID = "speaker-slide-gallery";

  function isEditable(target) {
    return Boolean(
      target &&
      typeof target.matches === "function" &&
      (target.matches("input, textarea, select") || target.isContentEditable)
    );
  }

  function parseRevealMessage(event) {
    if (typeof event.data !== "string") return null;

    try {
      const data = JSON.parse(event.data);
      return data && data.namespace === "reveal-notes" ? data : null;
    } catch {
      return null;
    }
  }

  function sameOrigin(event) {
    return window.location.protocol === "file:" || event.origin === window.location.origin;
  }

  function labelsForDocument() {
    const spanish = document.documentElement.lang.toLowerCase().startsWith("es");

    return spanish
      ? {
          button: "Todas las diapositivas",
          title: "Todas las diapositivas",
          close: "Cerrar",
          slide: "Diapositiva",
          hint: "Flechas para recorrer · Enter para abrir · Esc para volver"
        }
      : {
          button: "All slides",
          title: "All slides",
          close: "Close",
          slide: "Slide",
          hint: "Arrow keys to browse · Enter to open · Esc to return"
        };
  }

  function createThumbnailUrl(deck, indices) {
    const configuredUrl = deck.getConfig().url;
    const url = new URL(
      typeof configuredUrl === "string" ? configuredUrl : window.location.href,
      window.location.href
    );

    url.searchParams.set("receiver", "");
    url.searchParams.set("progress", "false");
    url.searchParams.set("history", "false");
    url.searchParams.set("transition", "none");
    url.searchParams.set("backgroundTransition", "none");
    url.searchParams.set("autoSlide", "0");
    url.searchParams.set("controls", "false");
    url.searchParams.set("slideNumber", "false");
    url.searchParams.set("scrollActivationWidth", "false");
    url.hash = "#/" + indices.h + "/" + indices.v;

    return url.toString();
  }

  function createPlugin() {
    let deck;
    let speakerWindow = null;
    let overlay = null;
    let grid = null;
    let openButton = null;
    let thumbnails = [];
    let slides = [];
    let selectedIndex = 0;
    let galleryOpen = false;
    const labels = labelsForDocument();

    function slideDescriptors() {
      return deck.getSlides().map((slide, ordinal) => {
        const indices = deck.getIndices(slide);
        const heading = slide.querySelector("h1, h2, h3");
        const title = slide.dataset.title ||
          (heading ? heading.textContent.trim().replace(/\s+/g, " ") : "") ||
          labels.slide + " " + (ordinal + 1);

        return {
          ordinal,
          h: Number.isFinite(indices.h) ? indices.h : ordinal,
          v: Number.isFinite(indices.v) ? indices.v : 0,
          title
        };
      });
    }

    function currentIndex() {
      const indices = deck.getIndices();
      const index = slides.findIndex(slide => slide.h === indices.h && slide.v === indices.v);
      return index >= 0 ? index : 0;
    }

    function ensureThumbnailFramesLoaded() {
      thumbnails.forEach(button => {
        const frame = button.querySelector("iframe[data-src]");
        if (frame && !frame.hasAttribute("src")) {
          frame.src = frame.dataset.src;
        }
      });
    }

    function updateActiveThumbnail() {
      if (!overlay || !speakerWindow || speakerWindow.closed) return;

      const activeIndex = currentIndex();
      thumbnails.forEach((button, index) => {
        const active = index === activeIndex;
        button.classList.toggle("is-current", active);
        button.setAttribute("aria-current", active ? "true" : "false");
      });

      if (!galleryOpen) {
        selectedIndex = activeIndex;
      }
    }

    function selectThumbnail(index, { focus = true } = {}) {
      if (!thumbnails.length) return;

      selectedIndex = Math.max(0, Math.min(index, thumbnails.length - 1));
      thumbnails.forEach((button, itemIndex) => {
        button.classList.toggle("is-selected", itemIndex === selectedIndex);
      });

      const selected = thumbnails[selectedIndex];
      if (focus) selected.focus({ preventScroll: true });
      selected.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    function openGallery() {
      if (!overlay) return;

      galleryOpen = true;
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
      ensureThumbnailFramesLoaded();
      updateActiveThumbnail();
      selectThumbnail(currentIndex());
    }

    function closeGallery() {
      if (!overlay || !galleryOpen) return;

      galleryOpen = false;
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      openButton?.focus({ preventScroll: true });
    }

    function goToSelectedSlide() {
      const target = slides[selectedIndex];
      if (!target) return;

      deck.slide(target.h, target.v);
      closeGallery();
    }

    function gridColumnCount() {
      if (!grid || !speakerWindow) return 1;
      const columns = speakerWindow.getComputedStyle(grid).gridTemplateColumns;
      return Math.max(1, columns.split(" ").filter(Boolean).length);
    }

    function handleSpeakerKeydown(event) {
      if (!galleryOpen) {
        if (event.key.toLowerCase() === "g" && !isEditable(event.target)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          openGallery();
        }
        return;
      }

      const columns = gridColumnCount();
      let nextIndex = selectedIndex;
      let handled = true;

      switch (event.key) {
        case "Escape":
          closeGallery();
          break;
        case "Enter":
        case " ":
          goToSelectedSlide();
          break;
        case "ArrowLeft":
          nextIndex -= 1;
          break;
        case "ArrowRight":
          nextIndex += 1;
          break;
        case "ArrowUp":
          nextIndex -= columns;
          break;
        case "ArrowDown":
          nextIndex += columns;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = thumbnails.length - 1;
          break;
        default:
          handled = false;
      }

      if (!handled) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (nextIndex !== selectedIndex) {
        selectThumbnail(nextIndex);
      }
    }

    function galleryStyles() {
      return `
        #speaker-gallery-trigger {
          position: absolute;
          top: 10px;
          right: 178px;
          z-index: 30;
          height: 34px;
          padding: 0 12px;
          border: 0;
          border-radius: 3px;
          background: rgba(220, 220, 220, .92);
          color: #222;
          cursor: pointer;
          font: 600 13px/34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        #speaker-gallery-trigger:hover,
        #speaker-gallery-trigger:focus-visible {
          background: #fff;
          outline: 2px solid #2b72d6;
          outline-offset: 1px;
        }

        #speaker-gallery-trigger kbd {
          margin-left: 7px;
          padding: 1px 5px;
          border: 1px solid rgba(0, 0, 0, .2);
          border-radius: 3px;
          background: rgba(255, 255, 255, .55);
          font: inherit;
          font-size: 11px;
        }

        #${GALLERY_ID} {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          background: #15171a;
          color: #f5f6f8;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        #${GALLERY_ID}[hidden] {
          display: none;
        }

        .speaker-gallery__header {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255, 255, 255, .14);
        }

        .speaker-gallery__header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 650;
        }

        .speaker-gallery__hint {
          flex: 1;
          color: #aeb4bd;
          font-size: 13px;
        }

        .speaker-gallery__close {
          min-width: 72px;
          height: 34px;
          border: 1px solid rgba(255, 255, 255, .2);
          border-radius: 5px;
          background: #292d33;
          color: #fff;
          cursor: pointer;
        }

        .speaker-gallery__grid {
          flex: 1;
          overflow: auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          align-content: start;
          gap: 22px;
          padding: 24px;
        }

        .speaker-gallery__item {
          min-width: 0;
          padding: 0;
          border: 2px solid transparent;
          border-radius: 7px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          text-align: left;
        }

        .speaker-gallery__item:focus {
          outline: none;
        }

        .speaker-gallery__item.is-selected {
          border-color: #69a7ff;
          box-shadow: 0 0 0 2px rgba(105, 167, 255, .2);
        }

        .speaker-gallery__item.is-current .speaker-gallery__number {
          background: #2b72d6;
          color: #fff;
        }

        .speaker-gallery__preview {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          border-radius: 4px;
          background: #000;
          box-shadow: 0 6px 18px rgba(0, 0, 0, .35);
        }

        .speaker-gallery__preview iframe {
          width: 100%;
          height: 100%;
          border: 0;
          pointer-events: none;
          background: #fff;
        }

        .speaker-gallery__meta {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          padding: 9px 2px 2px;
        }

        .speaker-gallery__number {
          min-width: 25px;
          height: 25px;
          padding: 0 6px;
          border-radius: 999px;
          background: #343941;
          color: #dce0e6;
          font-size: 12px;
          line-height: 25px;
          text-align: center;
        }

        .speaker-gallery__title {
          overflow: hidden;
          color: #e8ebef;
          font-size: 13px;
          line-height: 1.3;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `;
    }

    function mount(speaker) {
      let doc;
      try {
        doc = speaker.document;
      } catch {
        return;
      }

      if (!doc?.body || doc.getElementById(GALLERY_ID)) return;

      speakerWindow = speaker;
      slides = slideDescriptors();

      const style = doc.createElement("style");
      style.dataset.speakerGallery = "true";
      style.textContent = galleryStyles();
      doc.head.appendChild(style);

      openButton = doc.createElement("button");
      openButton.id = "speaker-gallery-trigger";
      openButton.type = "button";
      openButton.innerHTML = labels.button + " <kbd>G</kbd>";
      openButton.addEventListener("click", openGallery);
      doc.body.appendChild(openButton);

      overlay = doc.createElement("section");
      overlay.id = GALLERY_ID;
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      overlay.setAttribute("aria-label", labels.title);

      const header = doc.createElement("header");
      header.className = "speaker-gallery__header";

      const title = doc.createElement("h2");
      title.textContent = labels.title;

      const hint = doc.createElement("div");
      hint.className = "speaker-gallery__hint";
      hint.textContent = labels.hint;

      const closeButton = doc.createElement("button");
      closeButton.className = "speaker-gallery__close";
      closeButton.type = "button";
      closeButton.textContent = labels.close;
      closeButton.addEventListener("click", closeGallery);

      header.append(title, hint, closeButton);

      grid = doc.createElement("div");
      grid.className = "speaker-gallery__grid";

      thumbnails = slides.map(slide => {
        const button = doc.createElement("button");
        button.className = "speaker-gallery__item";
        button.type = "button";
        button.dataset.ordinal = String(slide.ordinal);
        button.setAttribute("aria-label", labels.slide + " " + (slide.ordinal + 1) + ": " + slide.title);

        const preview = doc.createElement("div");
        preview.className = "speaker-gallery__preview";

        const frame = doc.createElement("iframe");
        frame.loading = "lazy";
        frame.tabIndex = -1;
        frame.title = labels.slide + " " + (slide.ordinal + 1);
        frame.dataset.src = createThumbnailUrl(deck, slide);
        preview.appendChild(frame);

        const meta = doc.createElement("div");
        meta.className = "speaker-gallery__meta";

        const number = doc.createElement("span");
        number.className = "speaker-gallery__number";
        number.textContent = String(slide.ordinal + 1);

        const slideTitle = doc.createElement("span");
        slideTitle.className = "speaker-gallery__title";
        slideTitle.textContent = slide.title;

        meta.append(number, slideTitle);
        button.append(preview, meta);

        button.addEventListener("click", () => {
          selectedIndex = slide.ordinal;
          goToSelectedSlide();
        });

        button.addEventListener("focus", () => {
          selectedIndex = slide.ordinal;
          thumbnails.forEach((item, index) => {
            item.classList.toggle("is-selected", index === selectedIndex);
          });
        });

        grid.appendChild(button);
        return button;
      });

      overlay.append(header, grid);
      doc.body.appendChild(overlay);

      doc.addEventListener("keydown", handleSpeakerKeydown, true);
      updateActiveThumbnail();
    }

    function handleMessage(event) {
      if (!sameOrigin(event)) return;

      const message = parseRevealMessage(event);
      if (!message || message.type !== "heartbeat") return;

      const source = event.source;
      if (!source || source === window) return;

      try {
        if (source.closed) return;
      } catch {
        return;
      }

      mount(source);
    }

    function init(revealDeck) {
      deck = revealDeck;

      if (RECEIVER_QUERY.test(window.location.search)) {
        return;
      }

      window.addEventListener("message", handleMessage);
      deck.on("slidechanged", updateActiveThumbnail);
    }

    return {
      id: PLUGIN_ID,
      init
    };
  }

  window.RevealSpeakerGallery = createPlugin();
})();
