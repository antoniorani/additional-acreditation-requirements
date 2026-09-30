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

function animateSlideContent(slide) {
  const items = [...slide.querySelectorAll('.anim')];
  items.forEach((item) => {
    item.style.opacity = 0;
    item.style.transform = 'translateY(18px)';
  });

  if (hasGsap()) {
    window.gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 0.72,
      stagger: 0.08,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
    });
    return;
  }

  items.forEach((item, index) => {
    item.animate(
      [
        { opacity: 0, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'translateY(0px)' },
      ],
      {
        duration: 720,
        delay: index * 80,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'forwards',
      },
    );
  });
}

function animateOut(slide, direction = 1) {
  if (hasGsap()) {
    return new Promise((resolve) => {
      window.gsap.to(slide, {
        opacity: 0,
        scale: 0.993,
        x: direction * -24,
        duration: 0.24,
        ease: 'power2.in',
        onComplete: resolve,
      });
    });
  }

  const animation = slide.animate(
    [
      { opacity: 1, transform: 'translateX(0px) scale(1)' },
      { opacity: 0, transform: `translateX(${direction * -24}px) scale(.993)` },
    ],
    { duration: 240, easing: 'ease-in', fill: 'forwards' },
  );

  return animation.finished;
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

  state.index = nextIndex;
  activateCurrentSlide(direction);
  state.isAnimating = false;
}

function activateCurrentSlide(direction = 1) {
  const slide = slides[state.index];
  slides.forEach((s) => s.classList.toggle('active', s === slide));

  if (hasGsap()) {
    window.gsap.set(slide, { opacity: 1, x: direction * 26, scale: 0.995 });
    window.gsap.to(slide, { opacity: 1, x: 0, scale: 1, duration: 0.42, ease: 'power3.out' });
  } else {
    slide.animate(
      [
        { opacity: 0, transform: `translateX(${direction * 26}px) scale(.995)` },
        { opacity: 1, transform: 'translateX(0) scale(1)' },
      ],
      { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' },
    );
  }

  animateSlideContent(slide);
  updateHud();
  updateHash();
  updatePresenter();
}

function next() {
  goTo(state.index + 1, 1);
}

function previous() {
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
