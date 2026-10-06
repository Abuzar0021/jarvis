import { Film, clamp, seg, ease, warp, unwarp, WARP_TOTAL } from './film.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const stage = $('.stage');
const pin = $('.pin');
const small = matchMedia('(max-width: 820px)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------ text split */
// Hero headline: words, then characters that start scattered and gather on load.
function splitChars(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map((w) =>
    `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="c">${c}</span>`).join('')}</span>`
  ).join(' ');
  return $$('.c', el);
}
// Body copy: characters that type on as their block enters.
function splitType(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="w">${[...w].map((c) => `<span class="c">${c}</span>`).join('')}</span>`).join(' ');
  return $$('.c', el);
}

const heroChars = splitChars($('.hero h1'));
heroChars.forEach((c, i) => {
  const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 90;
  c.style.setProperty('--sx', `${Math.cos(a) * r}px`);
  c.style.setProperty('--sy', `${Math.sin(a) * r * 0.6}px`);
  c.style.setProperty('--sr', `${(Math.random() - 0.5) * 40}deg`);
  c.style.setProperty('--so', '0');
  c.style.setProperty('--sd', `${0.15 + i * 0.022}s`);
  // each letter leaves on its own heading when the hero scrolls away
  c.style.setProperty('--cx', `${-30 - Math.random() * 60}px`);
  c.style.setProperty('--cy', `${(Math.random() - 0.7) * 30}px`);
});
const typeBlocks = $$('.split-type').map((el) => ({ el, chars: splitType(el) }));

// stagger index for each line inside a block
$$('.bk').forEach((bk) => $$('.ln > i', bk).forEach((el, i) => el.style.setProperty('--li', i)));

/* --------------------------------------------------------- guide frame */
// A pencil grid over the film. The left rule and the top rule stay put; the other lines
// slide with the scroll to frame whichever block of copy is on stage, and a cross sits
// wherever two lines meet.
const guides = $('.guides');
function wobblyLine(x1, y1, x2, y2, amp = 1.4) {
  const n = 24, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const nx = -(y2 - y1), ny = x2 - x1, len = Math.hypot(nx, ny) || 1;
    const w = Math.sin(t * 9.1 + x1 * 0.01) * amp * 0.6 + (Math.random() - 0.5) * amp * 0.5;
    pts.push(`${(x1 + (x2 - x1) * t + (nx / len) * w).toFixed(1)},${(y1 + (y2 - y1) * t + (ny / len) * w).toFixed(1)}`);
  }
  return `M${pts.join('L')}`;
}
const cssPx = (prop, axis) => {
  const probe = document.createElement('i');
  probe.style.cssText = `position:absolute;${axis === 'x' ? 'left' : 'top'}:${getComputedStyle(pin).getPropertyValue(prop).trim()};visibility:hidden`;
  pin.appendChild(probe);
  const out = axis === 'x' ? probe.offsetLeft : probe.offsetTop;
  probe.remove();
  return out;
};
// where a block sits inside the pinned stage, ignoring its enter and exit transforms
function restRect(el) {
  let x = 0, y = 0, n = el;
  while (n && n !== pin) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight };
}
// copy that the grid frames, with the scroll window it holds for
const FRAMED = [
  ['.hero h1', 0, 0.016],
  ...$$('.beat, .panel, .term, .asked').map((el) => [el, ...el.dataset.win.split(',').map(Number)]),
  ['.brief-form', 0.808, 0.895],
];
let grid = null;
function drawGuides() {
  const W = innerWidth, H = innerHeight, pad = small ? 18 : 30;
  const v1 = cssPx('--v1', 'x'), h1 = cssPx('--h1', 'y');
  const base = { v2: cssPx('--v2', 'x'), v3: v1, h2: cssPx('--h2', 'y'), h3: h1 };
  const keys = [];
  for (const [sel, a, b] of FRAMED) {
    const el = typeof sel === 'string' ? $(sel) : sel;
    if (!el) continue;
    const r = restRect(el);
    const L = {
      v2: Math.min(W - 14, r.right + pad),
      v3: r.left - pad > v1 + 40 ? r.left - pad : v1,
      h2: Math.min(H - 14, r.bottom + pad),
      h3: r.top - pad > h1 + 30 ? r.top - pad : h1,
    };
    keys.push([Math.max(a, 0), L], [b, L]);
  }
  keys.push([0.91, base]);
  keys.sort((m, n) => m[0] - n[0]);
  guides.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // every line is drawn once at the origin and moved by transform
  const vLines = ['v1', 'v2', 'v3'], hLines = ['h1', 'h2', 'h3'];
  guides.innerHTML =
    vLines.map((k, i) => `<path data-k="${k}" d="${wobblyLine(0, 0, 0, H)}" style="--d:${i * 0.12}s"/>`).join('') +
    hLines.map((k, i) => `<path data-k="${k}" d="${wobblyLine(0, 0, W, 0)}" style="--d:${(i + 3) * 0.12}s"/>`).join('') +
    vLines.flatMap((v) => hLines.map((h) => `<path class="x" data-v="${v}" data-h="${h}" d="M-5,0H5M0,-5V5"/>`)).join('');
  grid = { v1, h1, base, keys, paths: $$('path', guides), last: '' };
  // draw the lines on like a hand with a pencil
  grid.paths.filter((p) => !p.classList.contains('x')).forEach((p, i) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = reduced ? 0 : len;
    p.getBoundingClientRect();
    p.style.transition = `stroke-dashoffset ${1.4 + i * 0.1}s cubic-bezier(.2,.9,.25,1) ${0.2 + i * 0.12}s`;
    p.style.strokeDashoffset = 0;
  });
}
function updateGuides(p) {
  if (!grid) return;
  const { keys, v1, h1 } = grid;
  let L = keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, A] = keys[i], [b, B] = keys[i + 1];
    if (p < a) break;
    if (p <= b) {
      const t = b > a ? ease(seg(p, a, b)) : 1;
      L = { v2: A.v2 + (B.v2 - A.v2) * t, v3: A.v3 + (B.v3 - A.v3) * t, h2: A.h2 + (B.h2 - A.h2) * t, h3: A.h3 + (B.h3 - A.h3) * t };
      break;
    }
    L = B;
  }
  const pos = { v1, v2: L.v2, v3: L.v3, h1, h2: L.h2, h3: L.h3 };
  // a line folded onto its anchor fades out instead of doubling it
  const vis = { v1: 1, h1: 1, v2: 1, h2: 1, v3: clamp((L.v3 - v1) / 40), h3: clamp((L.h3 - h1) / 30) };
  const sig = Object.values(pos).map((n) => n.toFixed(1)).join();
  if (sig === grid.last) return;
  grid.last = sig;
  for (const path of grid.paths) {
    if (path.classList.contains('x')) {
      const { v, h } = path.dataset;
      path.setAttribute('transform', `translate(${pos[v].toFixed(1)} ${pos[h].toFixed(1)})`);
      path.style.opacity = (Math.min(vis[v], vis[h]) * 0.8).toFixed(3);
    } else {
      const k = path.dataset.k;
      path.setAttribute('transform', k[0] === 'v' ? `translate(${pos[k].toFixed(1)} 0)` : `translate(0 ${pos[k].toFixed(1)})`);
      path.style.opacity = (vis[k] * 0.38).toFixed(3);
    }
  }
}

/* --------------------------------------------------------------- scroll */
let H = 1, target = 0, cur = 0;
function measure() {
  // the stage grows by however much extra scroll the dwelling holds asked for
  stage.style.height = `${(small ? 7200 : 5400) * WARP_TOTAL}vh`;
  H = Math.max(1, stage.offsetHeight - innerHeight);
  $$('.anchor').forEach((a) => { a.style.top = `${unwarp(parseFloat(a.dataset.at)) * H}px`; });
}
function onScroll() { target = clamp(window.scrollY / H); }
function goTo(at) {
  closeMenu();
  window.scrollTo({ top: unwarp(at) * H, behavior: reduced ? 'auto' : 'smooth' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const at = a.dataset.at ?? (id === 'top' ? 0 : $(`#${id}`)?.dataset.at);
  if (at === undefined) return;
  e.preventDefault();
  goTo(parseFloat(at));
  history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
});

/* ----------------------------------------------------------------- menu */
const menuBtn = $('.menu'), menuPanel = $('#menu');
$$('a', menuPanel).forEach((a, i) => a.style.setProperty('--n', i));
function closeMenu() { menuPanel.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => {
  const open = menuPanel.hidden;
  menuPanel.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  if (open) $('a', menuPanel).focus({ preventScroll: true });
});
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuPanel.hidden) { closeMenu(); menuBtn.focus(); } });

/* ------------------------------------------------------------- the film */
const film = new Film($('.film'), { small });
film.load().then(() => { last = -1; requestAnimationFrame(() => document.documentElement.classList.add('gl-ready')); });

/* ------------------------------------------------------------ blocks */
const blocks = $$('.bk').map((el) => {
  const [a, b] = el.dataset.win.split(',').map(Number);
  return { el, a, b, type: typeBlocks.find((t) => t.el === el || el.contains(t.el)) };
});
const FADE = 0.012; // progress spent entering and leaving

function updateBlocks(p) {
  for (const k of blocks) {
    // arrive in the first quarter, leave in the last sixth: the words always finish first
    const len = k.b - k.a;
    const e = k.a < 0 ? 1 : seg(p, k.a, k.a + Math.min(FADE * 1.6, len * 0.25));
    const x = seg(p, k.b - Math.min(FADE, len * 0.16), k.b);
    const live = e > 0 && x < 1;
    k.el.classList.toggle('live', live);
    if (!live) continue;
    k.el.style.setProperty('--e', e.toFixed(4));
    k.el.style.setProperty('--x', ease(x).toFixed(4));
    if (k.type) {
      // type the stand-first on as the block settles
      const n = k.type.chars.length;
      const shown = k.a < 0 ? n : Math.ceil(seg(p, k.a + len * 0.06, k.a + Math.min(FADE * 3.2, len * 0.4)) * n);
      if (k.type.shown !== shown) {
        k.type.chars.forEach((c, i) => c.style.setProperty('--co', i < shown ? '1' : '0'));
        k.type.shown = shown;
      }
    }
  }
}

/* ------------------------------------------------------------ chapters */
const rail = $('.rail');
const railLinks = $$('a', rail);
const ruler = $('.ruler');
function updateChrome(p) {
  rail.classList.toggle('on', p > 0.036 && p < 0.9);
  rail.classList.toggle('ink', film.edgeLightAt(p));
  let active = -1;
  railLinks.forEach((a, i) => { if (p >= parseFloat(a.dataset.at) - 0.004) active = i; });
  railLinks.forEach((a, i) => a.classList.toggle('on', i === active));
  ruler.classList.toggle('on', p > 0.236 && p < 0.352);
  pin.classList.toggle('on-light', film.lightAt(p));
  pin.classList.toggle('on-dark', p >= 0.91);
}

/* ------------------------------------------------------------ FAQ cards */
const cards = $$('.fq');
const FAQ = [0.648, 0.79];
function updateCards(p) {
  const q = seg(p, FAQ[0], FAQ[1]);
  const N = cards.length;
  const spread = small ? 210 : 330;
  cards.forEach((card, i) => {
    // s runs from +2 (waiting on the right) through 0 (centre stage) to -2 (gone left)
    const s = 2.2 - q * (N + 3.4) + i;
    const a = Math.abs(s);
    const vis = q > 0 && q < 1 ? clamp(1 - (a - 1.1) / 1.0) : 0;
    const x = s * spread;
    const y = s * s * (small ? 18 : 34) - (1 - clamp(a)) * 10;
    const rz = s * 5.5;
    const ry = -s * 32;
    const z = -a * 160;
    card.style.opacity = vis.toFixed(3);
    card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
    card.style.setProperty('--ans', clamp(1 - (a - 0.32) / 0.3).toFixed(3));
    card.style.zIndex = String(100 - Math.round(a * 10));
  });
}

/* --------------------------------------------------------------- brief */
const brief = $('.brief');
const fields = $$('.field, .send', brief);
const embers = $('.embers', brief);
for (let i = 0; i < (small ? 10 : 18); i++) {
  const e = document.createElement('i');
  e.style.left = `${10 + Math.random() * 80}%`;
  e.style.top = `${15 + Math.random() * 75}%`;
  e.style.setProperty('--dur', `${2 + Math.random() * 2.6}s`);
  e.style.setProperty('--dl', `${-Math.random() * 3}s`);
  e.style.setProperty('--wx', `${(Math.random() - 0.5) * 30}px`);
  embers.appendChild(e);
}
const scatter = fields.map(() => [(Math.random() - 0.5) * 260, 120 + Math.random() * 160, -200 - Math.random() * 300, (Math.random() - 0.5) * 18]);
const BRIEF = [0.808, 0.895];
function updateBrief(p) {
  const e = seg(p, BRIEF[0], BRIEF[0] + 0.03);
  const x = seg(p, BRIEF[1] - 0.012, BRIEF[1]);
  const live = e > 0 && x < 1;
  brief.classList.toggle('live', live);
  if (!live) return;
  brief.style.setProperty('--le', (ease(seg(p, BRIEF[0], BRIEF[0] + 0.014)) * (1 - x)).toFixed(3));
  fields.forEach((f, i) => {
    const k = ease(clamp(e * 1.6 - i * 0.15));
    const [sx, sy, sz, sr] = scatter[i];
    f.style.setProperty('--fo', (k * (1 - x)).toFixed(3));
    f.style.setProperty('--fx', `${(sx * (1 - k)).toFixed(1)}px`);
    f.style.setProperty('--fy', `${(sy * (1 - k) - x * 40).toFixed(1)}px`);
    f.style.setProperty('--fz', `${(sz * (1 - k)).toFixed(1)}px`);
    f.style.setProperty('--fr', `${(sr * (1 - k)).toFixed(2)}deg`);
  });
}
const form = $('.brief-form');
if (!small) {
  brief.addEventListener('pointermove', (ev) => {
    const nx = ev.clientX / innerWidth - 0.5, ny = ev.clientY / innerHeight - 0.5;
    form.style.setProperty('--ry', `${(nx * 10).toFixed(2)}deg`);
    form.style.setProperty('--rx', `${(-ny * 8).toFixed(2)}deg`);
  });
}
// Briefs are delivered by FormSubmit straight to the studio inbox; no server of our own.
const INBOX = 'omnistacksdigital@gmail.com';
const sendBtn = $('.send', form);
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const status = $('.sent', form);
  if (!form.checkValidity()) { status.textContent = 'Please add your name, a valid email and a line about the project.'; return; }
  const d = new FormData(form);
  if (d.get('_honey')) return; // a bot filled the hidden field
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending…';
  status.textContent = '';
  try {
    // On the live site the page names its own lead API (stored in the admin and emailed);
    // anywhere else the brief goes out through FormSubmit.
    const endpoint = form.dataset.endpoint;
    const res = endpoint
      ? await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: d.get('name'),
            email: d.get('email'),
            message: d.get('project'),
            source: 'home',
            page: location.pathname,
            utm: location.search.slice(1, 400),
            website: d.get('_honey') || '',
          }),
        })
      : await fetch(`https://formsubmit.co/ajax/${INBOX}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: d.get('name'),
            email: d.get('email'),
            project: d.get('project'),
            _subject: `New project brief from ${d.get('name')}`,
            _replyto: d.get('email'),
            _template: 'table',
            _captcha: 'false',
          }),
        });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.ok === false || String(out.success) === 'false') throw new Error(out.message || out.error || res.statusText);
    form.reset();
    status.textContent = 'Thank you. Your brief is with us, and a person will reply within two working days.';
    sendBtn.textContent = 'Sent';
  } catch (err) {
    status.innerHTML = `That did not go through. Please try again, or write to <a href="mailto:${INBOX}">${INBOX}</a>.`;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send the brief';
  }
});

/* ---------------------------------------------------------------- coda */
const coda = $('.coda');
const codaFilm = $('.coda-film', coda);
const CODA = [0.915, 0.975];
function updateCoda(p) {
  const e = seg(p, CODA[0], CODA[1]);
  coda.classList.toggle('live', e > 0);
  // the dusk loop only runs while the coda is on screen
  if (e > 0 && codaFilm.paused && !reduced) codaFilm.play().catch(() => {});
  if (e <= 0 && !codaFilm.paused) codaFilm.pause();
  if (e <= 0) return;
  coda.style.setProperty('--gl', ease(clamp(e * 2)).toFixed(3));
  coda.style.setProperty('--wm', ease(clamp(e * 2 - 0.5)).toFixed(3));
  coda.style.setProperty('--art', ease(clamp(e * 1.6 - 0.5)).toFixed(3));
  const tag = $('.coda-tag', coda);
  tag.style.setProperty('--e', clamp(e * 2 - 0.7).toFixed(3));
  tag.style.setProperty('--x', '0');
}

/* ---------------------------------------------------------------- loop */
let last = -1;
function frame(now) {
  const d = target - cur;
  cur = Math.abs(d) < 1e-5 ? target : cur + d * (reduced ? 1 : 0.09);
  const p = warp(cur);
  film.render(p, now / 1000);
  updateGuides(p);
  if (p !== last) {
    updateBlocks(p);
    updateChrome(p);
    updateCards(p);
    updateBrief(p);
    updateCoda(p);
    last = p;
  }
  requestAnimationFrame(frame);
}

function start() {
  measure();
  drawGuides();
  onScroll();
  cur = target;
  // gather the headline once the page is ready
  requestAnimationFrame(() => requestAnimationFrame(() => {
    heroChars.forEach((c) => { c.style.setProperty('--sx', '0px'); c.style.setProperty('--sy', '0px'); c.style.setProperty('--sr', '0deg'); c.style.setProperty('--so', '1'); });
  }));
  const hash = location.hash.slice(1);
  if (hash && $(`#${hash}`)?.dataset.at) window.scrollTo(0, unwarp(parseFloat($(`#${hash}`).dataset.at)) * H);
  requestAnimationFrame(frame);
}

let rt;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => { measure(); film.resize(); drawGuides(); onScroll(); last = -1; }, 120);
});
addEventListener('scroll', onScroll, { passive: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
