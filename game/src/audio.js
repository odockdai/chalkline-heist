// Every sound is made here with WebAudio, no files: footsteps, the rattle, the lock, a heartbeat
// that quickens with suspicion, the camera chirp, the alarm siren, and a low bass line underneath.

let ctx = null;
let master = null;
let muted = false;
let heartT = 0;
let bassT = 0;
let bassStep = 0;
let sirenT = 0;

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  ctx = new Context();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, duration, { type = 'sine', gain = 0.2, slide = 0, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + duration);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function noise(duration, { gain = 0.15, filter = 1200, q = 1, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 12345;
  for (let index = 0; index < frames; index += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[index] = (seed / 0x7fffffff) * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = filter;
  band.Q.value = q;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(band).connect(amp).connect(master);
  source.start(t);
}

const SOUNDS = {
  step: () => noise(0.05, { gain: 0.06, filter: 500, q: 2 }),
  throw: () => noise(0.12, { gain: 0.05, filter: 2500 }),
  rattle: () => {
    for (let k = 0; k < 4; k += 1) tone(1400 + k * 230, 0.06, { type: 'square', gain: 0.05, delay: k * 0.05 });
  },
  smoke: () => noise(0.7, { gain: 0.12, filter: 700, q: 0.6 }),
  jam: () => tone(220, 0.35, { type: 'sawtooth', gain: 0.07, slide: -150 }),
  fuse: () => {
    noise(0.25, { gain: 0.2, filter: 300 });
    tone(110, 0.5, { type: 'square', gain: 0.08, slide: -60 });
  },
  work: () => tone(1800 + Math.random() * 300, 0.03, { type: 'triangle', gain: 0.04 }),
  unlock: () => {
    tone(900, 0.06, { type: 'square', gain: 0.07 });
    tone(1350, 0.08, { type: 'square', gain: 0.07, delay: 0.07 });
  },
  coin: () => {
    tone(988, 0.08, { type: 'triangle', gain: 0.1 });
    tone(1319, 0.14, { type: 'triangle', gain: 0.1, delay: 0.07 });
  },
  grab: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.18, { type: 'triangle', gain: 0.12, delay: k * 0.07 })),
  huh: () => tone(440, 0.18, { type: 'sine', gain: 0.08, slide: 220 }),
  camera: () => {
    tone(1760, 0.07, { type: 'square', gain: 0.06 });
    tone(1760, 0.07, { type: 'square', gain: 0.06, delay: 0.12 });
  },
  spotted: () => {
    tone(196, 0.35, { type: 'sawtooth', gain: 0.14 });
    tone(207, 0.35, { type: 'sawtooth', gain: 0.12 });
  },
  lost: () => tone(330, 0.3, { type: 'sine', gain: 0.07, slide: -120 }),
  tier: () => tone(587, 0.4, { type: 'square', gain: 0.07, slide: 300 }),
  lockdown: () => [0, 0.3, 0.6].forEach((d) => tone(660, 0.25, { type: 'square', gain: 0.1, slide: 220, delay: d })),
  caught: () => {
    tone(392, 0.25, { type: 'sawtooth', gain: 0.14 });
    tone(311, 0.25, { type: 'sawtooth', gain: 0.14, delay: 0.25 });
    tone(196, 0.7, { type: 'sawtooth', gain: 0.14, delay: 0.5 });
  },
  escape: () => [392, 523, 659, 784, 1047].forEach((f, k) => tone(f, 0.25, { type: 'triangle', gain: 0.12, delay: k * 0.09 })),
  deny: () => tone(150, 0.12, { type: 'square', gain: 0.06 }),
  click: () => tone(1200, 0.03, { type: 'square', gain: 0.04 }),
};

/** Play the sound for each game event this frame (each name at most once). */
export function playEvents(events) {
  if (!ctx || muted) return;
  const done = new Set();
  for (const name of events) {
    if (done.has(name)) continue;
    done.add(name);
    SOUNDS[name]?.();
  }
}

export function playSound(name) {
  if (ctx && !muted) SOUNDS[name]?.();
}

/** The ambient bed: a bass walk always, a heartbeat that quickens with suspicion, a siren in lockdown. */
export function stepAmbience(dt, suspicion, lockdown) {
  if (!ctx || muted) return;
  bassT -= dt;
  if (bassT <= 0) {
    const line = [55, 55, 65.4, 49];
    tone(line[bassStep % line.length], 0.5, { type: 'triangle', gain: 0.06 });
    bassStep += 1;
    bassT = 0.75;
  }
  if (suspicion > 0.12) {
    heartT -= dt;
    if (heartT <= 0) {
      tone(62, 0.12, { type: 'sine', gain: 0.18 });
      tone(55, 0.12, { type: 'sine', gain: 0.14, delay: 0.16 });
      heartT = 1.1 - suspicion * 0.7;
    }
  }
  if (lockdown) {
    sirenT -= dt;
    if (sirenT <= 0) {
      tone(700, 0.45, { type: 'sawtooth', gain: 0.05, slide: 300 });
      tone(1000, 0.45, { type: 'sawtooth', gain: 0.05, slide: -300, delay: 0.45 });
      sirenT = 0.9;
    }
  }
}
