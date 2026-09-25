// ============================================================
// ANIMATIONS — GSAP + ScrollTrigger + SplitText + Lenis
// ------------------------------------------------------------
// Each section has its OWN choreography (no generic fade-up on
// everything). Scroll-linked effects use `scrub` so they follow
// the scroll instead of just "playing once".
//
// Notes:
// - Desktop (>=1200px) runs inside the Figma scale transform;
//   nothing here uses `pin` (position:fixed breaks inside a
//   transformed ancestor), and we refresh ScrollTrigger whenever
//   the scale changes (event 'figmascale' from main.js).
// - Respects prefers-reduced-motion: everything is just shown.
// ============================================================
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true }); // mobile address bar showing/hiding shouldn't re-layout the story

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function initAnimations() {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    document.getElementById('preloader')?.remove();
    gsap.set('[data-reveal]', { autoAlpha: 1, y: 0 });
    return;
  }

  root.classList.add('has-gsap'); // disables the old CSS reveal transitions

  // Everything that used the CSS reveal starts hidden; each section
  // decides how (and if) its container appears.
  gsap.set('[data-reveal]', { autoAlpha: 0 });

  const lenis = initSmoothScroll();

  customCursor();

  document.fonts.ready.then(() => {
    // hero waits for the preloader curtain; everything else is scroll-driven
    lenis.stop();
    preloader().then(() => { lenis.start(); heroIntro(); });

    trust();
    experience();
    testimonial();
    studio();
    revenue();
    howItWorks();
    integrate();
    stories();
    usecases();
    articles();
    events();
    newsletter();
    finalCta();
    footer();
    sectionCurves();
    directionalMarquees();
    magneticButtons();

    ScrollTrigger.refresh();
  });

  ScrollTrigger.addEventListener('refresh', () => console.log('refresh', window.innerHeight));

  // keep trigger positions right when the Figma scale changes
  window.addEventListener('figmascale', () => ScrollTrigger.refresh());

  // stop smooth scroll while the mobile menu is open
  new MutationObserver(() => {
    if (document.getElementById('preloader')) return; // preloader controls lenis until it's gone
    document.body.classList.contains('nav-open') ? lenis.stop() : lenis.start();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

/* ------------------------------------------------------------
   Smooth scroll (Lenis) synced with ScrollTrigger + anchor links
------------------------------------------------------------ */
function initSmoothScroll() {
  const lenis = new Lenis({ lerp: 0.15, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // internal links -> curtain transition (only when the target exists)
  const curtain = createCurtain(lenis);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#' ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const label = id === '#' ? 'Home' : (a.getAttribute('aria-label') || a.textContent).trim();
    curtain.go(target, label);
  });
  return lenis;
}

/* helper: reveal a [data-reveal] container instantly (its children animate) */
const show = (el) => el && gsap.set(el, { autoAlpha: 1 });

/* helper: numeric counter ("+87%", "$1.7M", "58%", "66%") */
function countUp(el, trigger) {
  const m = el.textContent.trim().match(/^([^\d]*)([\d.]+)(.*)$/);
  if (!m) return;
  const [, pre, num, post] = m;
  const decimals = (num.split('.')[1] || '').length;
  const obj = { v: 0 };
  el.textContent = `${pre}${(0).toFixed(decimals)}${post}`;
  gsap.to(obj, {
    v: parseFloat(num),
    duration: 2,
    ease: 'power3.out',
    scrollTrigger: { trigger: trigger || el, start: 'top 85%', once: true },
    onUpdate: () => { el.textContent = `${pre}${obj.v.toFixed(decimals)}${post}`; },
  });
}

/* ============================================================
   1. HERO — masked char rise + 3D frame that "lands" on scroll
============================================================ */
function heroIntro() {
  const title = $('.hero-title');
  const sub = $('.hero-subtitle');
  const actions = $('.hero-actions');
  const frame = $('.hero-frame-wrap');
  [title, sub, actions, frame].forEach(show);

  const split = SplitText.create(title, { type: 'words,chars', mask: 'chars' });
  const subSplit = SplitText.create(sub, { type: 'lines', mask: 'lines' });

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 });
  tl.from('.site-header', { yPercent: -100, autoAlpha: 0, duration: 1.2 })
    .from(split.chars, { yPercent: 110, rotate: 8, duration: 1.4, stagger: 0.025 }, '<0.1')
    .from(subSplit.lines, { yPercent: 100, duration: 1.1, stagger: 0.12 }, '-=1.0')
    .from(actions.children, { y: 24, autoAlpha: 0, scale: 0.9, duration: 1, stagger: 0.1 }, '-=0.8')
    .from('.hero-frame', { y: 120, autoAlpha: 0, duration: 1.6 }, '-=0.9');

  // 3D tilt that flattens as you scroll into it
  gsap.set('.hero', { perspective: 1400 });
  gsap.fromTo('.hero-frame',
    { rotateX: 16, scale: 0.9, transformOrigin: '50% 100%' },
    { rotateX: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.hero-frame', start: 'top bottom', end: 'center 55%', scrub: 1 } });

  // glow drifts slower than the page
  gsap.to('.hero-glow', { yPercent: 18, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* ============================================================
   2. TRUST — words blur in, counter, marquee reacts to velocity
============================================================ */
function trust() {
  const content = $('.trust-content');
  $$('.trust-content [data-reveal]').forEach(show);
  const words = SplitText.create('.trust-title', { type: 'words' }).words;

  const tl = gsap.timeline({ scrollTrigger: { trigger: content, start: 'top 80%' } });
  tl.from(words, { autoAlpha: 0, filter: 'blur(12px)', y: 20, duration: 1, stagger: 0.06, ease: 'power3.out' })
    .from('.trust-subtitle', { autoAlpha: 0, y: 20, duration: 0.9, ease: 'power3.out' }, '-=0.6')
    .from('.trust-stat-icon', { scale: 0, rotate: -90, duration: 0.8, ease: 'back.out(2)' }, '-=0.5');

  const strong = $('.trust-stat-value strong');
  if (strong) countUp(strong, '.trust-stat');

  // logo columns: direction + speed handled in directionalMarquees()
}

/* ============================================================
   3. EXPERIENCE — giant word assembles from spread letters;
      cards open with a clip-path + inner image zoom-out
============================================================ */
function experience() {
  const title = $('.experience-title');
  show(title);
  const l1 = SplitText.create('.et-line1', { type: 'words', mask: 'words' });
  const l2 = SplitText.create('.et-line2', { type: 'words,chars' });
  const mid = (l2.chars.length - 1) / 2;

  gsap.from(l1.words, { yPercent: 100, duration: 1, stagger: 0.08, ease: 'expo.out',
    scrollTrigger: { trigger: title, start: 'top 80%' } });
  gsap.from(l2.chars, {
    x: (i) => (i - mid) * 60, autoAlpha: 0, ease: 'none', stagger: { each: 0.02, from: 'center' },
    scrollTrigger: { trigger: title, start: 'top 85%', end: 'bottom 45%', scrub: 1 },
  });

  $$('.experience-grid [data-reveal]').forEach(show);
  $$('.exp-card').forEach((card) => {
    gsap.fromTo(card,
      { clipPath: 'inset(18% 12% 18% 12% round 16px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'none',
        scrollTrigger: { trigger: card, start: 'top 95%', end: 'top 45%', scrub: 1 } });
    const bg = $('.exp-card-bg', card);
    if (bg) gsap.fromTo(bg, { scale: 1.3 }, { scale: 1, ease: 'none',
      scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from($$('.exp-card-text > *', card), { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 70%' } });
  });

  // floating overlays drift at different speeds
  gsap.utils.toArray('.exp-qa-overlay, .exp-chat-overlay, .exp-video-bubble').forEach((el, i) => {
    gsap.fromTo(el, { yPercent: 12 + i * 4 }, { yPercent: -8, ease: 'none',
      scrollTrigger: { trigger: el.closest('.exp-card'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  const cta = $('.experience-cta');
  show(cta);
  gsap.from(cta.children, { scale: 0.8, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.7)',
    scrollTrigger: { trigger: cta, start: 'top 90%' } });
}

/* ============================================================
   4. TESTIMONIAL — the quote "lights up" word by word as you scroll
============================================================ */
function testimonial() {
  const content = $('.testimonial-content');
  show(content);
  const words = SplitText.create('.testimonial-quote', { type: 'words' }).words;
  gsap.fromTo(words, { opacity: 0.12 }, {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.testimonial-quote', start: 'top 80%', end: 'bottom 45%', scrub: 1 },
  });
  gsap.from(['.testimonial-author', '.testimonial-cta'], { y: 30, autoAlpha: 0, duration: 1, stagger: 0.15, ease: 'power3.out',
    scrollTrigger: { trigger: '.testimonial-author', start: 'top 85%' } });
  gsap.fromTo('.testimonial-bg', { yPercent: 8, scale: 1.08 }, { yPercent: -8, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.testimonial', start: 'top bottom', end: 'bottom top', scrub: true } });
}

/* ============================================================
   5. STUDIO — title lines slide in from opposite sides (scrub),
      agenda pieces float at different depths, panels rise
============================================================ */
function studio() {
  const mmTitle = gsap.matchMedia();
  // desktop: the Figma staircase — lines slide in from opposite sides with the scroll
  mmTitle.add('(min-width: 1200px)', () => {
    const st = { trigger: '.studio-title', start: 'top 90%', end: 'bottom 50%', scrub: 1 };
    gsap.from('.studio-title-small', { autoAlpha: 0, y: 30, ease: 'none', scrollTrigger: st });
    gsap.from('.studio-title-welcome', { xPercent: -25, autoAlpha: 0, ease: 'none', scrollTrigger: st });
    gsap.from('.studio-title-studio', { xPercent: 25, autoAlpha: 0, ease: 'none', scrollTrigger: st });
  });
  // tablet/mobile: centered stack rising in (a sideways slide would clip at the screen edge)
  mmTitle.add('(max-width: 1199px)', () => {
    gsap.from(['.studio-title-small', '.studio-title-welcome', '.studio-title-studio'], {
      yPercent: 60, autoAlpha: 0, duration: 1.1, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: '.studio-title', start: 'top 80%' },
    });
  });

  const agenda = $('.studio-card-agenda');
  show(agenda);
  gsap.fromTo(agenda, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut',
    scrollTrigger: { trigger: agenda, start: 'top 80%' } });
  gsap.from('.studio-agenda-main', { yPercent: 25, duration: 1.6, ease: 'expo.out',
    scrollTrigger: { trigger: agenda, start: 'top 75%' } });
  gsap.fromTo('.studio-agenda-holder', { y: 80, rotate: -6 }, { y: -40, rotate: 0, ease: 'none',
    scrollTrigger: { trigger: agenda, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.studio-agenda-delete', { y: 40 }, { y: -20, ease: 'none',
    scrollTrigger: { trigger: agenda, start: 'top bottom', end: 'bottom top', scrub: true } });

  const row = $('.studio-row');
  show(row);
  gsap.from('.studio-card-panel', { y: 120, autoAlpha: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out',
    scrollTrigger: { trigger: row, start: 'top 85%' } });
  $$('.studio-panel-img').forEach((img) => {
    gsap.fromTo(img, { y: 60 }, { y: 0, ease: 'none',
      scrollTrigger: { trigger: img.closest('.studio-card-panel'), start: 'top bottom', end: 'center center', scrub: true } });
  });

  const cta = $('.studio-cta');
  show(cta);
  gsap.from(cta.children, { scale: 0.8, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.7)',
    scrollTrigger: { trigger: cta, start: 'top 92%' } });
}

/* ============================================================
   6. REVENUE — letters flip up, pill pops, dividers draw, counters
============================================================ */
function revenue() {
  const title = $('.revenue-title');
  show(title);
  const chars = SplitText.create('.revenue-drive, .revenue-word', { type: 'words,chars' }).chars;
  const tl = gsap.timeline({ scrollTrigger: { trigger: title, start: 'top 75%' } });
  gsap.set(title, { perspective: 800 });
  tl.from(chars, { rotateX: -90, yPercent: 50, autoAlpha: 0, transformOrigin: '50% 100%', duration: 1, stagger: 0.035, ease: 'expo.out' })
    .from('.revenue-pill', { scale: 0, rotate: -12, duration: 1.1, ease: 'elastic.out(1, 0.6)' }, '-=0.8');

  const stats = $('.revenue-stats');
  show(stats);
  gsap.from('.revenue-divider', { scaleX: 0, transformOrigin: 'left center', duration: 1.2, stagger: 0.2, ease: 'expo.inOut',
    scrollTrigger: { trigger: stats, start: 'top 75%' } });
  gsap.from('.revenue-stat', { x: 60, autoAlpha: 0, duration: 1, stagger: 0.15, ease: 'expo.out',
    scrollTrigger: { trigger: stats, start: 'top 75%' } });
  $$('.revenue-num').forEach((n) => countUp(n, stats));
}

/* ============================================================
   7. HOW IT WORKS — SPLIT-SCREEN STORY
   The stage stays in view while you scroll through 3 steps:
   - mechanical counter 01 -> 02 -> 03
   - step text swaps line by line through masks (direction aware)
   - pill image opens with a clip reveal + settling zoom
   - 3 progress segments fill with the scroll
   Desktop pins with a scale-safe translate; tablet/mobile use
   native CSS sticky (no scale transform there = smooth on touch).
============================================================ */
function howItWorks() {
  const head = $('.howit-head');
  show(head);
  SplitText.create('.howit-title', {
    type: 'lines', mask: 'lines', autoSplit: true,
    onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1.2, stagger: 0.1, ease: 'expo.out',
      scrollTrigger: { trigger: head, start: 'top 80%' } }),
  });
  gsap.from('.howit-intro > *', { y: 30, autoAlpha: 0, duration: 1, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: head, start: 'top 75%' } });

  const pin = $('.hw-pin');
  const sticky = $('.hw-sticky');
  const steps = $$('.hw-step');
  const media = $$('.hw-media-item');
  const strip = $('.hw-counter-strip');
  const fills = $$('.hw-segments i');
  const arrows = steps.map((s) => $('.hw-arrow', s));
  const N = steps.length;
  let active = 0;
  let current = null; // running step-change timeline
  let z = 1;

  // split each step's texts into masked lines (re-split on resize keeps state)
  const lines = [];
  steps.forEach((step, i) => {
    SplitText.create($$('.hw-label, .hw-word, .hw-desc', step), {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: (self) => {
        lines[i] = self.lines;
        gsap.set(self.lines, { yPercent: i === active ? 0 : 100 });
      },
    });
  });

  const setStatic = () => {
    steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
    media.forEach((m, i) => { m.classList.toggle('is-active', i === active); });
    gsap.set(media[active], { zIndex: ++z, clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(strip, { yPercent: (-100 / N) * active });
    arrows.forEach((a, i) => gsap.set(a, { rotate: i === active ? 0 : -90, scale: i === active ? 1 : 0.5, autoAlpha: i === active ? 1 : 0 }));
  };
  setStatic();

  const goTo = (next) => {
    if (next === active) return;
    if (current) current.progress(1);            // fast scroll: finish the previous change instantly
    const dir = next > active ? 1 : -1;
    const prev = active;
    active = next;
    steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
    media.forEach((m, i) => m.classList.toggle('is-active', i === active));

    const img = $('img', media[next]);
    current = gsap.timeline({ defaults: { ease: 'expo.inOut' } })
      // text out (up if going forward, down if going back) ...
      .to(lines[prev] || [], { yPercent: -100 * dir, duration: 0.7, stagger: 0.03 }, 0)
      .to(arrows[prev], { rotate: 90 * dir, scale: 0.5, autoAlpha: 0, duration: 0.5 }, 0)
      // ... new text in from the opposite side
      .fromTo(lines[next] || [], { yPercent: 100 * dir }, { yPercent: 0, duration: 1, stagger: 0.05, ease: 'expo.out' }, 0.3)
      .fromTo(arrows[next], { rotate: -90, scale: 0.5, autoAlpha: 0 }, { rotate: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: 'back.out(1.8)' }, 0.45)
      // mechanical counter
      .to(strip, { yPercent: (-100 / N) * next, duration: 0.9, ease: 'expo.inOut' }, 0.05)
      // image opens over the previous one (from below when going forward, from above when going back)
      .set(media[next], { zIndex: ++z }, 0)
      .fromTo(media[next],
        { clipPath: dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1 }, 0)
      .fromTo(img, { scale: 1.45 }, { scale: 1.12, duration: 1.6, ease: 'expo.out' }, 0);
  };

  // scroll -> progress -> active step + segments
  const trigger = () => ({
    trigger: pin, start: 'top top', end: 'bottom bottom', invalidateOnRefresh: true,
  });
  ScrollTrigger.create({
    ...trigger(),
    onUpdate: (self) => {
      const p = self.progress;
      fills.forEach((f, i) => gsap.set(f, { scaleX: gsap.utils.clamp(0, 1, p * N - i) }));
      goTo(Math.min(N - 1, Math.floor(p * N * 0.9999)));
    },
  });

  // stage height = viewport; pin height = viewport + ~85% viewport per step,
  // plus a trailing hold so the last step's crossfade fully settles while
  // still pinned instead of unpinning mid-transition into the next section.
  const measure = () => {
    const desktop = window.innerWidth >= 1200;
    let vh;
    if (desktop) {
      const scale = document.documentElement.clientWidth / 1440;
      vh = window.innerHeight / scale;
      sticky.style.height = `${vh}px`;
    } else {
      // Mobile uses native `position: sticky` with CSS `100svh` (stable
      // across the address-bar show/hide). Read its real rendered height
      // instead of window.innerHeight, which shifts as the bar collapses
      // and desyncs from the pin's scroll math.
      sticky.style.removeProperty('height');
      vh = sticky.offsetHeight;
    }
    pin.style.height = `${vh + vh * 0.85 * N + vh * 0.6}px`;
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  // desktop only: translate-based pin (css sticky ignores the scale transform)
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1200px)', () => {
    gsap.fromTo(sticky, { y: 0 }, {
      y: () => pin.offsetHeight - sticky.offsetHeight, ease: 'none',
      scrollTrigger: { ...trigger(), scrub: true },
    });
    return () => gsap.set(sticky, { clearProps: 'transform' });
  });

  // stage entrance
  gsap.from(['.hw-counter', '.hw-segments'], { y: 40, autoAlpha: 0, duration: 1, stagger: 0.1, ease: 'expo.out',
    scrollTrigger: { trigger: pin, start: 'top 70%' } });
  gsap.fromTo('.hw-media', { clipPath: 'inset(12% 12% 12% 12% round 400px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.4, ease: 'expo.inOut',
      scrollTrigger: { trigger: pin, start: 'top 70%' } });
}

/* ============================================================
   8. INTEGRATE — logo columns drift in opposite directions,
      pill wipes in, title chars cascade
============================================================ */
function integrate() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1200px)', () => {
    gsap.fromTo('.integrate-col-1', { y: 120 }, { y: -120, ease: 'none',
      scrollTrigger: { trigger: '.integrate', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.integrate-col-2', { y: -120 }, { y: 120, ease: 'none',
      scrollTrigger: { trigger: '.integrate', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  mm.add('(max-width: 1199px)', () => {
    gsap.from('.integrate-pill', { scale: 0.6, autoAlpha: 0, duration: 0.8, stagger: { each: 0.06, from: 'random' }, ease: 'back.out(1.6)',
      scrollTrigger: { trigger: '.integrate-logos', start: 'top 85%' } });
  });

  const content = $('.integrate-content');
  show(content);
  const chars = SplitText.create('.integrate-word1, .integrate-word2', { type: 'words,chars' }).chars;
  const tl = gsap.timeline({ scrollTrigger: { trigger: content, start: 'top 75%' } });
  tl.from(chars, { yPercent: 100, autoAlpha: 0, duration: 0.9, stagger: 0.03, ease: 'expo.out' })
    .fromTo('.integrate-pill-img', { clipPath: 'inset(0% 100% 0% 0% round 64px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 64px)', duration: 1.1, ease: 'expo.inOut' }, '-=0.7')
    .from('.integrate-text', { y: 24, autoAlpha: 0, duration: 0.9, ease: 'power3.out' }, '-=0.6');
}

/* ============================================================
   9. STORIES — chars drop from random heights, cards sweep in
============================================================ */
function stories() {
  const title = $('.stories-title');
  show(title);
  const chars = SplitText.create(title, { type: 'words,chars' }).chars;
  gsap.from(chars, { y: () => gsap.utils.random(-120, -40), autoAlpha: 0, rotate: () => gsap.utils.random(-25, 25),
    duration: 1.2, stagger: { each: 0.03, from: 'random' }, ease: 'expo.out',
    scrollTrigger: { trigger: title, start: 'top 80%' } });

  const row = $('.stories-row');
  show(row);
  gsap.from('.story-card', { x: 200, autoAlpha: 0, rotate: 2, duration: 1.3, stagger: 0.15, ease: 'expo.out',
    scrollTrigger: { trigger: row, start: 'top 80%' } });
  gsap.from('.stories-arrow', { scale: 0, duration: 0.8, stagger: 0.1, ease: 'back.out(2)',
    scrollTrigger: { trigger: row, start: 'top 80%' } });
  gsap.fromTo('.stories-bg', { yPercent: -6, scale: 1.1 }, { yPercent: 6, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.stories', start: 'top bottom', end: 'bottom top', scrub: true } });
}

/* ============================================================
   10. USECASES — title chars ripple like a wave (scrub),
       list rows cascade in alternating columns
============================================================ */
function usecases() {
  const title = $('.usecases-title');
  show(title);
  const chars = SplitText.create('.usecases-endless, .usecases-oport', { type: 'words,chars' }).chars;
  gsap.from(chars, { yPercent: (i) => (i % 2 ? 60 : -60), autoAlpha: 0, ease: 'none', stagger: 0.02,
    scrollTrigger: { trigger: title, start: 'top 90%', end: 'center 50%', scrub: 1 } });
  gsap.from('.usecases-one', { autoAlpha: 0, x: -40, ease: 'none',
    scrollTrigger: { trigger: title, start: 'top 90%', end: 'center 55%', scrub: 1 } });

  const grid = $('.usecases-grid');
  show(grid);
  const cols = $$('.usecases-col', grid);
  cols.forEach((col, c) => {
    gsap.from($$('.usecase', col), { x: c ? 80 : -80, autoAlpha: 0, duration: 1, stagger: 0.08, ease: 'expo.out',
      scrollTrigger: { trigger: grid, start: 'top 80%' } });
  });
}

/* ============================================================
   11. ARTICLES — images reveal top-down with a counter-zoom
============================================================ */
function articles() {
  const heading = $('.articles-heading');
  show(heading);
  SplitText.create(heading, {
    type: 'words', mask: 'words',
    onSplit: (self) => gsap.from(self.words, { yPercent: 100, duration: 1, stagger: 0.1, ease: 'expo.out',
      scrollTrigger: { trigger: heading, start: 'top 85%' } }),
  });

  const grid = $('.articles-grid');
  show(grid);
  $$('.article', grid).forEach((art, i) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: grid, start: 'top 80%' }, delay: i * 0.15 });
    tl.fromTo($('.article-img', art), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut' })
      .from($('.article-img img', art), { scale: 1.4, duration: 1.6, ease: 'expo.out' }, '<0.2')
      .from($$('.article-tag, .article-title, .article-read', art), { y: 20, autoAlpha: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, '-=1');
  });
  gsap.from('.articles-cta', { scale: 0.8, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.7)',
    scrollTrigger: { trigger: '.articles-cta', start: 'top 92%' } });
}

/* ============================================================
   12. EVENTS — "Join us" skews in, the card frame DRAWS itself
============================================================ */
function events() {
  const head = $('.events-head');
  show(head);
  const chars = SplitText.create('.events-title', { type: 'words,chars' }).chars;
  gsap.from(chars, { xPercent: -60, skewX: 30, autoAlpha: 0, duration: 1.1, stagger: 0.05, ease: 'expo.out',
    scrollTrigger: { trigger: head, start: 'top 80%' } });
  gsap.from('.events-all', { x: 40, autoAlpha: 0, duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: head, start: 'top 80%' } });

  // frame pieces are pseudo-elements driven by CSS custom properties
  const card = $('.event-card');
  gsap.set(card, { '--draw-line': 0, '--draw-corner': 0 });
  const body = $('.event-body');
  show(body);
  const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 75%' } });
  tl.to(card, { '--draw-line': 1, duration: 1.2, ease: 'expo.inOut' })
    .to(card, { '--draw-corner': 1, duration: 0.9, ease: 'expo.out' }, '-=0.3')
    .from($$('.event-text > *', body), { y: 40, autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }, '-=1.1')
    .fromTo('.event-img', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.4, ease: 'expo.inOut' }, '-=1.2');
}

/* ============================================================
   13. NEWSLETTER — gradient breathes, underlines draw
============================================================ */
function newsletter() {
  const title = $('.newsletter-title');
  show(title);
  SplitText.create(title, {
    type: 'lines', mask: 'lines', autoSplit: true,
    onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1.1, stagger: 0.1, ease: 'expo.out',
      scrollTrigger: { trigger: title, start: 'top 85%' } }),
  });
  gsap.fromTo('.newsletter-bg', { scale: 1.25, rotate: -4 }, { scale: 1, rotate: 0, ease: 'none',
    scrollTrigger: { trigger: '.newsletter', start: 'top bottom', end: 'bottom top', scrub: true } });

  const row = $('.newsletter-row');
  show(row);
  const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 85%' } });
  tl.from('.newsletter-sub', { y: 20, autoAlpha: 0, duration: 0.8, ease: 'power3.out' })
    .from('.newsletter-input', { clipPath: 'inset(0% 100% 0% 0%)', duration: 1.2, stagger: 0.15, ease: 'expo.inOut' }, '<')
    .from('.newsletter-submit', { x: -30, autoAlpha: 0, duration: 0.8, ease: 'expo.out' }, '-=0.5');
}

/* ============================================================
   14. FINAL CTA — chars scale out of blur, pill rows drift
       in opposite directions with the scroll
============================================================ */
function finalCta() {
  const head = $('.cta-head');
  show(head);
  const chars = SplitText.create('.cta-title', { type: 'words,chars' }).chars;
  const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 80%' } });
  tl.from(chars, { scale: 1.8, filter: 'blur(16px)', autoAlpha: 0, duration: 1.2, stagger: { each: 0.03, from: 'center' }, ease: 'expo.out' })
    .from('.cta-text', { y: 24, autoAlpha: 0, duration: 0.9, ease: 'power3.out' }, '-=0.7')
    .from('.cta-btn', { scale: 0.6, autoAlpha: 0, duration: 0.9, ease: 'elastic.out(1, 0.6)' }, '-=0.6');

}

/* ============================================================
   15. FOOTER — logo draws up, columns stagger
============================================================ */
function footer() {
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.site-footer', start: 'top 85%' } });
  tl.from('.footer-logo', { yPercent: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out' })
    .from('.footer-col', { y: 40, autoAlpha: 0, duration: 1, stagger: 0.1, ease: 'expo.out' }, '<0.1')
    .from('.footer-bottom', { autoAlpha: 0, duration: 1 }, '-=0.6');
}

/* ============================================================
   Magnetic buttons (desktop pointers only)
============================================================ */
function magneticButtons() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('.btn, .btn-ghost-dark, .stories-arrow, .newsletter-submit, .float-menu, .main-nav a, .header-actions .link-muted').forEach((btn) => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
    });
    btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}


/* ============================================================
   PRELOADER — "WALK THROUGH THE DOOR"
   The Welcome logo is an arch (a doorway):
   1) its outline draws with the REAL load progress + counter
   2) at 100 the door "opens": the arch becomes a window into the
      site and the hero starts animating inside it
   3) the doorway rushes toward you until it fills the screen
   Min 1.4s (never flashes), max 5s (never blocks).
============================================================ */
function preloader() {
  return new Promise((resolve) => {
    const el = document.getElementById('preloader');
    if (!el) return resolve();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = W / 2;
    const cy = H / 2 - 24;
    // arch centred on (0,0): 84 wide, 100 tall, semicircular top
    const arch = 'M-42 50 V-8 A42 42 0 0 1 42 -8 V50 Z';
    const svg = $('.preloader-svg', el);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `
      <defs>
        <mask id="plMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
          <rect width="${W}" height="${H}" fill="#fff"/>
          <path class="pl-hole" d="${arch}" fill="#000" transform="translate(${cx} ${cy}) scale(0)"/>
        </mask>
      </defs>
      <rect width="${W}" height="${H}" fill="#000" mask="url(#plMask)"/>
      <path class="pl-outline" d="${arch}" transform="translate(${cx} ${cy})" fill="none" stroke="#fff"
            stroke-width="1.5" vector-effect="non-scaling-stroke" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`;
    el.style.background = 'transparent'; // the masked rect is the black now

    const hole = $('.pl-hole', svg);
    const outline = $('.pl-outline', svg);
    const num = $('.preloader-num', el);
    const setHole = (s) => hole.setAttribute('transform', `translate(${cx} ${cy}) scale(${s})`);

    const imgs = [...document.images];
    let loaded = 0;
    const onOne = () => { loaded += 1; };
    imgs.forEach((i) => {
      if (i.complete) onOne();
      else { i.addEventListener('load', onOne, { once: true }); i.addEventListener('error', onOne, { once: true }); }
    });

    const t0 = performance.now();
    const state = { p: 0 };
    const tick = () => {
      const elapsed = (performance.now() - t0) / 1000;
      const real = imgs.length ? loaded / imgs.length : 1;
      const goal = elapsed > 5 ? 1 : Math.min(real, elapsed / 1.4, 1);
      state.p += (goal - state.p) * 0.08;
      if (goal === 1 && state.p > 0.995) state.p = 1;
      num.textContent = Math.round(state.p * 100);
      outline.setAttribute('stroke-dashoffset', 1 - state.p);
      if (state.p === 1) { gsap.ticker.remove(tick); open(); }
    };
    gsap.ticker.add(tick);

    const open = () => {
      // scale so the arch fully covers the viewport corners from its centre
      const big = (Math.hypot(W, H) * 2.4) / 84;
      const door = { s: 0 };
      gsap.timeline({ onComplete: () => el.remove() })
        .to('.preloader-meta', { autoAlpha: 0, y: -12, duration: 0.45, ease: 'power2.in' }, 0)
        // 1) the door opens: the arch turns into a window onto the site
        .to(door, { s: 1, duration: 0.7, ease: 'expo.out', onUpdate: () => setHole(door.s) }, 0.1)
        .add(resolve, 0.35)                                   // hero starts playing inside the doorway
        .to(outline, { opacity: 0, duration: 0.5 }, 0.6)
        // 2) walk through it
        .to(door, { s: big, duration: 1.3, ease: 'expo.in', onUpdate: () => setHole(door.s) }, 0.85);
    };
  });
}

/* ============================================================
   CUSTOM CURSOR — trailing dot; grows on links/buttons and
   shows a label on key areas (desktop pointers only)
============================================================ */
function customCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.innerHTML = '<span class="cursor-label"></span>';
  document.body.appendChild(cursor);
  const label = $('.cursor-label', cursor);
  document.documentElement.classList.add('has-cursor');

  // contextual labels (only where the label is true to what happens)
  const labels = [
    ['.article', 'Read'],
    ['.hw-step', 'Explore'],
  ];
  labels.forEach(([sel, text]) => $$(sel).forEach((el) => { el.dataset.cursor = text; }));

  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });

  window.addEventListener('mousemove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    cursor.classList.add('is-visible');
  });
  document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
  window.addEventListener('mousedown', () => cursor.classList.add('is-down'));
  window.addEventListener('mouseup', () => cursor.classList.remove('is-down'));

  document.addEventListener('mouseover', (e) => {
    const withLabel = e.target.closest('[data-cursor]');
    const interactive = e.target.closest('a, button, input, [role="button"]');
    cursor.classList.toggle('is-hidden', !!e.target.closest('.float-menu'));
    cursor.classList.toggle('is-label', !!withLabel);
    cursor.classList.toggle('is-link', !withLabel && !!interactive);
    if (withLabel) label.textContent = withLabel.dataset.cursor;
  });
}


/* ============================================================
   CURVED EDGES — flatten as the section scrolls in
============================================================ */
function sectionCurves() {
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 1200px)', mobile: '(max-width: 1199px)' }, (ctx) => {
    const h = ctx.conditions.desktop ? 180 : 80; // layout px
    $$('.section-curve').forEach((curve) => {
      gsap.fromTo(curve, { height: h }, {
        height: 0, ease: 'none',
        scrollTrigger: {
          trigger: curve.parentElement, start: 'top bottom', scrub: true, invalidateOnRefresh: true,
          // flatten by the time the section is 25% from the top — or by the end of the page
          // (the last sections, like the footer, can never scroll that far)
          end: (self) => Math.min(
            self.trigger.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.25,
            ScrollTrigger.maxScroll(window) - window.innerHeight * 0.35), // last sections: flat well before the end
        },
      });
    });
  });
}

/* ============================================================
   DIRECTIONAL MARQUEES — keep moving on their own, flip
   direction when the user scrolls up, speed up with velocity.
   - Trust logo columns: their CSS animations get a signed
     playbackRate (negative = reversed).
   - CTA pill rows: GSAP-driven loop (row 1 left, row 2 right).
============================================================ */
function directionalMarquees() {
  let dir = 1;       // 1 = scrolling down, -1 = up (sticky: keeps the last one)
  let boost = 0;     // extra speed from scroll velocity, eases back to 0

  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      dir = self.direction;
      boost = Math.max(boost, Math.min(Math.abs(self.getVelocity()) / 400, 6));
    },
  });

  // CTA rows
  const rows = $$('.cta-row-track').map((track, i) => ({
    track,
    base: i === 0 ? -1 : 1,     // row 1 travels left, row 2 right
    x: 0,
    half: 0,
    rate: 1,
  }));
  const measure = () => rows.forEach((r) => {
    r.half = r.track.scrollWidth / 2;
    if (r.base === 1 && r.x === 0) r.x = -r.half; // start row 2 at the seam so it can move right
  });
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);

  // Trust logo columns: driven here too (changing a CSS animation's
  // playbackRate every frame freezes it on GPU-composited Chrome).
  // Vertical on desktop, horizontal on tablet/mobile (their CSS layout).
  const cols = $$('.logo-col-track').map((track) => ({
    track,
    duration: track.classList.contains('logo-col-track-reverse') ? 26 : 22, // same timing as the CSS version
    pos: 0,
    half: 0,
    axis: 'y',
    rate: 1,
  }));
  const measureCols = () => cols.forEach((c) => {
    c.axis = getComputedStyle(c.track).flexDirection === 'row' ? 'x' : 'y';
    c.half = (c.axis === 'y' ? c.track.scrollHeight : c.track.scrollWidth) / 2;
    c.pos = gsap.utils.wrap(-c.half, 0, c.pos);
    gsap.set(c.track, { x: 0, y: 0 });
  });
  measureCols();
  ScrollTrigger.addEventListener('refreshInit', measureCols);
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return; // mobile address-bar show/hide only changes height
    lastWidth = window.innerWidth;
    measureCols();
  });

  gsap.ticker.add((time, delta) => {
    boost += (0 - boost) * 0.05;
    const target = dir * (1 + boost);
    const dt = delta / 1000;

    rows.forEach((r) => {
      if (!r.half) return;
      r.rate += (target - r.rate) * 0.1;
      r.x += r.base * r.rate * 60 * dt;             // 60 layout px / s at rest
      r.x = gsap.utils.wrap(-r.half, 0, r.x);
      gsap.set(r.track, { x: r.x });
    });

    cols.forEach((c) => {
      if (!c.half) return;
      c.rate += (target - c.rate) * 0.1;
      c.pos -= (c.half / c.duration) * c.rate * dt;   // one half-loop per `duration` seconds at rest
      c.pos = gsap.utils.wrap(-c.half, 0, c.pos);
      gsap.set(c.track, { [c.axis]: c.pos });
    });
  });
}


/* ============================================================
   CURTAIN TRANSITION (Dennis Snellenberg style)
   A dark panel with a curved top rises and covers the screen,
   shows "• Destination", the page jumps behind it, then the
   panel keeps rising (curved bottom) and reveals the section.
============================================================ */
function createCurtain(lenis) {
  const el = document.createElement('div');
  el.className = 'curtain';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <svg class="curtain-curve curtain-curve-top" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 100 Q50 0 100 100 Z"/></svg>
    <div class="curtain-body"><span class="curtain-label"><i></i><b></b></span></div>
    <svg class="curtain-curve curtain-curve-bottom" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 0 Q50 0 100 0 Z"/></svg>`;
  document.body.appendChild(el);

  const top = $('.curtain-curve-top path', el);
  const bottom = $('.curtain-curve-bottom path', el);
  const label = $('.curtain-label', el);
  const text = $('b', label);
  let busy = false;

  const go = (target, name) => {
    if (busy) return;
    busy = true;
    text.textContent = name;

    gsap.timeline({
      onComplete: () => {
        gsap.set(el, { yPercent: 100, visibility: 'hidden' });
        busy = false;
      },
    })
      .set(el, { visibility: 'visible', yPercent: 100 })
      .set(top, { attr: { d: 'M0 100 Q50 0 100 100 Z' } })        // top edge bulges up
      .set(bottom, { attr: { d: 'M0 0 Q50 0 100 0 Z' } })          // bottom edge flat
      .set(label, { autoAlpha: 0, y: 30 })
      // 1) rise and cover
      .to(el, { yPercent: 0, duration: 0.75, ease: 'power3.inOut' })
      .to(top, { attr: { d: 'M0 100 Q50 100 100 100 Z' }, duration: 0.75, ease: 'power3.in' }, '<')
      .to(label, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' }, '-=0.3')
      // 2) jump behind the curtain
      .add(() => {
        lenis.scrollTo(target === document.body ? 0 : target, { immediate: true, force: true });
        ScrollTrigger.update();
      })
      .to({}, { duration: 0.35 })
      .to(label, { autoAlpha: 0, y: -30, duration: 0.4, ease: 'power3.in' })
      // 3) keep rising, curved bottom edge, reveal
      .to(el, { yPercent: -100, duration: 0.85, ease: 'power3.inOut' }, '-=0.1')
      .to(bottom, { attr: { d: 'M0 0 Q50 100 100 0 Z' }, duration: 0.85, ease: 'power3.out' }, '<');
  };

  gsap.set(el, { yPercent: 100, visibility: 'hidden' });
  return { go };
}