import gsap from 'gsap';
import { initAnimations } from './animations.js';

// ============================================================
// Figma-frame auto scale (desktop only, >=900px)
// ------------------------------------------------------------
// The desktop layout is built at the exact 1440px design width
// (same literal px values as the Figma file) and scaled uniformly
// with `transform: scale()` to match any monitor size — exactly
// like Figma's own prototype player scales its 1440px frame.
//
// Below 900px there's no Figma mobile frame to match (this file
// only has 1440px desktop frames), so that range gets its own
// dedicated adaptive layout instead of a shrunk-down desktop.
// ============================================================
// ============================================================
// Figma-frame auto scale (desktop only, >=900px)
// ------------------------------------------------------------
// The desktop layout is built at the exact 1440px design width
// (same literal px values as the Figma file) and scaled uniformly
// to match any monitor size — exactly like Figma's own prototype
// player scales its 1440px frame.
//
// This is fully JS-driven: the wrapper's width/transform are set
// as direct inline styles (highest CSS priority, nothing in
// style.css can override or drift out of sync with it).
//
// Below 900px there's no Figma mobile frame to match (this file
// only has 1440px desktop frames), so that range gets its own
// dedicated adaptive layout instead of a shrunk-down desktop —
// inline styles are cleared and style.css's own rules take over.
// ============================================================
const FIGMA_DESIGN_WIDTH = 1440;
const SCALE_BREAKPOINT = 1200; // below this: adaptive tablet/mobile layout (CSS @media max-width: 1199px)
const wrapper = document.getElementById('scaleWrapper');

function applyFigmaFrameScale() {
  if (!wrapper) return;

  // clientWidth excludes the scrollbar's own width; innerWidth doesn't.
  const viewportWidth = document.documentElement.clientWidth;

  if (viewportWidth >= SCALE_BREAKPOINT) {
    const scale = viewportWidth / FIGMA_DESIGN_WIDTH;
    if (scale !== applyFigmaFrameScale.last) {
      applyFigmaFrameScale.last = scale;
      requestAnimationFrame(() => window.dispatchEvent(new Event('figmascale')));
    }
    wrapper.style.width = FIGMA_DESIGN_WIDTH + 'px';
    wrapper.style.marginInline = '0';
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.transform = `scale(${scale})`;
    // transform doesn't change layout height: compensate so there's no empty
    // gap (scale < 1) or cut-off content (scale > 1) at the bottom of the page
    wrapper.style.marginBottom = `${wrapper.offsetHeight * (scale - 1)}px`;
  } else {
    if (applyFigmaFrameScale.last !== 1) {
      applyFigmaFrameScale.last = 1;
      requestAnimationFrame(() => window.dispatchEvent(new Event('figmascale')));
    }
    wrapper.style.marginBottom = '';
    wrapper.style.width = '';
    wrapper.style.marginInline = '';
    wrapper.style.transformOrigin = '';
    wrapper.style.transform = '';
  }
}

applyFigmaFrameScale();
if ('ResizeObserver' in window && wrapper) {
  new ResizeObserver(() => requestAnimationFrame(applyFigmaFrameScale)).observe(wrapper);
}

// Re-run after the page has fully laid out (fonts/images can shift
// scrollbar presence right after first paint) and whenever the
// window actually changes size. ResizeObserver catches more cases
// than the `resize` event alone (zoom changes, DevTools docking,
// orientation changes) and fires without needing user interaction.
window.addEventListener('load', applyFigmaFrameScale);

let resizeRaf = null;
const scheduleScale = () => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(applyFigmaFrameScale);
};

window.addEventListener('resize', scheduleScale);

if ('ResizeObserver' in window) {
  new ResizeObserver(scheduleScale).observe(document.documentElement);
}

// ============ Header scroll state ============
const header = document.getElementById('siteHeader');
const onScroll = () => {
  header.classList.toggle('is-scrolled', window.scrollY > 8);
};
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ============ Menu (header hamburger + floating button) ============
const navToggle = document.getElementById('navToggle');
const floatMenu = document.getElementById('floatMenu');
const mobileNav = document.getElementById('mobileNav');
const mobileNavBackdrop = document.getElementById('mobileNavBackdrop');
const menuButtons = [navToggle, floatMenu].filter(Boolean);

function setNav(open, fromFloat = false) {
  document.body.classList.toggle('nav-open', open);
  // the mini window opens next to whichever button was used
  document.body.classList.toggle('nav-from-float', open && fromFloat);
  menuButtons.forEach((b) => {
    b.setAttribute('aria-expanded', String(open));
    b.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  document.body.style.overflow = open ? 'hidden' : '';
  if (typeof updateFloatMenu === 'function') updateFloatMenu();

  // curved edge: bulges while the panel travels, flattens when it lands
  const curve = document.getElementById('navCurvePath');
  if (curve && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const bulge = 'M100 0 L100 1000 Q-100 500 100 0';
    const flat  = 'M100 0 L100 1000 Q100 500 100 0';
    gsap.killTweensOf(curve);
    if (open) gsap.fromTo(curve, { attr: { d: bulge } }, { attr: { d: flat }, duration: 1, ease: 'power3.inOut' });
    else gsap.fromTo(curve, { attr: { d: flat } }, { attr: { d: bulge }, duration: 0.8, ease: 'power3.inOut' });
  }
}
const closeMobileNav = () => setNav(false);

navToggle.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
floatMenu?.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open'), true));
mobileNav.querySelectorAll('.mobile-nav-links a').forEach((link, i) => link.style.setProperty('--i', i)); // stagger
mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMobileNav));
mobileNavBackdrop.addEventListener('click', closeMobileNav);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileNav(); });

// floating button shows once the header has scrolled out of view
function updateFloatMenu() {
  const past = header.getBoundingClientRect().bottom < 0;
  document.body.classList.toggle('float-visible', past || document.body.classList.contains('nav-open'));
}
updateFloatMenu();
window.addEventListener('scroll', updateFloatMenu, { passive: true });

// ============ Nav links: hover dot ============
document.querySelectorAll('.main-nav a, .header-actions .link-muted').forEach((link) => {
  link.insertAdjacentHTML('beforeend', '<span class="nav-dot" aria-hidden="true"></span>');
});

// Scroll/entrance animations live in ./animations.js (GSAP)

// ============ Customer stories slider (arrows) ============
const storiesTrack = document.getElementById('storiesTrack');
const storiesPrev = document.getElementById('storiesPrev');
const storiesNext = document.getElementById('storiesNext');

if (storiesTrack && storiesPrev && storiesNext) {
  const step = () => {
    const card = storiesTrack.querySelector('.story-card');
    const gap = parseFloat(getComputedStyle(storiesTrack).columnGap) || 0;
    return card ? card.offsetWidth + gap : 0;
  };
  const updateArrows = () => {
    const max = storiesTrack.scrollWidth - storiesTrack.clientWidth - 2;
    storiesPrev.disabled = storiesTrack.scrollLeft <= 2;
    storiesNext.disabled = storiesTrack.scrollLeft >= max;
  };
  // GSAP-driven slide: slower and eased (native scrollBy felt too abrupt)
  let target = storiesTrack.scrollLeft;
  const slide = (dir) => {
    const max = storiesTrack.scrollWidth - storiesTrack.clientWidth;
    if (!gsap.isTweening(storiesTrack)) target = storiesTrack.scrollLeft;
    target = gsap.utils.clamp(0, max, target + dir * step());
    storiesTrack.style.scrollSnapType = 'none'; // let the tween run without snap fighting it
    gsap.to(storiesTrack, {
      scrollLeft: target,
      duration: 1.1,
      ease: 'power3.inOut',
      overwrite: true,
      onComplete: () => { storiesTrack.style.scrollSnapType = ''; },
    });
  };
  storiesPrev.addEventListener('click', () => slide(-1));
  storiesNext.addEventListener('click', () => slide(1));
  storiesTrack.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}


// ============ Newsletter form (no backend yet: just prevent reload) ============
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    newsletterForm.reset();
  });
}


// ============ Footer year: always the current year (2027, 2028, ...) ============
const footerYear = document.getElementById('footerYear');
if (footerYear) footerYear.textContent = new Date().getFullYear();


// ============ Animations (GSAP) ============
initAnimations();