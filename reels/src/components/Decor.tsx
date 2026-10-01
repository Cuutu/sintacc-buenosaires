import React from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {colors, fonts, video} from '../brand';

type WaveProps = {
  color: string;
  /** Línea media de la onda en px desde arriba. Todo lo de abajo queda relleno. */
  top: number;
  amplitude?: number;
  /** Cantidad de "lomas" a lo ancho. */
  lobes?: number;
  speed?: number;
  seed?: number;
};

/** Onda orgánica: dos senos superpuestos que se mueven lento. */
export const Wave: React.FC<WaveProps> = ({color, top, amplitude = 38, lobes = 1.3, speed = 0.018, seed = 0}) => {
  const frame = useCurrentFrame();
  const w = video.width;
  const steps = 48;
  const t = frame * speed + seed;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const k = (i / steps) * Math.PI * 2;
    const y =
      top + Math.sin(k * lobes + t) * amplitude + Math.sin(k * lobes * 2.1 - t * 1.4 + 1.7) * amplitude * 0.35;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  d += `L${w} ${video.height + 600} L0 ${video.height + 600} Z`;
  return (
    <svg
      width={w}
      height={video.height}
      viewBox={`0 0 ${w} ${video.height}`}
      style={{position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none'}}
    >
      <path d={d} fill={color} />
    </svg>
  );
};

type CheckerProps = {size?: number; rows?: number; a?: string; b?: string; offset?: number};

/** Franja de damero de marca. */
export const Checker: React.FC<CheckerProps> = ({size = 44, rows = 2, a = colors.verde, b = colors.crema, offset = 0}) => {
  const cols = Math.ceil(video.width / size) + 3;
  const shift = offset % (size * 2);
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={(c - 2) * size + shift}
          y={r * size}
          width={size}
          height={size}
          fill={(r + c) % 2 === 0 ? a : b}
        />,
      );
    }
  }
  return (
    <svg width={video.width} height={rows * size} style={{display: 'block'}}>
      {cells}
    </svg>
  );
};

/** Textura de espigas de la web (.bg-olive-organic: texture-wheat.svg al 7%). */
export const WheatTexture: React.FC<{opacity?: number; size?: number; drift?: number}> = ({
  opacity = 0.07,
  size = 360,
  drift = 0.35,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `url(${staticFile('brand/texture-wheat.svg')})`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${frame * drift}px ${-frame * drift * 0.6}px`,
        opacity,
      }}
    />
  );
};

/** Grano de papel (noise.png del hero de la web). */
export const Grain: React.FC<{opacity?: number; blend?: React.CSSProperties['mixBlendMode']}> = ({
  opacity = 0.05,
  blend = 'multiply',
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage: `url(${staticFile('noise.png')})`,
      backgroundSize: '256px 256px',
      opacity,
      mixBlendMode: blend,
    }}
  />
);

/** Emoji a color: va en su propia fuente, sin itálica. */
export const Emoji: React.FC<{children: string}> = ({children}) => (
  <span style={{fontFamily: fonts.emoji, fontStyle: 'normal', fontWeight: 400}}>{children}</span>
);

const EMOJI_RE = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/u;
export const hasEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s);

/** Separa texto y emojis para que los emojis no salgan en itálica/monocromo. */
export const RichText: React.FC<{text: string}> = ({text}) => (
  <>
    {text.split(EMOJI_RE).map((part, i) =>
      EMOJI_RE.test(part) ? <Emoji key={i}>{part}</Emoji> : <React.Fragment key={i}>{part}</React.Fragment>,
    )}
  </>
);
