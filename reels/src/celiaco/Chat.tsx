/**
 * Chat ilustrado (no es una app real): ventana crema con encabezado y burbujas que
 * aparecen al ritmo. Antes de cada mensaje de "otro" se ve el "escribiendo…".
 * Medidas en px del video.
 */
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ChevronLeft} from 'lucide-react';
import {clamp, colors, easeOut, fonts} from '../brand';
import {Emoji, RichText} from '../components/Decor';
import type {Mensaje} from './copy';

type Props = {
  titulo: string;
  subtitulo: string;
  avatar: string;
  mensajes: Mensaje[];
  /** Frame en que aparece cada mensaje (mismo largo que mensajes). */
  tiempos: number[];
  /** Frame en que arranca el "escribiendo…" de cada mensaje (null = sin indicador). */
  typing: (number | null)[];
  width: number;
};

export const Chat: React.FC<Props> = ({titulo, subtitulo, avatar, mensajes, tiempos, typing, width}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div
      style={{
        width,
        borderRadius: 48,
        background: colors.card,
        boxShadow: '0 60px 90px -50px rgba(0,0,0,0.6), 0 2px 0 rgba(255,255,255,0.6) inset',
        overflow: 'hidden',
        fontFamily: fonts.sans,
        color: colors.verde,
      }}
    >
      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '26px 30px 22px 18px',
          borderBottom: `2px solid ${colors.borde}`,
          background: '#FBF8F2',
        }}
      >
        <ChevronLeft size={44} color={colors.oliveMuted} strokeWidth={2.2} />
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 999,
            background: '#E9E1D3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            flexShrink: 0,
          }}
        >
          <Emoji>{avatar}</Emoji>
        </div>
        <div style={{minWidth: 0}}>
          <div style={{fontSize: 36, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap'}}>
            <RichText text={titulo} />
          </div>
          <div style={{fontSize: 25, fontWeight: 600, color: colors.muted, marginTop: 2}}>{subtitulo}</div>
        </div>
      </div>

      {/* Mensajes */}
      <div style={{padding: '30px 30px 34px', display: 'flex', flexDirection: 'column', gap: 18, background: colors.card}}>
        {mensajes.map((m, i) => {
          const t = tiempos[i];
          const yo = m.de === 'yo';
          const typingStart = typing[i];
          const showTyping = typingStart !== null && frame >= typingStart && frame < t;
          const p = spring({frame: frame - t, fps, config: {damping: 11, mass: 0.55}});
          const visible = frame >= t;
          const prevAuthor = i > 0 ? mensajes[i - 1].autor : undefined;
          const showAuthor = m.autor && m.autor !== prevAuthor;

          if (!visible && !showTyping) {
            // Reserva el lugar para que el chat no "salte" cuando aparece cada mensaje.
            return <Bubble key={i} m={m} showAuthor={!!showAuthor} hidden />;
          }
          if (showTyping) {
            const tp = interpolate(frame, [typingStart!, typingStart! + 5], [0, 1], {...clamp, easing: easeOut});
            return (
              <div key={i} style={{position: 'relative'}}>
                <Bubble m={m} showAuthor={!!showAuthor} hidden />
                <div style={{position: 'absolute', left: 0, top: showAuthor ? 34 : 0, opacity: tp, transform: `scale(${0.7 + 0.3 * tp})`, transformOrigin: 'bottom left'}}>
                  <TypingDots frame={frame} />
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              style={{
                transform: `scale(${0.5 + 0.5 * p}) translateY(${(1 - p) * 30}px) rotate(${(1 - p) * (yo ? 4 : -4)}deg)`,
                transformOrigin: yo ? 'bottom right' : 'bottom left',
                opacity: Math.min(1, p * 2),
              }}
            >
              <Bubble m={m} showAuthor={!!showAuthor} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Bubble: React.FC<{m: Mensaje; showAuthor: boolean; hidden?: boolean}> = ({m, showAuthor, hidden}) => {
  const yo = m.de === 'yo';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: yo ? 'flex-end' : 'flex-start',
        visibility: hidden ? 'hidden' : 'visible',
      }}
    >
      {showAuthor ? (
        <div style={{fontSize: 24, fontWeight: 800, color: colors.cta, margin: '0 0 6px 18px'}}>{m.autor}</div>
      ) : null}
      <div
        style={{
          maxWidth: '82%',
          fontSize: 37,
          fontWeight: 600,
          lineHeight: 1.25,
          padding: '20px 30px 22px',
          borderRadius: 36,
          borderBottomRightRadius: yo ? 10 : 36,
          borderBottomLeftRadius: yo ? 36 : 10,
          background: yo ? colors.cta : '#EFE8DC',
          color: yo ? colors.ctaTexto : colors.verde,
        }}
      >
        <RichText text={m.texto} />
      </div>
    </div>
  );
};

const TypingDots: React.FC<{frame: number}> = ({frame}) => (
  <div
    style={{
      display: 'flex',
      gap: 10,
      padding: '26px 30px',
      borderRadius: 36,
      borderBottomLeftRadius: 10,
      background: '#EFE8DC',
    }}
  >
    {[0, 1, 2].map((d) => {
      const k = Math.sin((frame - d * 3) * 0.55);
      return (
        <span
          key={d}
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: colors.oliveMuted,
            opacity: 0.45 + 0.35 * (k + 1) * 0.5,
            transform: `translateY(${-k * 4}px)`,
          }}
        />
      );
    })}
  </div>
);
