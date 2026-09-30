const deck = document.querySelector('.deck');
const slides = [...document.querySelectorAll('.slide')];
const progress = document.querySelector('.progress span');
const counter = document.querySelector('.counter');
const presenter = document.querySelector('.presenter');
const presenterTitle = document.querySelector('.presenter h2');
const presenterText = document.querySelector('.presenter p:last-child');
const presenterClose = document.querySelector('.presenter-close');

const state = {
  index: getInitialSlideIndex(),
  fragmentIndex: 0,
  isAnimating: false,
  presenterOpen: new URLSearchParams(window.location.search).get('presenter') === '1',
};

function getInitialSlideIndex() {
  const raw = window.location.hash.replace('#/', '').replace('#', '');
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed)) return clamp(parsed - 1, 0, slides.length - 1);
  return 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hasGsap() {
  return typeof window.gsap !== 'undefined';
}

function animateIn(elements, options = {}) {
  const defaults = { y: 30, opacity: 0, duration: 0.72, stagger: 0.08, ease: 'power3.out' };
  const settings = { ...defaults, ...options };

  if (hasGsap()) {
    window.gsap.fromTo(
      elements,
      { y: settings.y, opacity: settings.opacity, filter: 'blur(8px)' },
      {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: settings.duration,
        stagger: settings.stagger,
        ease: settings.ease,
      },
    );
    return;
  }

  [...elements].forEach((el, i) => {
    el.animate(
      [
        { transform: `translateY(${settings.y}px)`, opacity: settings.opacity, filter: 'blur(8px)' },
        { transform: 'translateY(0)', opacity: 1, filter: 'blur(0px)' },
      ],
      {
        duration: settings.duration * 1000,
        delay: i * settings.stagger * 1000,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'both',
      },
    );
  });
}

function animateVisuals(root) {
  if (!root) return;

  const bars = root.querySelectorAll('.chart-row i');
  bars.forEach((bar, i) => {
    const target = bar.style.getPropertyValue('--w') || '70%';
    bar.style.width = '0';
    if (hasGsap()) {
      window.gsap.to(bar, { width: target, duration: 0.9, delay: i * 0.08, ease: 'power3.out' });
    } else {
      bar.animate([{ width: '0' }, { width: target }], {
        duration: 900,
        delay: i * 80,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'forwards',
      });
    }
  });

  const bridge = root.querySelector('.bridge span');
  if (bridge) {
    if (hasGsap()) {
      window.gsap.fromTo(bridge, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power3.out' });
    } else {
      bridge.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: 800,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'both',
      });
    }
  }

  const timelineLine = root.querySelector('.timeline-line');
  if (timelineLine) {
    if (hasGsap()) {
      window.gsap.fromTo(timelineLine, { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'power3.out' });
    } else {
      timelineLine.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: 1000,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'both',
      });
    }
  }

  const rings = root.querySelectorAll('.scope-ring, .pillar, .actor, .output-card, .timeline-step span');
  if (rings.length) {
    animateIn(rings, { y: 18, duration: 0.62, stagger: 0.06 });
  }
}

function animateOut(slide, direction = 1) {
  if (hasGsap()) {
    return window.gsap.to(slide, {
      opacity: 0,
      scale: 0.985,
      x: direction * -28,
      duration: 0.28,
      ease: 'power2.in',
    });
  }

  const animation = slide.animate(
    [
      { opacity: 1, transform: 'translateX(0) scale(1)' },
      { opacity: 0, transform: `translateX(${direction * -28}px) scale(.985)` },
    ],
    { duration: 280, easing: 'ease-in', fill: 'both' },
  );

  return animation.finished;
}

function resetFragments(slide) {
  slide.querySelectorAll('.fragment').forEach((fragment) => {
    fragment.classList.remove('visible');
    fragment.style.opacity = '';
    fragment.style.transform = '';
  });

  slide.querySelectorAll('.chart-row i').forEach((bar) => {
    bar.style.width = '0';
  });
}

function revealFragment() {
  const slide = slides[state.index];
  const fragments = [...slide.querySelectorAll('.fragment')];
  const next = fragments[state.fragmentIndex];

  if (!next) return false;

  next.classList.add('visible');
  animateIn([next], { y: 18, duration: 0.52, stagger: 0 });
  animateVisuals(next);
  state.fragmentIndex += 1;
  return true;
}

async function goTo(index, direction = 1) {
  const nextIndex = clamp(index, 0, slides.length - 1);
  if (state.isAnimating || nextIndex === state.index) return;

  state.isAnimating = true;
  const current = slides[state.index];
  await animateOut(current, direction);
  current.classList.remove('active');
  current.style.opacity = '';
  current.style.transform = '';
  resetFragments(current);

  state.index = nextIndex;
  state.fragmentIndex = 0;
  activateCurrentSlide(direction);
  state.isAnimating = false;
}

function activateCurrentSlide(direction = 1) {
  const slide = slides[state.index];
  slides.forEach((s) => s.classList.toggle('active', s === slide));
  resetFragments(slide);

  if (hasGsap()) {
    window.gsap.set(slide, { opacity: 1, x: direction * 36, scale: 0.992 });
    window.gsap.to(slide, { opacity: 1, x: 0, scale: 1, duration: 0.48, ease: 'power3.out' });
  } else {
    slide.animate(
      [
        { opacity: 0, transform: `translateX(${direction * 36}px) scale(.992)` },
        { opacity: 1, transform: 'translateX(0) scale(1)' },
      ],
      { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' },
    );
  }

  const introElements = slide.querySelectorAll('.eyebrow, h1, h2, .lead:not(.fragment)');
  animateIn(introElements, { y: 22, duration: 0.7, stagger: 0.07 });

  updateHud();
  updateHash();
  updatePresenter();
}

function next() {
  if (revealFragment()) return;
  goTo(state.index + 1, 1);
}

function previous() {
  const currentFragments = [...slides[state.index].querySelectorAll('.fragment.visible')];
  if (currentFragments.length > 0) {
    const last = currentFragments[currentFragments.length - 1];
    last.classList.remove('visible');
    state.fragmentIndex = Math.max(0, state.fragmentIndex - 1);
    return;
  }
  goTo(state.index - 1, -1);
}

function updateHud() {
  const value = ((state.index + 1) / slides.length) * 100;
  progress.style.width = `${value}%`;
  counter.textContent = `${state.index + 1} / ${slides.length}`;
}

function updateHash() {
  const hash = `#/${state.index + 1}`;
  if (window.location.hash !== hash) {
    history.replaceState(null, '', hash);
  }
}

function updatePresenter() {
  const slide = slides[state.index];
  presenter.classList.toggle('open', state.presenterOpen);
  presenter.setAttribute('aria-hidden', String(!state.presenterOpen));
  presenterTitle.textContent = slide.dataset.title || `Slide ${state.index + 1}`;
  presenterText.textContent = slide.dataset.notes || 'No notes for this slide.';
}

function togglePresenter(force) {
  state.presenterOpen = typeof force === 'boolean' ? force : !state.presenterOpen;
  updatePresenter();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function replay() {
  const slide = slides[state.index];
  state.fragmentIndex = 0;
  resetFragments(slide);
  activateCurrentSlide(1);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (['arrowright', ' ', 'pagedown'].includes(key)) {
    event.preventDefault();
    next();
  }

  if (['arrowleft', 'pageup'].includes(key)) {
    event.preventDefault();
    previous();
  }

  if (key === 'home') goTo(0, -1);
  if (key === 'end') goTo(slides.length - 1, 1);
  if (key === 'f') toggleFullscreen();
  if (key === 'r') replay();
  if (key === 'p') togglePresenter();
  if (key === 'escape') togglePresenter(false);
});

window.addEventListener('hashchange', () => {
  const target = getInitialSlideIndex();
  goTo(target, target > state.index ? 1 : -1);
});

let pointerStart = null;

deck.addEventListener('pointerdown', (event) => {
  pointerStart = { x: event.clientX, y: event.clientY };
});

deck.addEventListener('pointerup', (event) => {
  if (!pointerStart) return;
  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  pointerStart = null;

  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
    dx < 0 ? next() : previous();
    return;
  }

  next();
});

presenterClose.addEventListener('click', () => togglePresenter(false));

window.addEventListener('load', () => {
  activateCurrentSlide(1);
});
