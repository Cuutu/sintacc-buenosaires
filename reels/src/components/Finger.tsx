import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {easeInOut, easeOut} from '../brand';

export type FingerKey = {f: number; x: number; y: number};

/** Posición del dedo interpolando entre keyframes con ease in-out. */
const positionAt = (frame: number, keys: FingerKey[]) => {
  if (frame <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame <= b.f) {
      const t = interpolate(frame, [a.f, b.f], [0, 1], {easing: easeInOut});
      return {f: frame, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
    }
  }
  return keys[keys.length - 1];
};

type FingerProps = {
  keys: FingerKey[];
  taps: number[];
  appear: number;
  disappear: number;
};

/** Toque de dedo: círculo semitransparente con onda al tocar. Coordenadas en px lógicos. */
export const Finger: React.FC<FingerProps> = ({keys, taps, appear, disappear}) => {
  const frame = useCurrentFrame();
  const {x, y} = positionAt(frame, keys);
  const opacity =
    interpolate(frame, [appear, appear + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
    interpolate(frame, [disappear, disappear + 6], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  let press = 1;
  let ripple: React.ReactNode = null;
  for (const t of taps) {
    const d = frame - t;
    if (d >= -3 && d <= 5) {
      press = interpolate(d, [-3, 0, 5], [1, 0.78, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    }
    if (d >= 0 && d <= 14) {
      const p = interpolate(d, [0, 14], [0, 1], {easing: easeOut});
      ripple = (
        <div
          style={{
            position: 'absolute',
            left: x - 22 - p * 22,
            top: y - 22 - p * 22,
            width: 44 + p * 44,
            height: 44 + p * 44,
            borderRadius: '50%',
            border: '2px solid rgba(31,77,53,0.55)',
            opacity: (1 - p) * opacity,
          }}
        />
      );
    }
  }

  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20}}>
      {ripple}
      <div
        style={{
          position: 'absolute',
          left: x - 22,
          top: y - 22,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(31,77,53,0.32)',
          border: '2px solid rgba(255,255,255,0.85)',
          boxShadow: '0 6px 16px rgba(31,77,53,0.3)',
          transform: `scale(${press})`,
          opacity,
        }}
      />
    </div>
  );
};
