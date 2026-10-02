/** Ayudas de ritmo: golpe de cámara y "latido" en cada beat. Frames absolutos. */
import {BEAT} from './timing';

/** 1 + golpe que decae en ~10 frames después de cada hit. */
export const punchAt = (frame: number, hits: number[], amount = 0.035) => {
  let v = 0;
  for (const h of hits) {
    const d = frame - h;
    if (d >= 0 && d < 16) v = Math.max(v, Math.exp(-d / 3.5));
  }
  return 1 + v * amount;
};

/** 0..1: pico en cada beat (desde `from`), decae rápido. */
export const beatPulse = (frame: number, from = 0) => {
  if (frame < from) return 0;
  const d = (frame - from) % BEAT;
  return Math.exp(-d / 3);
};

/** Pseudoaleatorio determinístico (mismo resultado en cada render). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
