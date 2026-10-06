// The film: scroll scrubs eight painted clips frame by frame on one WebGL canvas.
// The hero is one of two living loops, picked on each visit and played as video; the later
// chapters rest on single painted plates. Holds drift the camera while copy plays over them,
// and shader effects (burst, halftone print, warp wipe, stipple, glitch crest) run at the seams.

const BREATHE = 0, PRINT = 1, WIPE = 2, CREST = 3, BURST = 4, STIPPLE = 5;
const FRAMES = 96;
const LAST = FRAMES - 1;
// where the page keeps its assets ("/home/" on the live site, empty when served from the root)
const BASE = document.documentElement.dataset.base || '';
// the two opening loops; each bursts out of its own focal point
const HEROES = { h1: { focus: [0.6, 0.55] }, h2: { focus: [0.74, 0.5] } };
// on a tall phone screen only a sliver of each wide plate shows; these keep the subject in it
const SMALL_FOCUS = { h2: 0.665, p_scope: 0.62, p_few: 0.3 };
const CAM0 = [1, 0.5, 0.5];

// Every scroll segment, in story units. `seq` scrubs a clip; `hold` rests on one frame;
// `fx` runs a shader transition between two frames. A hold with `dwell` carries copy and is
// given at least that much scroll, so the film stays still until the words have landed.
export const TIMELINE = [
  { a: 0.000, b: 0.016, hold: 'hero', f: 0, cam: [CAM0, [1.04, 0.6, 0.45]], dwell: 0.03 },
  // the hero bursts: light and debris blow out of the strawberry, a dark tunnel opens,
  // and the painting prints itself back in dots
  { a: 0.016, b: 0.036, fx: BURST, from: ['hero', 0, [1.04, 0.6, 0.45]], to: ['t01', 0, CAM0] },
  { a: 0.036, b: 0.040, hold: 't01', f: 0, cam: [CAM0, CAM0] },
  { a: 0.040, b: 0.062, seq: 't01' },
  { a: 0.062, b: 0.086, seq: 't02', light: [false, true] },
  { a: 0.086, b: 0.104, hold: 't02', f: LAST, cam: [CAM0, [1.05, 0.56, 0.5]], light: true, dwell: 0.05 },
  { a: 0.104, b: 0.130, seq: 't03', cam0: [1.05, 0.56, 0.5], light: [true, false] },
  { a: 0.130, b: 0.146, hold: 't03', f: LAST, cam: [CAM0, [1.05, 0.52, 0.48]], dwell: 0.05 },
  { a: 0.146, b: 0.172, seq: 't04', cam0: [1.05, 0.52, 0.48], light: [false, true] },
  { a: 0.172, b: 0.188, hold: 't04', f: LAST, cam: [CAM0, [1.05, 0.58, 0.5]], light: true, dwell: 0.05 },
  { a: 0.188, b: 0.212, seq: 't05', cam0: [1.05, 0.58, 0.5], light: [true, false] },
  { a: 0.212, b: 0.228, hold: 't05', f: LAST, cam: [CAM0, [1.05, 0.55, 0.5]], dwell: 0.05 },
  { a: 0.228, b: 0.250, seq: 't06', cam0: [1.05, 0.55, 0.5] },
  // Chapter II arrives through a dithered dissolve spreading from the middle of the frame
  { a: 0.250, b: 0.264, fx: STIPPLE, from: ['t06', LAST, [1.22, 0.4, 0.55]], to: ['t07', 0, [1.14, 0.42, 0.56]] },
  { a: 0.264, b: 0.282, hold: 't07', f: 0, cam: [[1.14, 0.42, 0.56], [1.07, 0.46, 0.53]], dwell: 0.05 },
  { a: 0.282, b: 0.300, hold: 't07', f: 0, cam: [[1.07, 0.46, 0.53], CAM0], dwell: 0.05 },
  { a: 0.300, b: 0.330, seq: 't07' },
  { a: 0.330, b: 0.338, hold: 't07', f: LAST, cam: [CAM0, [1.04, 0.5, 0.5]], dwell: 0.05 },
  // the mosaic breaks into glyphs and rebuilds before the camera dives for the plan
  { a: 0.338, b: 0.352, fx: CREST, from: ['t07', LAST, [1.04, 0.5, 0.5]], to: ['t08', 0, CAM0] },
  { a: 0.352, b: 0.384, seq: 't08', light: [false, true] },
  { a: 0.384, b: 0.400, hold: 't08', f: LAST, cam: [CAM0, [1.12, 0.5, 0.5]], light: true },
  // Act III: each term gets its own painted plate instead of blank paper
  { a: 0.400, b: 0.416, fx: PRINT, from: ['t08', LAST, [1.12, 0.5, 0.5]], to: ['p_scope', 0, [1.08, 0.3, 0.5]] },
  { a: 0.416, b: 0.502, hold: 'p_scope', f: 0, cam: [[1.08, 0.3, 0.5], [1.0, 0.42, 0.5]], light: true, edge: false },
  { a: 0.502, b: 0.514, fx: WIPE, from: ['p_scope', 0, [1.0, 0.42, 0.5]], to: ['p_few', 0, [1.1, 0.42, 0.5]] },
  { a: 0.514, b: 0.604, hold: 'p_few', f: 0, cam: [[1.1, 0.42, 0.5], [1.04, 0.36, 0.5]] },
  // Act IV: the questions fly over the strawberry patch
  { a: 0.604, b: 0.624, fx: STIPPLE, from: ['p_few', 0, [1.04, 0.36, 0.5]], to: ['p_asked', 0, [1.15, 0.5, 0.6]] },
  { a: 0.624, b: 0.790, hold: 'p_asked', f: 0, cam: [[1.15, 0.5, 0.6], [1.03, 0.5, 0.45]], light: true, edge: false },
  // Act V: the scholar points the way to the brief, then the coda loop takes over
  { a: 0.790, b: 0.806, fx: CREST, from: ['p_asked', 0, [1.03, 0.5, 0.45]], to: ['p_brief', 0, [1.1, 0.3, 0.6]] },
  { a: 0.806, b: 1.000, hold: 'p_brief', f: 0, cam: [[1.1, 0.3, 0.6], CAM0], camEnd: 0.9 },
];
export const SEQUENCES = ['t01', 't02', 't03', 't04', 't05', 't06', 't07', 't08'];
const PLATES = ['p_scope', 'p_few', 'p_asked', 'p_brief'];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Scroll position to story time. Each segment takes scroll in proportion to its length, except
// a dwelling hold, which takes at least its dwell; WARP_TOTAL is how much longer the stage gets.
const KNOTS = [[0, 0]];
for (const s of TIMELINE) KNOTS.push([KNOTS[KNOTS.length - 1][0] + Math.max(s.b - s.a, s.dwell || 0), s.b]);
export const WARP_TOTAL = KNOTS[KNOTS.length - 1][0];
const lookup = (v, from, to) => {
  for (let i = 1; i < KNOTS.length; i++) {
    const [a0, b0] = [KNOTS[i - 1][from], KNOTS[i][from]];
    if (v <= b0 || i === KNOTS.length - 1) return KNOTS[i - 1][to] + (KNOTS[i][to] - KNOTS[i - 1][to]) * clamp((v - a0) / (b0 - a0 || 1));
  }
  return v;
};
export const warp = (scroll) => lookup(scroll * WARP_TOTAL, 0, 1);
export const unwarp = (p) => lookup(p, 1, 0) / WARP_TOTAL;

// the paper act is retired: the later chapters have plates of their own
const PAPER_IN = [2, 3];
// the coda is the looping film itself, so the canvas never falls to black
const DARK_IN = [2, 3];

const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB;
uniform vec2 uRes, uSizeA, uSizeB;
uniform vec3 uCamA, uCamB;
uniform float uT, uMode, uTime, uPaper, uDark, uPx;
uniform vec2 uFocus;

float h21(vec2 p) { p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.7); a *= 0.5; }
  return s;
}

// cover-fit a plate, then push the camera in around a focus point (focus y measured from the top)
vec2 plateUV(vec2 uv, vec2 size, vec3 cam) {
  float ra = uRes.x / uRes.y, ri = size.x / size.y;
  vec2 span = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0);
  span /= max(cam.x, 1.0);
  vec2 focus = vec2(cam.y, 1.0 - cam.z);
  focus = clamp(focus, span * 0.5, 1.0 - span * 0.5);
  return focus + (uv - 0.5) * span;
}
vec3 plateA(vec2 uv) { return texture2D(uA, plateUV(uv, uSizeA, uCamA)).rgb; }
vec3 plateB(vec2 uv) { return texture2D(uB, plateUV(uv, uSizeB, uCamB)).rgb; }
vec3 plateBz(vec2 uv, float z) { vec3 c = uCamB; c.x *= z; return texture2D(uB, plateUV(uv, uSizeB, c)).rgb; }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// ordered 4x4 threshold built from a nested 2x2 pattern
float bayer2(vec2 a) { a = floor(mod(a, 2.0)); return a.x == a.y ? (a.x * 3.0) / 4.0 : (2.0 - a.y) / 4.0; }
float bayer(vec2 a) { return bayer2(a) + bayer2(floor(a / 2.0)) / 4.0 + 0.0625; }

// 4x4 glyph cells, density rising with darkness; bits read with float math for GLSL ES 1.0
float glyph(vec2 cell, float level) {
  float g = level < 0.2 ? 0.0 : level < 0.4 ? 1056.0 : level < 0.6 ? 23130.0 : level < 0.8 ? 46774.0 : 65535.0;
  vec2 q = floor(cell * 4.0);
  float idx = q.y * 4.0 + q.x;
  return mod(floor(g / pow(2.0, idx)), 2.0);
}

vec3 paper(vec2 uv) {
  float ar = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * ar, uv.y);
  vec3 base = mix(vec3(0.957, 0.925, 0.858), vec3(0.918, 0.851, 0.729), smoothstep(0.1, 1.2, length(uv - vec2(0.45, 0.62)) * 1.4));
  float pulp = fbm(p * 6.0) - 0.5;
  float fibre = vnoise(vec2(p.x * 3.0, p.y * 260.0)) - 0.5;
  float fleck = step(0.996, h21(floor(uv * uRes / 3.0)));
  vec2 sp = p * 1.15 + vec2(uTime * 0.012, -uTime * 0.008);
  float leaf = smoothstep(0.52, 0.72, fbm(sp + fbm(sp * 1.7 + uTime * 0.02)));
  vec3 c = base + pulp * 0.035 + fibre * 0.018;
  c *= 1.0 - leaf * 0.18;
  c = mix(c, vec3(0.42, 0.33, 0.24), fleck * 0.5);
  return c;
}

void main() {
  vec2 uv = vUv;
  float ar = uRes.x / uRes.y;
  float t = uT;
  vec3 col;

  if (t <= 0.0001) {
    col = plateA(uv);
  } else if (uMode < 0.5) {
    // breathe: an iris opens from the centre, the incoming plate exhales out of a point
    float d = length((uv - 0.5) * vec2(ar, 1.0));
    float r = t * t * (0.95 * max(ar, 1.0)) + 0.001;
    float edge = 0.06 + 0.12 * (1.0 - t);
    float m = 1.0 - smoothstep(r - edge, r, d + (fbm(uv * 3.0 + uTime * 0.1) - 0.5) * 0.06);
    vec3 a = plateA((uv - 0.5) / (1.0 + t * 0.35) + 0.5);
    vec3 b = plateBz(uv, 1.0 + (1.0 - t) * 0.45);
    float rim = smoothstep(edge, 0.0, abs(d - r + edge * 0.5)) * (1.0 - t);
    col = mix(a, b, m) + rim * 0.08;
  } else if (uMode < 1.5) {
    // halftone print: dots of the incoming plate grow until they merge, arriving on a cloud front
    float front = fbm(uv * vec2(2.2 * ar, 2.2)) * 0.55 + (1.0 - uv.x) * 0.3 + uv.y * 0.15;
    float lp = clamp(t * 1.9 - front * 0.9, 0.0, 1.0);
    float cellPx = 9.0 * uPx;
    vec2 g = gl_FragCoord.xy / cellPx;
    vec2 f = fract(g) - 0.5;
    vec2 cuv = (floor(g) + 0.5) * cellPx / uRes;
    vec3 b = plateB(uv);
    float ink = 1.0 - luma(plateB(cuv)) * 0.55;
    float rad = lp * 0.78 * (0.55 + ink * 0.6);
    float dotm = 1.0 - smoothstep(rad - 0.06, rad + 0.06, length(f));
    float solid = smoothstep(0.86, 1.0, lp);
    col = mix(plateA(uv), b, max(dotm, solid));
  } else if (uMode < 2.5) {
    // warp wipe: both plates bend through one noise field and the edge rides that field
    float n = fbm(uv * vec2(3.0 * ar, 3.0) + uTime * 0.04);
    float thr = t * 1.3 - 0.15;
    float m = smoothstep(thr - 0.05, thr + 0.05, (1.0 - n) * 0.7 + (1.0 - uv.y) * 0.3);
    float near = 1.0 - smoothstep(0.0, 0.18, abs(((1.0 - n) * 0.7 + (1.0 - uv.y) * 0.3) - thr));
    vec2 w = (vec2(fbm(uv * 4.0 + 3.1), fbm(uv * 4.0 + 7.7)) - 0.5) * 0.08 * near;
    col = mix(plateB(uv + w), plateA(uv - w), m);
  } else if (uMode > 4.5) {
    // stipple: an ordered-dither front grows out of a soft square in the middle of the frame
    vec2 d = abs(uv - 0.5) * vec2(ar, 1.0);
    float front = max(d.x, d.y) * 1.25 + (fbm(uv * 5.0) - 0.5) * 0.25;
    float lp = t * 1.6 - front;
    vec2 cell = floor(gl_FragCoord.xy / (3.0 * uPx));
    float th = bayer(cell);
    float m = step(th, clamp(lp * 3.0, 0.0, 1.0));
    float edge = clamp(1.0 - abs(lp) * 6.0, 0.0, 1.0);
    vec3 a = plateA(uv + vec2((h21(vec2(floor(uv.y * uRes.y / (4.0 * uPx)), 1.0)) - 0.5) * 0.02 * edge, 0.0));
    col = mix(a, plateB(uv), m);
  } else if (uMode > 3.5) {
    // burst: light rays and pixel debris blow out of the focal point, the centre collapses
    // into a dark radial tunnel, then the frame prints itself back in growing dots
    vec2 fp = uFocus;
    vec2 d = (uv - fp) * vec2(ar, 1.0);
    float r = length(d);
    float ang = atan(d.y, d.x);
    float rays = pow(0.5 + 0.5 * sin(ang * 26.0 + fbm(vec2(ang * 2.0, uTime * 0.3)) * 7.0), 6.0);
    float k1 = smoothstep(0.0, 0.3, t) * (1.0 - smoothstep(0.38, 0.55, t));
    vec2 cell = floor(gl_FragCoord.xy / (14.0 * uPx));
    float hb = h21(cell + 0.5);
    float shard = step(hb, k1 * 1.3 * (1.0 - smoothstep(0.0, 0.9, r)));
    vec2 push = (r > 0.0 ? d / r : vec2(0.0)) * k1 * 0.07 * hb;
    vec3 a = plateA(uv - push);
    a = mix(a, vec3(0.93, 0.95, 1.0) * (0.85 + hb * 0.15), shard * 0.75);
    a += rays * k1 * (1.0 - smoothstep(0.0, 0.75, r)) * 0.85;
    float k2 = smoothstep(0.28, 0.52, t) * (1.0 - smoothstep(0.62, 0.82, t));
    float tr = k2 * 1.25;
    float hole = 1.0 - smoothstep(tr - 0.3, tr, r);
    vec3 tunnel = vec3(0.015) + vec3(0.9, 0.92, 1.0) * rays * smoothstep(0.05, 0.6, r) * 0.25;
    col = mix(a, tunnel, hole * smoothstep(0.0, 0.2, k2));
    float lp = smoothstep(0.5, 1.0, t) * 1.3 - r * 0.45;
    float cellPx = 8.0 * uPx;
    vec2 g = gl_FragCoord.xy / cellPx;
    vec2 f = fract(g) - 0.5;
    vec3 b = plateB(uv);
    float ink = 1.0 - luma(plateB((floor(g) + 0.5) * cellPx / uRes)) * 0.5;
    float rad = clamp(lp, 0.0, 1.0) * 0.8 * (0.55 + ink * 0.6);
    float dotm = 1.0 - smoothstep(rad - 0.06, rad + 0.06, length(f));
    col = mix(col, b, max(dotm * step(0.001, lp), smoothstep(0.92, 1.0, lp)));
  } else {
    // glitch crest: a diagonal wave crosses the frame; inside it rows tear, channels part
    // and patches re-render as glyphs before the new plate settles behind it
    float s = (uv.x * ar + (1.0 - uv.y)) / (ar + 1.0);
    float c = mix(-0.25, 1.25, t);
    float w = 0.16;
    float inC = 1.0 - smoothstep(0.0, w, abs(s - c));
    float row = floor(uv.y * uRes.y / (6.0 * uPx));
    float tick = floor(uTime * 14.0);
    float tear = (h21(vec2(row, tick)) - 0.5) * 0.09 * inC * step(0.55, h21(vec2(row * 0.37, tick + 3.0)));
    vec2 tu = uv + vec2(tear, 0.0);
    float behind = step(s, c);
    vec3 a = plateA(tu), b = plateB(tu);
    vec3 base = mix(a, b, behind);
    float split = 0.006 * inC;
    vec3 rgb = vec3(
      mix(plateA(tu + vec2(split, 0.0)), plateB(tu + vec2(split, 0.0)), behind).r,
      base.g,
      mix(plateA(tu - vec2(split, 0.0)), plateB(tu - vec2(split, 0.0)), behind).b);
    float cellPx = 10.0 * uPx;
    vec2 g = gl_FragCoord.xy / cellPx;
    vec2 blk = floor(g / 3.0);
    float patch = step(0.62, h21(blk + tick * 0.13)) * inC;
    float gl = glyph(fract(g), 1.0 - luma(base));
    vec3 glyphCol = mix(vec3(0.96, 0.93, 0.86), vec3(0.76, 0.14, 0.23), gl);
    col = mix(rgb, glyphCol, patch);
  }

  // the paper act: the sheet arrives through a ragged, scorched edge
  if (uPaper > 0.0) {
    float n = fbm(uv * vec2(2.4 * ar, 2.4) + 4.0);
    float lim = uPaper * 1.3 - 0.15;
    float m = smoothstep(lim + 0.04, lim - 0.04, n * 0.8 + (1.0 - uv.y) * 0.2);
    float burn = smoothstep(0.022, 0.0, abs(n * 0.8 + (1.0 - uv.y) * 0.2 - lim)) * (1.0 - uPaper);
    col = mix(col, paper(uv), m);
    col = mix(col, vec3(0.30, 0.17, 0.08), burn * 0.75);
  }

  // the coda: everything falls to press black
  col = mix(col, vec3(0.043, 0.039, 0.035), uDark);

  // film finish: grain and a soft vignette
  float grain = (h21(gl_FragCoord.xy + fract(uTime * 7.0) * 100.0) - 0.5) * 0.04;
  float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(ar * 0.8, 1.0)));
  col = col * mix(0.86, 1.0, vig) + grain;
  gl_FragColor = vec4(col, 1.0);
}`;

class Sequence {
  constructor(name, tier, count = FRAMES) {
    this.name = name;
    this.tier = tier;
    this.count = count;
    this.imgs = new Array(count);
    this.ready = new Uint8Array(count);
  }
  url(i) { return `${BASE}assets/film/${this.name}/${this.tier}/f_${String(i + 1).padStart(3, '0')}.webp`; }
  load(i) {
    if (this.imgs[i]) return Promise.resolve();
    const img = new Image();
    img.decoding = 'async';
    this.imgs[i] = img;
    return new Promise((resolve) => {
      img.onload = () => { this.ready[i] = 1; resolve(); };
      img.onerror = () => resolve();
      img.src = this.url(i);
    });
  }
  // the closest frame that has arrived, so scrubbing never shows a hole
  nearest(i) {
    i = Math.min(i, this.count - 1);
    for (let d = 0; d < this.count; d++) {
      if (i - d >= 0 && this.ready[i - d]) return this.imgs[i - d];
      if (i + d < this.count && this.ready[i + d]) return this.imgs[i + d];
    }
    return null;
  }
}

export class Film {
  constructor(canvas, { small = false } = {}) {
    this.canvas = canvas;
    this.small = small;
    const tier = small ? 'sm' : 'lg';
    this.seqs = new Map(SEQUENCES.map((n) => [n, new Sequence(n, tier)]));
    PLATES.forEach((n) => this.seqs.set(n, new Sequence(n, tier, 1)));
    // a different opening on each visit (?hero=h1 or ?hero=h2 pins one)
    const keys = Object.keys(HEROES);
    const pinned = new URLSearchParams(location.search).get('hero');
    this.hero = keys.includes(pinned) ? pinned : keys[Math.floor(Math.random() * keys.length)];
    this.seqs.set('hero', new Sequence(this.hero, tier, 1));
    this.focus = small ? [0.55, 0.6] : HEROES[this.hero].focus;
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.src = `${BASE}assets/film/${this.hero}${small ? '-sm' : ''}.mp4`;
    this.video = v;
    this.still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.bound = [null, null];
    this.gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (this.gl) this.#initGL(); else this.ctx = canvas.getContext('2d');
    this.resize();
  }

  get ok() { return !!this.gl; }

  #initGL() {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uA', 'uB', 'uRes', 'uSizeA', 'uSizeB', 'uCamA', 'uCamB', 'uT', 'uMode', 'uTime', 'uPaper', 'uDark', 'uPx', 'uFocus'])
      this.u[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(this.u.uA, 0);
    gl.uniform1i(this.u.uB, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.tex = [0, 1].map((unit) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 60, 120, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    });
  }

  // Load the opening frame first, then every clip coarse to fine: every 16th frame, then 8th,
  // 4th, 2nd, 1st. Scrubbing works almost at once and sharpens as the rest arrive.
  load() {
    const queue = [];
    const seen = new Set();
    const push = (n, i) => { const k = `${n}:${i}`; if (!seen.has(k)) { seen.add(k); queue.push([n, i]); } };
    push('hero', 0);
    push('t01', 0);
    for (const step of [16, 8, 4, 2, 1]) {
      for (const n of SEQUENCES) for (let i = 0; i < FRAMES; i += step) push(n, i);
      if (step === 16) PLATES.forEach((n) => push(n, 0));
    }
    for (const n of SEQUENCES) push(n, LAST);
    this.video.load();
    let first;
    const firstReady = new Promise((r) => (first = r));
    const worker = async () => {
      while (queue.length) {
        const [n, i] = queue.shift();
        await this.seqs.get(n).load(i);
        if (n === 'hero') first();
      }
    };
    for (let k = 0; k < (this.small ? 4 : 6); k++) worker();
    return firstReady;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.small ? 1.5 : 1.75);
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.dpr = dpr;
  }

  segment(p) {
    for (const s of TIMELINE) if (p < s.b) return s;
    return TIMELINE[TIMELINE.length - 1];
  }

  // Resolve what is on screen at progress p: frame A (and B during an effect), cameras, mix.
  state(p) {
    const st = this.#state(p);
    if (this.small) { st.camA = this.#phoneCam(st.A[0], st.camA); st.camB = this.#phoneCam(st.B[0], st.camB); }
    return st;
  }

  #phoneCam(name, cam) {
    const fx = SMALL_FOCUS[name === 'hero' ? this.hero : name];
    return fx === undefined ? cam : [cam[0], fx, cam[2]];
  }

  #state(p) {
    const s = this.segment(p);
    const k = seg(p, s.a, s.b);
    if (s.seq) {
      const i = Math.round(smooth(k) * LAST);
      const cam = s.cam0 ? lerp3(s.cam0, CAM0, smooth(Math.min(1, k * 4))) : CAM0;
      return { A: [s.seq, i], B: [s.seq, i], camA: cam, camB: cam, t: 0, mode: 0, light: s.light ? s.light[k < 0.5 ? 0 : 1] : false };
    }
    if (s.hold) {
      const kk = s.camEnd ? seg(p, s.a, s.camEnd) : k;
      const cam = lerp3(s.cam[0], s.cam[1], ease(kk));
      return { A: [s.hold, s.f], B: [s.hold, s.f], camA: cam, camB: cam, t: 0, mode: 0, light: !!s.light, edge: s.edge };
    }
    // effects run on a gentle curve so every phase gets its share of the scroll
    const e = smooth(k);
    return { A: [s.from[0], s.from[1]], B: [s.to[0], s.to[1]], camA: s.from[2], camB: s.to[2], t: e, mode: s.fx, light: false };
  }

  lightAt(p) { return this.state(p).light; }
  // the chapter rail sits on the left edge, which can be darker than the plate as a whole
  edgeLightAt(p) { const st = this.state(p); return st.edge ?? st.light; }

  // the hero plays as video once it can; until then its first frame stands in
  #frame([n, i]) {
    if (n === 'hero' && this.video.readyState >= 2) return this.video;
    return this.seqs.get(n).nearest(i);
  }

  #bind(unit, img) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[unit]);
    if (this.bound[unit] !== img || img instanceof HTMLVideoElement) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      this.bound[unit] = img;
    }
  }

  render(p, time) {
    const st = this.state(p);
    // the loop only runs while the hero is on screen
    const live = st.A[0] === 'hero' && !this.still;
    if (live && this.video.paused) this.video.play().catch(() => {});
    if (!live && !this.video.paused) this.video.pause();
    const A = this.#frame(st.A);
    const B = st.t > 0 ? this.#frame(st.B) : A;
    if (!A || !B) return false;
    const paper = ease(seg(p, PAPER_IN[0], PAPER_IN[1]));
    const dark = ease(seg(p, DARK_IN[0], DARK_IN[1]));

    if (!this.gl) { this.#render2d(A, B, st, paper, dark); return true; }

    const gl = this.gl, u = this.u;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.#bind(0, A);
    this.#bind(1, B);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uSizeA, A.videoWidth || A.naturalWidth, A.videoHeight || A.naturalHeight);
    gl.uniform2f(u.uSizeB, B.videoWidth || B.naturalWidth, B.videoHeight || B.naturalHeight);
    gl.uniform2fv(u.uFocus, this.focus);
    gl.uniform3fv(u.uCamA, st.camA);
    gl.uniform3fv(u.uCamB, st.camB);
    gl.uniform1f(u.uT, st.t);
    gl.uniform1f(u.uMode, st.mode);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uPaper, paper);
    gl.uniform1f(u.uDark, dark);
    gl.uniform1f(u.uPx, this.dpr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }

  #render2d(A, B, st, paper, dark) {
    const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const draw = (img, cam, alpha) => {
      const iw = img.videoWidth || img.naturalWidth, ih = img.videoHeight || img.naturalHeight;
      const s = Math.max(W / iw, H / ih) * cam[0];
      const dw = iw * s, dh = ih * s;
      const x = Math.min(0, Math.max(W - dw, W / 2 - cam[1] * dw));
      const y = Math.min(0, Math.max(H - dh, H / 2 - cam[2] * dh));
      c.globalAlpha = alpha;
      c.drawImage(img, x, y, dw, dh);
    };
    draw(A, st.camA, 1);
    if (st.t > 0) draw(B, st.camB, st.t);
    c.globalAlpha = paper; c.fillStyle = '#f1e8d6'; c.fillRect(0, 0, W, H);
    c.globalAlpha = dark; c.fillStyle = '#0b0a09'; c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
  }
}

export { clamp, seg, ease, lerp };
