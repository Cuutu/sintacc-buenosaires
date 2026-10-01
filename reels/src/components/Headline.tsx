import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, colors, easeInOut, easeOut, fonts} from '../brand';
import type {Linea} from '../copy';
import {Emoji, hasEmoji} from './Decor';

type Props = {
  lines: readonly Linea[];
  /** Frame en el que entra la primera palabra. */
  start: number;
  stagger?: number;
  /** Tamaño de las líneas sans (Nunito ExtraBold) y serif (Fraunces itálica). */
  sans: number;
  serif: number;
  color?: string;
  serifColor?: string;
  underlineColor?: string;
  align?: 'left' | 'center';
  /** 0 → 1: las palabras salen hacia arriba. */
  exit?: number;
};

/** Titular editorial: cada palabra sube desde atrás de una máscara, con spring sin rebote. */
export const Headline: React.FC<Props> = ({
  lines,
  start,
  stagger = 3,
  sans,
  serif,
  color = colors.crema,
  serifColor,
  underlineColor = colors.cta,
  align = 'left',
  exit = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let index = 0;

  const word = (w: string, key: number, size: number) => {
    const i = index++;
    const p = spring({frame: frame - start - i * stagger, fps, config: {damping: 200, mass: 0.55}});
    const out = interpolate(exit, [0, 1], [0, 1], {...clamp, easing: easeInOut});
    return (
      <span
        key={key}
        style={{
          display: 'inline-block',
          overflow: 'hidden',
          padding: `${size * 0.08}px ${size * 0.1}px ${size * 0.16}px`,
          margin: `${-size * 0.08}px ${-size * 0.1}px ${-size * 0.16}px`,
          verticalAlign: 'bottom',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: `translateY(${(1 - p) * 115 - out * 115}%)`,
            opacity: Math.min(1, p * 1.6) * (1 - out * 0.4),
          }}
        >
          {hasEmoji(w) ? <Emoji>{w}</Emoji> : w}
        </span>
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        textAlign: align,
      }}
    >
      {lines.map((line, li) => {
        const isSerif = line.f === 'serif';
        const size = isSerif ? serif : sans;
        const words = line.t.split(' ');
        const textWords = words.filter((w) => !hasEmoji(w));
        const emojiWords = words.filter((w) => hasEmoji(w));
        const lineStart = start + index * stagger;
        const ul = interpolate(frame, [lineStart + 10, lineStart + 26], [0, 1], {...clamp, easing: easeOut});
        const style: React.CSSProperties = isSerif
          ? {
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: size,
              lineHeight: 1.08,
              letterSpacing: '-0.012em',
              color: serifColor ?? color,
            }
          : {
              fontFamily: fonts.sans,
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.02,
              letterSpacing: '-0.028em',
              color,
            };
        const gap = size * 0.24;
        return (
          <div key={li} style={{...style, display: 'flex', whiteSpace: 'nowrap', columnGap: gap, alignItems: 'baseline'}}>
            <span style={{position: 'relative', display: 'inline-flex', columnGap: gap}}>
              {textWords.map((w, wi) => word(w, wi, size))}
              {line.subrayado ? (
                <svg
                  viewBox="0 0 300 20"
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    left: '-2%',
                    width: '104%',
                    bottom: -size * 0.06,
                    height: size * 0.2,
                    overflow: 'visible',
                  }}
                >
                  <path
                    d="M4 13 C 70 5, 160 17, 296 7"
                    fill="none"
                    stroke={underlineColor}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - ul}
                    opacity={1 - interpolate(exit, [0, 0.5], [0, 1], clamp)}
                    style={{strokeWidth: size * 0.075}}
                  />
                </svg>
              ) : null}
            </span>
            {emojiWords.map((w, wi) => word(w, 100 + wi, size))}
          </div>
        );
      })}
    </div>
  );
};
