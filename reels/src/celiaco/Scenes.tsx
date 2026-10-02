/**
 * Escenas de los anuncios "¿Sos celíaco?" y "¿Conocés a un celíaco?".
 * El fondo verde con espigas y el golpe de cámara los pone AdCeliaco; las escenas son capas encima.
 * Todos los tiempos salen de timing.ts (grilla de 100 bpm).
 */
import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, colors, easeIn, easeInOut, easeOut, fonts, video} from '../brand';
import {Atlas} from '../components/Atlas';
import {Checker, Emoji, Grain, RichText, Wave, WheatTexture} from '../components/Decor';
import {Headline} from '../components/Headline';
import {Phone} from '../components/Phone';
import {AppIcon, StoreBadges, ads, adsCenterX} from './Bits';
import {Chat} from './Chat';
import {MapScreen} from './MapScreen';
import {ShareCard} from './ShareCard';
import {tiendas, type CopyCeliaco} from './copy';
import {beatPulse, rand} from './motion';
import {WAVE, type Timing} from './timing';

const contentW = video.width - ads.left - ads.right;

const Eyebrow: React.FC<{text: string; start: number; color?: string}> = ({text, start, color = colors.crema}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + 12], [0, 1], {...clamp, easing: easeOut});
  return (
    <div
      style={{
        fontFamily: fonts.serif,
        fontStyle: 'italic',
        fontSize: 46,
        color,
        opacity: p * 0.82,
        transform: `translateY(${(1 - p) * 14}px)`,
        marginBottom: 18,
        textAlign: 'center',
      }}
    >
      <RichText text={text} />
    </div>
  );
};

/** Ola que sube y tapa todo: la transición entre escenas. */
const WaveIn: React.FC<{color: string; seed: number}> = ({color, seed}) => {
  const frame = useCurrentFrame();
  const top = interpolate(frame, [0, WAVE], [video.height + 80, -320], {...clamp, easing: easeInOut});
  return <Wave color={color} top={top} amplitude={46} lobes={1.15} seed={seed} />;
};

/* ───────────────────────── 1 · Gancho ───────────────────────── */

export const SceneGancho: React.FC<{c: CopyCeliaco; t: Timing; still?: boolean}> = ({c, t, still = false}) => {
  const frame = useCurrentFrame();
  const g = t.gancho;
  // Salida "zoom-through": el titular se agranda, se desenfoca y se va.
  const exit = still ? 0 : interpolate(frame, g.exit, [0, 1], {...clamp, easing: easeIn});
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${1 + exit * 0.7})`,
        filter: exit > 0 ? `blur(${exit * 14}px)` : undefined,
        opacity: 1 - exit,
      }}
    >
      <div style={{position: 'absolute', left: ads.left, width: contentW, top: 500}}>
        <Eyebrow text={c.gancho.bajada} start={still ? -100 : -8} />
        <Headline
          lines={c.gancho.titulo}
          start={still ? -200 : g.titleStart}
          stagger={g.stagger}
          sans={150}
          serif={96}
          align="center"
        />
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 2 · Dolor ───────────────────────── */

export const SceneDolor: React.FC<{c: CopyCeliaco; t: Timing}> = ({c, t}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const T = t.dolor;
  const inP = spring({frame: frame - T.card, fps, config: {damping: 15, mass: 0.8}});
  const exit = interpolate(frame, T.exit, [0, 1], {...clamp, easing: easeIn});
  const dim = interpolate(frame, [T.remate - 4, T.remate + 10], [0, 1], {...clamp, easing: easeOut});
  const s = c.dolor.sticker;
  const st = spring({frame: frame - T.sticker, fps, config: {damping: 8, mass: 0.6}});
  const wobble = Math.sin((frame - T.sticker) / 5) * 4 * Math.exp(-Math.max(0, frame - T.sticker) / 30);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: ads.left + 10,
          top: 300,
          transform: `translateY(${(1 - inP) * 1000 - exit * 260}px) rotate(${(1 - inP) * 8 - dim * 1.5}deg) scale(${1 - dim * 0.06})`,
          transformOrigin: 'top center',
          opacity: 1 - exit,
        }}
      >
        <Chat
          titulo={c.dolor.chat.titulo}
          subtitulo={c.dolor.chat.subtitulo}
          avatar={c.dolor.chat.avatar}
          mensajes={c.dolor.mensajes}
          tiempos={T.msgs}
          typing={T.typing}
          width={contentW - 20}
        />
      </div>

      {s ? (
        <div
          style={{
            position: 'absolute',
            left: s.x - 100,
            top: s.y - 100,
            width: 200,
            height: 200,
            fontSize: 150,
            lineHeight: '200px',
            textAlign: 'center',
            transform: `translateY(${-exit * 260}px) scale(${st * (1 - exit)}) rotate(${s.rot + wobble + (1 - st) * 40}deg)`,
            filter: 'drop-shadow(0 18px 18px rgba(0,0,0,0.35))',
          }}
        >
          <Emoji>{s.emoji}</Emoji>
        </div>
      ) : null}

      <div style={{position: 'absolute', left: ads.left, width: contentW, top: 1010}}>
        <Headline lines={c.dolor.remate} start={T.remate} stagger={5} sans={88} serif={84} align="center" exit={exit} />
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 3 · Mapa ───────────────────────── */

const PHONE_W = 500;

export const SceneMapa: React.FC<{c: CopyCeliaco; t: Timing}> = ({c, t}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const M = t.mapa;
  const phone = spring({frame: frame - M.phone, fps, config: {damping: 16, mass: 0.9}});
  // Empuje de cámara lento sobre el celular durante toda la escena.
  const push = interpolate(frame, [M.phone, M.duration], [0.97, 1.07], clamp);
  const tilt = interpolate(frame, [M.phone, M.duration], [-2, 1.5], clamp);

  return (
    <AbsoluteFill>
      <WaveIn color={colors.cremaFondo} seed={2} />
      <AbsoluteFill style={{opacity: interpolate(frame, [WAVE - 2, WAVE + 12], [0, 1], clamp)}}>
        <Atlas tone="light" width={2600} x={-820 + frame * 0.6} y={420} pins={false} opacity={0.7} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: ads.left, width: contentW, top: 292}}>
        <Headline
          lines={c.mapa.titulo}
          start={M.title}
          stagger={4}
          sans={84}
          serif={88}
          color={colors.verde}
          serifColor={colors.cta}
          align="center"
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: adsCenterX - PHONE_W / 2,
          top: 540,
          transformOrigin: '50% 30%',
          transform: `translateY(${(1 - phone) * 1100}px) rotate(${(1 - phone) * 10 + tilt}deg) scale(${push})`,
        }}
      >
        <Phone width={PHONE_W}>
          <MapScreen t={M} />
        </Phone>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 4 · Compartir (solo "conoces") ───────────────────────── */

export const SceneCompartir: React.FC<{c: CopyCeliaco; t: Timing}> = ({c, t}) => {
  const frame = useCurrentFrame();
  const C = t.compartir;
  if (!c.compartir || !C) return null;
  return (
    <AbsoluteFill>
      <WaveIn color={colors.verde} seed={5} />
      <AbsoluteFill style={{opacity: interpolate(frame, [WAVE - 4, WAVE + 6], [0, 1], clamp)}}>
        <WheatTexture />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: ads.left, width: contentW, top: 300}}>
        <Headline lines={c.compartir.titulo} start={C.title} stagger={4} sans={124} serif={84} align="center" />
      </div>
      <div style={{position: 'absolute', left: ads.left + 10, top: 600}}>
        <ShareCard para={c.compartir.para} mensaje={c.compartir.mensaje} width={contentW - 20} t={C} />
      </div>
      <Hearts start={C.hearts} x={adsCenterX} y={1000} />
    </AbsoluteFill>
  );
};

/** Ráfaga de corazones que sube desde (x, y). */
const Hearts: React.FC<{start: number; x: number; y: number}> = ({start, x, y}) => {
  const frame = useCurrentFrame();
  const d = frame - start;
  if (d < 0) return null;
  const emojis = ['💚', '🧡', '💚', '✨', '💚', '🧡', '💚', '✨', '💚', '🧡'];
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {emojis.map((e, i) => {
        const a = -Math.PI / 2 + (rand(i) - 0.5) * 2.2;
        const speed = 18 + rand(i + 9) * 14;
        const life = 34 + rand(i + 3) * 14;
        const p = Math.min(1, d / life);
        const dx = Math.cos(a) * speed * d;
        const dy = Math.sin(a) * speed * d + 0.35 * d * d;
        const size = 60 + rand(i + 5) * 50;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + dx - size / 2,
              top: y + dy - size / 2,
              fontSize: size,
              opacity: 1 - p,
              transform: `scale(${Math.min(1, d / 5)}) rotate(${(rand(i + 1) - 0.5) * 60 + d * (rand(i + 2) - 0.5) * 8}deg)`,
            }}
          >
            <Emoji>{e}</Emoji>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ───────────────────────── 5 · Descarga ───────────────────────── */

const CHECKER = 44;

export const SceneDescarga: React.FC<{c: CopyCeliaco; t: Timing; still?: boolean}> = ({c, t, still = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const D = t.descarga;
  const f = still ? 400 : frame;
  const abs = f + D.from;
  const icon = spring({frame: f - D.icon, fps, config: {damping: 9, mass: 0.7}});
  const bajada = spring({frame: f - D.bajada, fps, config: {damping: 200}});
  const badges = spring({frame: f - D.badges, fps, config: {damping: 12, mass: 0.7}});
  const footer = interpolate(f, [D.footer - 10, D.footer + 8], [0, 1], {...clamp, easing: easeOut});
  // El ícono y los badges "laten" con cada beat una vez que llegaron.
  const iconBeat = still ? 0 : beatPulse(abs, D.from + D.icon + 18);
  const badgeBeat = still ? 0 : beatPulse(abs, D.from + D.badges + 18);
  // Con "conoces" la escena anterior ya es verde: fundido en vez de ola.
  const fade = D.fromGreen && !still ? interpolate(f, [WAVE - 8, WAVE], [0, 1], clamp) : 1;

  return (
    <AbsoluteFill style={{opacity: fade}}>
      {D.fromGreen || still ? <AbsoluteFill style={{background: colors.verde}} /> : <WaveIn color={colors.verde} seed={7} />}
      <AbsoluteFill style={{opacity: D.fromGreen || still ? 1 : interpolate(f, [WAVE - 4, WAVE + 6], [0, 1], clamp)}}>
        <WheatTexture />
        <Atlas tone="dark" width={2600} x={-880} y={420} pins={false} opacity={0.75} />
      </AbsoluteFill>

      <div style={{position: 'absolute', left: ads.left, width: contentW, top: 300}}>
        <Eyebrow text={c.descarga.eyebrow} start={still ? -100 : D.eyebrow} />
        <Headline lines={c.descarga.titulo} start={still ? -200 : D.title} stagger={4} sans={112} serif={96} align="center" />
      </div>

      <div
        style={{
          position: 'absolute',
          left: adsCenterX - 120,
          top: 660,
          transform: `translateY(${(1 - icon) * 120}px) scale(${(0.4 + 0.6 * icon) * (1 + iconBeat * 0.05)}) rotate(${(1 - icon) * -18}deg)`,
          opacity: Math.min(1, icon * 2),
        }}
      >
        <AppIcon size={240} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: adsCenterX - 380,
          width: 760,
          top: 950,
          textAlign: 'center',
          textWrap: 'balance',
          fontFamily: fonts.sans,
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 1.3,
          color: colors.crema,
          opacity: bajada * 0.94,
          transform: `translateY(${(1 - bajada) * 24}px)`,
        }}
      >
        {c.descarga.bajada}
      </div>

      <div
        style={{
          position: 'absolute',
          left: ads.left,
          width: contentW,
          top: 1090,
          opacity: Math.min(1, badges * 1.5),
          transform: `translateY(${(1 - badges) * 70}px) scale(${1 + badgeBeat * 0.025})`,
        }}
      >
        <StoreBadges scale={0.92} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 1330,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          opacity: footer,
          transform: `translateY(${(1 - footer) * 30}px)`,
        }}
      >
        <Img src={staticFile('logo-crema.png')} style={{width: 380, height: 'auto'}} />
        <div style={{fontFamily: fonts.sans, fontWeight: 700, fontSize: 28, letterSpacing: '0.02em', color: colors.crema, opacity: 0.7}}>
          {tiendas.web}
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, bottom: -(1 - footer) * CHECKER * 2}}>
        <Checker size={CHECKER} rows={2} offset={f * 1.2} />
      </div>
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};
