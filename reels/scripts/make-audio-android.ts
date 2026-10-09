/**
 * Música lo-fi + efectos del reel "CeliMap llegó a Android" (src/android/).
 * Mismo sintetizador que scripts/make-audio.ts (anuncios): todo sintetizado, sin samples ni temas
 * de terceros. Los tiempos salen de src/android/timing.ts (100 bpm).
 *
 *   npm run audio:android   → public/audio/reel-android.wav
 *
 * Compás 1 gancho (filtro cerrado) · compás 2 llegada, corte + subida · compás 3 se abre el groove
 * (mapa) · compases 5–6 descarga y cierre en tónica.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {BAR, BEAT, FPS, type Cue} from '../src/celiaco/timing';
import {timingAndroid} from '../src/android/timing';

const SR = 44100;
const BEAT_S = BEAT / FPS;
const BAR_S = BAR / FPS;
const TAU = Math.PI * 2;
const sec = (frames: number) => frames / FPS;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/* ───────────── utilidades ───────────── */

/** PRNG determinístico: mismo audio en cada corrida. */
const makeRng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
let rng = makeRng(7);
const noise = () => rng() * 2 - 1;

type Bus = {L: Float32Array; R: Float32Array};
const makeBus = (n: number): Bus => ({L: new Float32Array(n), R: new Float32Array(n)});

/** Mezcla una señal mono en un bus, con paneo (-1..1) y envío opcional a reverb. */
const mix = (bus: Bus, at: number, sig: Float32Array, gain = 1, pan = 0, send?: Float32Array, sendAmt = 0) => {
  const i0 = Math.round(at * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  for (let i = 0; i < sig.length; i++) {
    const j = i0 + i;
    if (j < 0 || j >= bus.L.length) continue;
    bus.L[j] += sig[i] * gl;
    bus.R[j] += sig[i] * gr;
    if (send) send[j] += sig[i] * gain * sendAmt;
  }
};

const render = (dur: number, fn: (t: number, i: number) => number) => {
  const n = Math.max(1, Math.round(dur * SR));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / SR, i);
  return out;
};

/** Pasa-bajos de un polo, in place. */
const onePoleLP = (x: Float32Array, cutoff: number) => {
  const a = Math.exp((-TAU * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y = (1 - a) * x[i] + a * y;
    x[i] = y;
  }
  return x;
};
const onePoleHP = (x: Float32Array, cutoff: number) => {
  const lp = Float32Array.from(x);
  onePoleLP(lp, cutoff);
  for (let i = 0; i < x.length; i++) x[i] -= lp[i];
  return x;
};

/* ───────────── instrumentos ───────────── */

/** Piano eléctrico tipo Rhodes: FM suave + armónico + wow de cinta. */
const ep = (freq: number, hold: number, vel: number) => {
  const ph = rng() * TAU;
  return render(hold + 1.6, (t) => {
    const atk = Math.min(1, t / 0.005);
    const dec = Math.exp(-t / 1.9);
    const rel = t > hold ? Math.exp(-(t - hold) / 0.35) : 1;
    const wow = 1 + 0.0028 * Math.sin(TAU * 0.6 * t + ph);
    const idx = 1.1 * Math.exp(-t / 0.25) + 0.18;
    const f = freq * wow;
    const y = Math.sin(TAU * f * t + idx * Math.sin(TAU * f * t)) + 0.18 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.5);
    return y * atk * dec * rel * vel;
  });
};

const kick = (vel: number) => {
  let phase = 0;
  return render(0.5, (t) => {
    const f = 54 + 95 * Math.exp(-t / 0.028);
    phase += (TAU * f) / SR;
    const body = Math.sin(phase) * Math.exp(-t / 0.2) * 0.85;
    const click = noise() * Math.exp(-t / 0.0025) * 0.35;
    return Math.tanh((body + click) * 1.6) * vel;
  });
};

const snare = (vel: number) => {
  const n = render(0.35, (t) => noise() * Math.exp(-t / 0.11));
  onePoleHP(n, 900);
  onePoleLP(n, 6500);
  const tone = render(0.35, (t) => Math.sin(TAU * 185 * t) * Math.exp(-t / 0.045) * 0.6);
  return n.map((v, i) => (v * 1.4 + tone[i]) * vel);
};

const hat = (vel: number, open = false) => {
  const n = render(open ? 0.3 : 0.08, (t) => noise() * Math.exp(-t / (open ? 0.09 : 0.018)));
  onePoleHP(n, 7000);
  onePoleHP(n, 5000);
  return n.map((v) => v * vel * 1.6);
};

const crash = (vel: number) => {
  const n = render(2.2, (t) => noise() * Math.exp(-t / 0.7));
  onePoleHP(n, 4000);
  onePoleLP(n, 9000);
  return n.map((v) => v * vel);
};

const bass = (freq: number, hold: number, vel: number) =>
  render(hold + 0.12, (t) => {
    const atk = Math.min(1, t / 0.008);
    const rel = t > hold ? Math.exp(-(t - hold) / 0.04) : 1;
    const y = Math.sin(TAU * freq * t) + 0.22 * Math.sin(TAU * 2 * freq * t) + 0.06 * Math.sin(TAU * 3 * freq * t);
    return Math.tanh(y * 1.3) * atk * rel * Math.exp(-t / 2.5) * vel;
  });

/** Marimba suave para la melodía. */
const marimba = (freq: number, vel: number) =>
  render(0.9, (t) => {
    const y = Math.sin(TAU * freq * t) + 0.35 * Math.sin(TAU * 4 * freq * t) * Math.exp(-t / 0.03);
    return y * Math.exp(-t / 0.32) * Math.min(1, t / 0.002) * vel;
  });

/* ───────────── efectos ───────────── */

const sfx: Record<Cue['kind'], (c: Cue) => {sig: Float32Array; offset: number; pan: number; send: number}> = {
  boom: () => {
    let ph = 0;
    const sig = render(1.1, (t) => {
      ph += (TAU * (32 + 40 * Math.exp(-t / 0.08))) / SR;
      return Math.sin(ph) * Math.exp(-t / 0.45) + noise() * Math.exp(-t / 0.03) * 0.25;
    });
    return {sig: sig.map((v) => Math.tanh(v * 1.4)), offset: 0, pan: 0, send: 0.15};
  },
  whoosh: () => {
    const d = 0.5;
    const n = render(d, () => noise());
    // Filtro que abre y cierra + envolvente campana.
    let y = 0;
    for (let i = 0; i < n.length; i++) {
      const t = i / SR / d;
      const env = Math.sin(Math.PI * t) ** 2;
      const fc = 300 + 5000 * env;
      const a = Math.exp((-TAU * fc) / SR);
      y = (1 - a) * n[i] + a * y;
      n[i] = y * env * 1.2;
    }
    return {sig: n, offset: -d * 0.55, pan: 0, send: 0.3};
  },
  riser: () => {
    const d = 2 * BEAT_S;
    let ph = 0;
    const n = render(d, (t) => {
      const p = t / d;
      ph += (TAU * (180 + 1100 * p * p)) / SR;
      return (noise() * 0.5 + Math.sin(ph) * 0.35) * p * p * p;
    });
    onePoleHP(n, 400);
    return {sig: n, offset: 0, pan: 0, send: 0.4};
  },
  pop: (c) => {
    const f0 = 520 * Math.pow(2, (c.n ?? 0) / 12);
    let ph = 0;
    const sig = render(0.12, (t) => {
      ph += (TAU * f0 * (1 + 1.3 * Math.min(1, t / 0.03))) / SR;
      return Math.sin(ph) * Math.exp(-t / 0.035) * Math.min(1, t / 0.002);
    });
    return {sig, offset: 0, pan: -0.15, send: 0.25};
  },
  send: () => {
    let ph = 0;
    const sig = render(0.16, (t) => {
      ph += (TAU * (760 + 900 * Math.min(1, t / 0.05))) / SR;
      return Math.sin(ph) * Math.exp(-t / 0.05) * Math.min(1, t / 0.002) * 0.9;
    });
    return {sig, offset: 0, pan: 0.2, send: 0.25};
  },
  plink: (c) => {
    // Pentatónica de Do: los pines "tocan" una escala ascendente.
    const scale = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98];
    const f = mtof(scale[(c.n ?? 0) % scale.length]);
    const sig = render(0.6, (t) => {
      const y = Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 3 * f * t) * Math.exp(-t / 0.04);
      return y * Math.exp(-t / 0.22) * Math.min(1, t / 0.001);
    });
    return {sig, offset: 0, pan: ((c.n ?? 0) % 2 ? 0.35 : -0.35), send: 0.35};
  },
  tap: () => {
    const sig = render(0.06, (t) => {
      const click = noise() * Math.exp(-t / 0.0012) * 0.6;
      const body = Math.sin(TAU * 1500 * t) * Math.exp(-t / 0.006) * 0.4 + Math.sin(TAU * 140 * t) * Math.exp(-t / 0.015) * 0.6;
      return click + body;
    });
    return {sig, offset: 0, pan: 0, send: 0.1};
  },
  ding: () => {
    const notes = [mtof(84), mtof(91)];
    const sig = render(1.6, (t) => {
      let y = 0;
      notes.forEach((f, k) => {
        const tt = t - k * 0.07;
        if (tt < 0) return;
        y += (Math.sin(TAU * f * tt) + 0.4 * Math.sin(TAU * 2.76 * f * tt) * Math.exp(-tt / 0.15)) * Math.exp(-tt / 0.6);
      });
      return y * 0.5;
    });
    return {sig, offset: 0, pan: 0.1, send: 0.5};
  },
  type: () => {
    const f = 2400 + rng() * 1600;
    const sig = render(0.03, (t) => (noise() * 0.5 + Math.sin(TAU * f * t)) * Math.exp(-t / 0.004));
    return {sig, offset: 0, pan: (rng() - 0.5) * 0.4, send: 0.05};
  },
  sparkle: () => {
    const notes = [88, 91, 93, 96, 98, 100];
    const sig = render(1.4, (t) => {
      let y = 0;
      notes.forEach((m, k) => {
        const tt = t - k * 0.045;
        if (tt < 0) return;
        y += Math.sin(TAU * mtof(m) * tt) * Math.exp(-tt / 0.3);
      });
      return y * 0.32;
    });
    return {sig, offset: 0, pan: 0, send: 0.6};
  },
};

/* ───────────── reverb (Schroeder) ───────────── */

const reverb = (send: Float32Array, out: Bus, wet: number) => {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356];
  const tmp = new Float32Array(send.length);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let k = 0;
    let lp = 0;
    for (let i = 0; i < send.length; i++) {
      const y = buf[k];
      lp = y * 0.6 + lp * 0.4;
      buf[k] = send[i] + lp * 0.8;
      tmp[i] += y;
      k = (k + 1) % d;
    }
  }
  const allpass = (x: Float32Array, d: number) => {
    const buf = new Float32Array(d);
    let k = 0;
    for (let i = 0; i < x.length; i++) {
      const b = buf[k];
      const y = -x[i] + b;
      buf[k] = x[i] + b * 0.5;
      x[i] = y;
      k = (k + 1) % d;
    }
  };
  allpass(tmp, 225);
  allpass(tmp, 556);
  const sp = 23; // leve diferencia L/R
  for (let i = 0; i < tmp.length; i++) {
    out.L[i] += tmp[i] * wet * 0.16;
    if (i + sp < tmp.length) out.R[i + sp] += tmp[i] * wet * 0.16;
  }
};

/** Pasa-bajos biquad con frecuencia de corte automatizada, in place sobre un bus. */
const sweepLP = (bus: Bus, cutoffAt: (t: number) => number, q = 0.85) => {
  for (const ch of [bus.L, bus.R]) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
    for (let i = 0; i < ch.length; i++) {
      if (i % 64 === 0) {
        const fc = Math.min(18000, cutoffAt(i / SR));
        const w = (TAU * fc) / SR;
        const alpha = Math.sin(w) / (2 * q);
        const cw = Math.cos(w);
        const a0 = 1 + alpha;
        b0 = (1 - cw) / 2 / a0;
        b1 = (1 - cw) / a0;
        b2 = b0;
        a1 = (-2 * cw) / a0;
        a2 = (1 - alpha) / a0;
      }
      const x = ch[i];
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      ch[i] = y;
    }
  }
};

/* ───────────── arreglo ───────────── */

type Chord = {name: string; root: number; voicing: number[]; mel: number[]};
const CHORDS: Record<string, Chord> = {
  Dm9: {name: 'Dm9', root: 38, voicing: [53, 57, 60, 64], mel: [69, 72, 74, 76]},
  G13: {name: 'G13', root: 43, voicing: [53, 57, 59, 64], mel: [71, 74, 76, 79]},
  Cmaj9: {name: 'Cmaj9', root: 36, voicing: [52, 55, 59, 62], mel: [76, 79, 83, 84]},
  Am9: {name: 'Am9', root: 45, voicing: [55, 59, 60, 64], mel: [72, 76, 79, 81]},
};
const CYCLE = ['Dm9', 'G13', 'Cmaj9', 'Am9'];

const build = () => {
  rng = makeRng(31);
  const T = timingAndroid();
  const dur = sec(T.total);
  const n = Math.round((dur + 0.05) * SR);
  const music = makeBus(n);
  const fx = makeBus(n);
  const send = new Float32Array(n); // reverb de la música (pasa por el filtro)
  const fxSend = new Float32Array(n); // reverb de los efectos
  const drop = sec(T.music.drop);
  const riser = sec(T.music.riser);
  const bars = Math.ceil(T.total / BAR);
  const lastBar = Math.floor((T.total - 1) / BAR);
  const kicks: number[] = [];

  const chordFor = (b: number) => {
    if (b === lastBar) return CHORDS.Cmaj9;
    if (b === lastBar - 1) return CHORDS.G13;
    return CHORDS[CYCLE[b % 4]];
  };

  for (let b = 0; b < bars; b++) {
    const t0 = b * BAR_S;
    const ch = chordFor(b);
    const full = t0 >= drop - 1e-6;
    const isLast = b === lastBar;
    const at = (beats: number) => t0 + beats * BEAT_S;
    const swing = (beats: number) => at(beats) + ((beats * 4) % 2 === 1 ? 0.035 : 0); // semicorcheas con swing

    // —— Piano eléctrico: acorde en el 1 y "anticipo" en el 2 y medio ——
    const comp: [number, number, number][] = isLast
      ? [[0, 4, 0.9]]
      : [
          [0, 1.4, 0.75],
          [2.5, 1.3, 0.55],
        ];
    for (const [beatPos, hold, vel] of comp) {
      ch.voicing.forEach((m, k) => {
        const strum = k * 0.012;
        mix(music, at(beatPos) + strum, ep(mtof(m), hold * BEAT_S, vel * (full ? 0.24 : 0.2)), 1, (k - 1.5) * 0.25, send, 0.35);
      });
    }

    // —— Bajo ——
    const bassPat: [number, number, number][] = isLast
      ? [[0, 3, 0]]
      : full
        ? [
            [0, 1.2, 0],
            [1.75, 0.5, 0],
            [2.5, 0.9, 7],
            [3.5, 0.35, 12],
          ]
        : [
            [0, 2.2, 0],
            [2.5, 1.2, 0],
          ];
    for (const [beatPos, hold, interval] of bassPat) {
      mix(music, at(beatPos), bass(mtof(ch.root + interval), hold * BEAT_S, full ? 0.42 : 0.3), 1, 0);
    }

    // —— Batería ——
    const inBreak = (t: number) => t >= riser && t < drop; // 2 beats sin batería antes del mapa
    const addKick = (t: number, vel: number) => {
      if (inBreak(t)) return;
      mix(music, t, kick(vel), 1, 0);
      kicks.push(t);
    };
    if (isLast) {
      addKick(at(0), 0.95);
      mix(music, at(0), crash(0.18), 1, 0.1, send, 0.3);
      for (let h = 0; h < 8; h++) mix(music, swing(h / 2), hat(0.12 * (1 - h / 10)), 1, 0.25);
      continue;
    }
    if (full) {
      addKick(at(0), 0.95);
      addKick(at(1.75), 0.55);
      addKick(at(2.5), 0.85);
      if (b % 2 === 1) addKick(at(3.75), 0.5);
      for (const s of [1, 3]) if (!inBreak(at(s))) mix(music, at(s), snare(0.42), 1, -0.05, send, 0.45);
      for (let h = 0; h < 16; h++) {
        const t = swing(h / 4);
        if (inBreak(t)) continue;
        const acc = h % 4 === 2 ? 0.2 : h % 2 === 0 ? 0.14 : 0.08;
        mix(music, t, hat(acc, h === 14 && b % 2 === 1), 1, 0.25);
      }
    } else {
      addKick(at(0), b === 0 ? 1 : 0.7);
      addKick(at(2.5), 0.55);
      for (const s of [1, 3]) if (!inBreak(at(s))) mix(music, at(s), snare(0.22), 1, -0.05, send, 0.5);
      for (let h = 0; h < 8; h++) {
        const t = swing(h / 2);
        if (!inBreak(t)) mix(music, t, hat(h % 2 ? 0.07 : 0.11), 1, 0.25);
      }
    }

    // —— Melodía de marimba (solo con el groove completo) ——
    if (full) {
      const m = ch.mel;
      const phrase: [number, number][] =
        b % 2 === 0
          ? [
              [0.5, m[2]],
              [1, m[3]],
              [1.75, m[2]],
              [2.5, m[1]],
              [3.25, m[0]],
            ]
          : [
              [0, m[1]],
              [0.75, m[2]],
              [1.5, m[3]],
              [3, m[2]],
            ];
      for (const [bp, note] of phrase) mix(music, at(bp), marimba(mtof(note), 0.22), 1, 0.3, send, 0.4);
    }
  }

  // —— Vinilo: crujidos y soplido ——
  const hiss = render(dur, () => noise() * 0.006);
  onePoleLP(hiss, 3500);
  mix(music, 0, hiss, 1, 0);
  for (let t = 0; t < dur; t += 0.05 + rng() * 0.25) {
    const amp = 0.02 + rng() * 0.05;
    mix(music, t, render(0.004, (tt) => noise() * Math.exp(-tt / 0.0008) * amp), 1, rng() * 2 - 1);
  }

  // —— Filtro: apagado en el problema, se abre en el mapa ——
  reverb(send, music, 1);
  const CLOSED = 1600;
  const OPEN = 9000;
  sweepLP(music, (t) => {
    if (t < riser) return CLOSED;
    if (t < drop) return CLOSED * Math.pow(OPEN / CLOSED, (t - riser) / (drop - riser));
    return OPEN;
  });

  // —— Sidechain: la música "respira" con el bombo ——
  kicks.sort((a, b) => a - b);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    while (k + 1 < kicks.length && kicks[k + 1] <= t) k++;
    const dt = kicks.length && t >= kicks[k] ? t - kicks[k] : 10;
    const g = 1 - 0.35 * Math.exp(-dt / 0.11);
    music.L[i] *= g;
    music.R[i] *= g;
  }

  // —— Efectos ——
  for (const c of T.cues) {
    const s = sfx[c.kind](c);
    mix(fx, sec(c.f) + s.offset, s.sig, (c.gain ?? 1) * 0.5, s.pan, fxSend, s.send);
  }

  // —— Mezcla final ——
  // Corte de graves por debajo de ~35 Hz (los celulares no los reproducen y se comen el headroom).
  for (const ch of [music.L, music.R, fx.L, fx.R]) onePoleHP(ch, 35);
  const out = makeBus(n);
  reverb(fxSend, out, 1);
  for (let i = 0; i < n; i++) {
    out.L[i] += music.L[i] * 0.85 + fx.L[i];
    out.R[i] += music.R[i] * 0.85 + fx.R[i];
  }
  let peak = 0;
  for (let i = 0; i < n; i++) {
    out.L[i] = Math.tanh(out.L[i] * 1.2);
    out.R[i] = Math.tanh(out.R[i] * 1.2);
    peak = Math.max(peak, Math.abs(out.L[i]), Math.abs(out.R[i]));
  }
  // Pico en 0.6 ≈ -14 LUFS, el nivel que esperan Instagram/Meta (más fuerte lo bajan igual).
  const norm = 0.6 / peak;
  const fadeN = Math.round(0.3 * SR);
  for (let i = 0; i < n; i++) {
    const fade = i > n - fadeN ? (n - i) / fadeN : 1;
    out.L[i] *= norm * fade;
    out.R[i] *= norm * fade;
  }
  return out;
};

const wav = (bus: Bus) => {
  const n = bus.L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, bus.L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, bus.R[i])) * 32767), 46 + i * 4);
  }
  return buf;
};

const dir = join(__dirname, '..', 'public', 'audio');
mkdirSync(dir, {recursive: true});
const file = join(dir, 'reel-android.wav');
writeFileSync(file, wav(build()));
console.log(`✓ ${file} (${(timingAndroid().total / FPS).toFixed(1)}s)`);
