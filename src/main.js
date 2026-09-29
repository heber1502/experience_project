import gsap from 'gsap';
import { initAnimations } from './animations.js';

// ============================================================
// Figma-frame auto scale (desktop only, >=1200px)
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
// Below 1200px there's no Figma mobile frame to match, so that
// range gets its own dedicated adaptive layout — inline styles
// are cleared and style.css's own rules take over.
// ============================================================
const FIGMA_DESIGN_WIDTH = 1440;
// Same query as style.css. Media queries measure the viewport INCLUDING the
// scrollbar, clientWidth excludes it: deciding with clientWidth >= 1200 made
// CSS and JS disagree between 1200 and ~1216px on Windows (classic 15-17px
// scrollbar): CSS applied the 1440px desktop layout but JS didn't scale it,
// so the page was cut off on the right with thousands of px of empty space.
const DESKTOP_MQ = window.matchMedia('(min-width: 1200px)');
const wrapper = document.getElementById('scaleWrapper');
const clip = document.getElementById('scaleClip');
const CLIP_VALUE = (window.CSS && CSS.supports('overflow', 'clip')) ? 'clip' : 'hidden';

function applyFigmaFrameScale() {
  if (!wrapper || !clip) return;

  // clientWidth excludes the scrollbar's own width; innerWidth doesn't.
  const viewportWidth = document.documentElement.clientWidth;

  if (DESKTOP_MQ.matches) {
    const scale = viewportWidth / FIGMA_DESIGN_WIDTH;
    if (scale !== applyFigmaFrameScale.last) {
      applyFigmaFrameScale.last = scale;
      requestAnimationFrame(() => window.dispatchEvent(new Event('figmascale')));
    }
    wrapper.style.width = FIGMA_DESIGN_WIDTH + 'px';
    wrapper.style.marginInline = '0';
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.transform = `scale(${scale})`;
    // transform doesn't change layout height, so the page would scroll to
    // the wrapper's real (unscaled) height instead of its visible (scaled)
    // one. The fix is a clipping container sized to the SCALED height.
    //
    // IMPORTANT: this used to be done on <body> with overflow-y:hidden.
    // Since <html> has no overflow of its own, the browser propagates the
    // body's overflow to the VIEWPORT, which blocks native scrolling. On
    // desktop Lenis hid the problem (it scrolls via JS), but on touch
    // devices Lenis is disabled, so on an iPad in landscape (>=1200px)
    // the page couldn't be scrolled down to the footer.
    clip.style.height = `${wrapper.offsetHeight * scale}px`;
    clip.style.overflow = CLIP_VALUE;
  } else {
    if (applyFigmaFrameScale.last !== 1) {
      applyFigmaFrameScale.last = 1;
      requestAnimationFrame(() => window.dispatchEvent(new Event('figmascale')));
    }
    clip.style.height = '';
    clip.style.overflow = '';
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

// Synchronous re-sync, fired by animations.js right after it changes the
// page height during a ScrollTrigger refresh (How it works pin). Without it
// the clip height updated one frame too late and ScrollTrigger measured a
// stale max scroll.
window.addEventListener('scalesync', applyFigmaFrameScale);

// Re-run after the page has fully laid out (fonts/images can shift
// scrollbar presence right after first paint) and whenever the
// window actually changes size.
window.addEventListener('load', applyFigmaFrameScale);

let resizeRaf = null;
const scheduleScale = () => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(applyFigmaFrameScale);
};

window.addEventListener('resize', scheduleScale);
DESKTOP_MQ.addEventListener?.('change', scheduleScale);

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

// The side menu lives off-screen when closed, but its links were still
// reachable with Tab (keyboard / screen-reader users landed on invisible
// links after the footer). `inert` removes it from focus and the a11y tree.
if (mobileNav) mobileNav.inert = true;

function setNav(open, fromFloat = false) {
  document.body.classList.toggle('nav-open', open);
  mobileNav.inert = !open;
  // the mini window opens next to whichever button was used
  document.body.classList.toggle('nav-from-float', open && fromFloat);
  menuButtons.forEach((b) => {
    b.setAttribute('aria-expanded', String(open));
    b.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  // scroll lock lives in CSS (body.nav-open { overflow: hidden })
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