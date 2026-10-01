/**
 * 0–6s · Gancho + catálogo.
 * Fondo verde con la pregunta y un abanico de tarjetas de emprendimiento.
 * Sube la onda crema, las tarjetas se acomodan en un carrusel y el titular
 * "Los que hacen …" va cambiando de palabra al ritmo de cada tarjeta.
 */
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, colors, easeIn, easeInOut, easeOut, fonts, safe, safeCenterX, video} from '../brand';
import {copy} from '../copy';
import {Atlas} from '../components/Atlas';
import {Grain, Wave, WheatTexture} from '../components/Decor';
import {Headline} from '../components/Headline';
import {CARD_W, VentureCard} from '../components/VentureCatalog';

/** Línea de tiempo (frames). */
export const INTRO = {
  hookTitle: 0,
  fanIn: 2,
  hookOut: [56, 70] as const,
  wave: [58, 86] as const,
  toRail: [60, 88] as const,
  catalogTitle: 80,
  steps: [104, 119, 134, 149] as const, // cada paso = una tarjeta (15 frames = 1 beat a 120 bpm)
  stepLen: 10,
  bajada: 98,
  titleOut: [164, 176] as const,
  out: [162, 182] as const,
  duration: 194,
};

const N = copy.catalogo.tarjetas.length;
const RAIL_SCALE = 1.5;
const RAIL_TOP = 668;
const RAIL_GAP = 56;
const SPACING = CARD_W * RAIL_SCALE + RAIL_GAP;
const FAN_SCALE = 1.14;

/** Pose del abanico para las posiciones -1, 0, 1 (resto fuera de cuadro). */
const fanPose = (p: number) => {
  if (p === 0) return {x: 520, y: 1000, rot: -2.5, s: FAN_SCALE};
  if (p === -1) return {x: 262, y: 1070, rot: -11, s: FAN_SCALE * 0.96};
  if (p === 1) return {x: 780, y: 1080, rot: 9.5, s: FAN_SCALE * 0.96};
  return {x: safeCenterX + p * 700, y: 1100, rot: p * 8, s: FAN_SCALE};
};

const railPose = (p: number) => ({
  x: safeCenterX + p * SPACING,
  y: RAIL_TOP + Math.abs(p) * 34,
  rot: p * 2.2,
  s: RAIL_SCALE - Math.min(Math.abs(p), 1) * 0.1,
});

/** Posición circular entre -N/2 y N/2. */
const wrap = (p: number) => {
  const half = N / 2;
  return ((((p + half) % N) + N) % N) - half;
};

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // —— Progresos ——
  const hookOut = interpolate(frame, INTRO.hookOut, [0, 1], {...clamp, easing: easeInOut});
  const wave = interpolate(frame, INTRO.wave, [0, 1], {...clamp, easing: easeInOut});
  const toRail = interpolate(frame, INTRO.toRail, [0, 1], {...clamp, easing: easeInOut});
  const active = INTRO.steps.reduce(
    (acc, s) => acc + interpolate(frame, [s, s + INTRO.stepLen], [0, 1], {...clamp, easing: easeInOut}),
    0,
  );
  const out = interpolate(frame, INTRO.out, [0, 1], {...clamp, easing: easeIn});
  const titleOut = interpolate(frame, INTRO.titleOut, [0, 1], {...clamp, easing: easeInOut});
  const bajada = spring({frame: frame - INTRO.bajada, fps, config: {damping: 200}});
  const eyebrow = interpolate(frame, [0, 12], [0, 1], {...clamp, easing: easeOut}) * (1 - hookOut);
  const atlasIn = interpolate(frame, [78, 100], [0, 1], clamp);

  // Onda crema: primero asoma abajo, después sube y tapa el verde.
  const waveTop = interpolate(frame, [0, 24], [video.height + 80, 1720], {...clamp, easing: easeOut}) * (1 - wave) + -320 * wave;

  // —— Tarjetas ——
  const order = copy.catalogo.tarjetas.map((t, i) => {
    const pFan = wrap(i);
    const pRail = wrap(i - active);
    const fan = fanPose(pFan);
    const rail = railPose(pRail);
    // Entrada del abanico: izquierda, derecha, centro (la del centro queda arriba).
    const delay = pFan === 0 ? 10 : pFan === -1 ? 2 : 6;
    const rise = spring({frame: frame - INTRO.fanIn - delay, fps, config: {damping: 18, mass: 0.9, stiffness: 90}});
    const bob = Math.sin((frame + i * 20) / 16) * 6 * (1 - toRail);
    const x = fan.x + (rail.x - fan.x) * toRail;
    const y = (fan.y + (1 - rise) * 900 + bob) * (1 - toRail) + rail.y * toRail;
    const rot = fan.rot + (rail.rot - fan.rot) * toRail;
    const s = fan.s + (rail.s - fan.s) * toRail;
    // Salida: caen con un poco de giro, escalonadas desde el centro.
    const fall = interpolate(out, [Math.min(Math.abs(pRail), 2) * 0.1, 1], [0, 1], clamp);
    return {
      t,
      i,
      x,
      y: y + fall * 1700,
      rot: rot + fall * pRail * 10,
      s,
      z: 10 - Math.round(Math.abs(toRail > 0.5 ? pRail : pFan) * 2),
      parallax: -pRail * 26 * toRail,
      hidden: toRail < 0.02 && Math.abs(pFan) > 1,
    };
  });

  return (
    <AbsoluteFill style={{background: colors.verde, overflow: 'hidden'}}>
      <WheatTexture />
      <Atlas tone="dark" width={2600} x={-820} y={120} pins={false} opacity={0.9} />

      {/* Gancho */}
      <div style={{position: 'absolute', left: safe.left, right: safe.right, top: 372}}>
        <div
          style={{
            fontFamily: fonts.serif,
            fontStyle: 'italic',
            fontSize: 46,
            color: colors.crema,
            opacity: eyebrow * 0.8,
            transform: `translateY(${(1 - eyebrow) * 14 - hookOut * 40}px)`,
            marginBottom: 22,
          }}
        >
          {copy.gancho.bajada}
        </div>
        <Headline lines={copy.gancho.titulo} start={INTRO.hookTitle} stagger={3} sans={108} serif={132} exit={hookOut} />
      </div>

      <Wave color={colors.cremaFondo} top={waveTop} amplitude={36 + wave * 44} lobes={1.2} />
      <div style={{position: 'absolute', inset: 0, opacity: atlasIn}}>
        <Atlas tone="light" width={2700} x={-900} y={-80} pinOpacity={0.5} />
      </div>

      {/* Catálogo: titular con palabra rotativa */}
      <CatalogTitle active={active} out={out} />

      {/* Tarjetas */}
      {order
        .filter((c) => !c.hidden)
        .sort((a, b) => a.z - b.z)
        .map((c) => (
          <div
            key={c.i}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: CARD_W,
              transform: `translate(${c.x - CARD_W / 2}px, ${c.y}px) rotate(${c.rot}deg) scale(${c.s})`,
              transformOrigin: 'top center',
              borderRadius: 24,
              boxShadow: '0 50px 70px -40px rgba(18,40,28,0.55)',
            }}
          >
            <VentureCard v={c.t} parallax={c.parallax} />
          </div>
        ))}

      {/* Bajada del catálogo */}
      <div
        style={{
          position: 'absolute',
          left: safe.left,
          right: safe.right,
          top: 1452,
          textAlign: 'center',
          fontFamily: fonts.sans,
          fontWeight: 800,
          fontSize: 44,
          letterSpacing: '-0.01em',
          color: colors.verde,
          opacity: bajada * (1 - titleOut),
          transform: `translateY(${(1 - bajada) * 24 + titleOut * 40}px)`,
        }}
      >
        {copy.catalogo.bajada}
      </div>
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};

/** "Los que hacen" + palabra que rueda como un tambor, sincronizada con el carrusel. */
const CatalogTitle: React.FC<{active: number; out: number}> = ({active, out: _out}) => {
  const out = interpolate(useCurrentFrame(), INTRO.titleOut, [0, 1], {...clamp, easing: easeInOut});
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inP = spring({frame: frame - INTRO.catalogTitle, fps, config: {damping: 200, mass: 0.6}});
  const wordIn = spring({frame: frame - INTRO.catalogTitle - 6, fps, config: {damping: 200, mass: 0.6}});
  const slotH = 172;
  const words = copy.catalogo.palabras;
  return (
    <div
      style={{
        position: 'absolute',
        left: safe.left,
        right: safe.right,
        top: 262,
        textAlign: 'center',
        opacity: 1 - out,
        transform: `translateY(${-out * 60}px)`,
      }}
    >
      <div style={{overflow: 'hidden', padding: '6px 0 14px', margin: '-6px 0 -14px'}}>
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 800,
            fontSize: 96,
            lineHeight: 1.02,
            letterSpacing: '-0.028em',
            color: colors.verde,
            transform: `translateY(${(1 - inP) * 115}%)`,
          }}
        >
          {copy.catalogo.titulo}
        </div>
      </div>
      <div style={{position: 'relative', height: slotH, marginTop: 2}}>
        {words.map((w, k) => {
          const d = k - active;
          const vis = Math.max(0, 1 - Math.abs(d) * 1.9);
          if (vis <= 0) return null;
          return (
            <div
              key={w}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: slotH,
                fontFamily: fonts.serif,
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 150,
                lineHeight: `${slotH}px`,
                color: colors.cta,
                opacity: vis * Math.min(1, wordIn * 1.4),
                filter: `blur(${Math.abs(d) * 14}px)`,
                transform: `translateY(${d * 70 + (1 - wordIn) * 60}px)`,
              }}
            >
              {w}
            </div>
          );
        })}
      </div>
    </div>
  );
};
