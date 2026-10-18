/**
 * Tiny synthesized-audio engine for interactive sound. All sound is generated
 * at runtime with the Web Audio API - no audio files.
 *
 * Sound is ARMED by default: with no stored preference the toggle reads "on".
 * That does not mean anything plays on load - browsers refuse to start an
 * AudioContext before a user gesture, so `armResume` waits for the first
 * pointerdown/keydown and resumes the context then. An explicit opt-out is
 * remembered in localStorage.
 */

type Listener = () => void;

const STORAGE_KEY = "omni-sound";
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33]; // C major-ish

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true; // armed until storage says otherwise
let initialized = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l());
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/**
 * Browsers will not let an AudioContext make noise until the user has
 * interacted with the page, so "on by default" can only mean "armed". This
 * resumes the context on the first real gesture, once.
 */
function armResume() {
  if (typeof window === "undefined") return;
  const onGesture = () => {
    if (enabled) ensureCtx();
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  };
  window.addEventListener("pointerdown", onGesture, { once: true });
  window.addEventListener("keydown", onGesture, { once: true });
}

export const audioEngine = {
  /** Read the persisted preference once (does not create an AudioContext). */
  init() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    // Default on: only an explicit stored "0" disables.
    enabled = window.localStorage.getItem(STORAGE_KEY) !== "0";
    armResume();
    emit();
  },
  isEnabled: () => enabled,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setEnabled(v: boolean) {
    enabled = v;
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    if (v) {
      ensureCtx();
      this.pluck(SCALE[3], 0.5); // little confirmation note
    }
    emit();
  },

  /** Soft plucked note - three detuned partials + a short feedback shimmer. */
  pluck(freq: number, intensity = 0.5) {
    if (!enabled) return;
    const c = ensureCtx();
    if (!c || !master) return;
    const now = c.currentTime;

    const voice = c.createGain();
    const peak = 0.1 + intensity * 0.14;
    voice.gain.setValueAtTime(0.0001, now);
    voice.gain.linearRampToValueAtTime(peak, now + 0.012);
    voice.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
    voice.connect(master);

    ([
      [freq, 0.6, "sine"],
      [freq * 2, 0.24, "sine"],
      [freq * 3, 0.1, "triangle"],
    ] as const).forEach(([f, g, type]) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(voice);
      o.start(now);
      o.stop(now + 1.35);
    });

    const delay = c.createDelay(1.0);
    delay.delayTime.value = 0.17;
    const fb = c.createGain();
    fb.gain.value = 0.24;
    voice.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(master);
  },

  /** Pick a scale note by index (wraps) - used by the footer strings. */
  pluckNote(index: number, intensity = 0.5) {
    const octave = index >= SCALE.length ? 2 : 1;
    this.pluck(SCALE[index % SCALE.length] * octave, intensity);
  },

  /** Short bright blip for the hero symbol hover. */
  hover() {
    if (!enabled) return;
    const c = ensureCtx();
    if (!c || !master) return;
    const now = c.currentTime;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(880, now);
    o.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + 0.2);
  },

  /** Low filtered noise burst for the hero blast. */
  blast() {
    if (!enabled) return;
    const c = ensureCtx();
    if (!c || !master) return;
    const now = c.currentTime;
    const dur = 0.7;
    const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + dur);
  },
};
