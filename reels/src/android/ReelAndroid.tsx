/**
 * Reel "CeliMap llegó a Android" (9:16, 1080x1920, 30fps, 16,8s, con música).
 * Pensado para "reel de prueba" en Instagram (se muestra primero a quienes no siguen la cuenta).
 *
 *   1 · Gancho   "¿Sos celíaco y usás Android?"
 *   2 · Llegada  "Llegamos a Google Play": ícono, sticker NUEVO, badge oficial
 *   3 · Mapa     el mapa de la app en un celular Android: caen pines, filtro "100% sin TACC", ficha
 *   4 · Descarga "Descargala gratis": ícono, badges (Google Play primero), logo
 *
 * Tiempos: ./timing.ts. Textos: ./copy.ts. Audio: public/audio/reel-android.wav (npm run audio:android).
 * Reutiliza las piezas de los anuncios (src/celiaco): MapScreen, AppIcon, zonas seguras, golpes de cámara.
 */
import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, colors, easeIn, easeInOut, easeOut, fonts, video} from '../brand';
import {Atlas} from '../components/Atlas';
import {Checker, Grain, RichText, Wave, WheatTexture} from '../components/Decor';
import {Headline} from '../components/Headline';
import {SCREEN_H, SCREEN_W} from '../components/Phone';
import {useFonts} from '../components/useFonts';
import {AdsGuides, AppIcon, ads, adsCenterX} from '../celiaco/Bits';
import {MapScreen} from '../celiaco/MapScreen';
import {tiendas} from '../celiaco/copy';
import {beatPulse, punchAt} from '../celiaco/motion';
import {WAVE} from '../celiaco/timing';
import {copyAndroid as c} from './copy';
import {timingAndroid, type TimingAndroid} from './timing';

const contentW = video.width - ads.left - ads.right;

/* ───────────────────────── piezas ───────────────────────── */

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

/** Celular Android: bisel, cámara perforada al centro, barra de estado y barra de gestos. Contenido en px lógicos. */
const AndroidPhone: React.FC<{width: number; children: React.ReactNode}> = ({width, children}) => {
  const bezel = 13;
  const screenW = width - bezel * 2;
  const scale = screenW / SCREEN_W;
  const screenH = SCREEN_H * scale;
  return (
    <div
      style={{
        width,
        height: screenH + bezel * 2,
        boxSizing: 'border-box',
        borderRadius: 70,
        background: '#15271D',
        padding: bezel,
        boxShadow: '0 60px 90px -40px rgba(10,30,20,0.6), 0 20px 40px -20px rgba(10,30,20,0.4), inset 0 0 0 2px #2E4A3A',
      }}
    >
      <div style={{width: screenW, height: screenH, borderRadius: 57, overflow: 'hidden', position: 'relative', background: colors.cremaFondo}}>
        <div
          style={{
            width: SCREEN_W,
            height: SCREEN_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'relative',
            fontFamily: fonts.sans,
            color: colors.olive,
          }}
        >
          {children}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 26px 0 28px',
              boxSizing: 'border-box',
              fontSize: 15,
              fontWeight: 700,
              color: colors.verde,
              background: colors.cremaFondo,
              zIndex: 8,
            }}
          >
            <span>9:41</span>
            <svg width="62" height="14" viewBox="0 0 62 14" fill={colors.verde}>
              <path d="M2 13 L14 1 L14 13 Z" />
              <path d="M22 5.2a10 10 0 0 1 14 0L29 13z" />
              <rect x="44" y="2" width="16" height="10" rx="2.5" fill="none" stroke={colors.verde} strokeWidth="1.4" />
              <rect x="46" y="4" width="10" height="6" rx="1.2" />
              <rect x="60.5" y="5" width="1.5" height="4" rx="0.7" />
            </svg>
          </div>
          <div
            style={{position: 'absolute', left: '50%', top: 14, width: 15, height: 15, marginLeft: -7.5, borderRadius: '50%', background: '#0E1A13', zIndex: 9}}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              width: 108,
              height: 4,
              marginLeft: -54,
              borderRadius: 2,
              background: 'rgba(31,77,53,0.7)',
              zIndex: 9,
            }}
          />
        </div>
      </div>
    </div>
  );
};

/** Sticker redondo terracota ("NUEVO / en Android"). */
const Sticker: React.FC<{size: number; arriba: string; abajo: string}> = ({size, arriba, abajo}) => (
  <div
    style={{
      width: size,
      height: size,
      boxSizing: 'border-box',
      borderRadius: '50%',
      background: colors.terracota,
      border: `${size * 0.034}px solid ${colors.crema}`,
      boxShadow: '0 30px 40px -20px rgba(0,0,0,0.55)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: size * 0.01,
      color: colors.crema,
      textAlign: 'center',
    }}
  >
    <div style={{fontFamily: fonts.sans, fontWeight: 900, fontSize: size * 0.21, lineHeight: 1, letterSpacing: '0.02em'}}>{arriba}</div>
    <div style={{fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: 500, fontSize: size * 0.125, lineHeight: 1.15}}>{abajo}</div>
  </div>
);

/** Badges oficiales sin modificar, igualados por alto. Google Play primero: es el lanzamiento en Android. */
const BadgesAndroidPrimero: React.FC<{height: number}> = ({height}) => (
  <div style={{display: 'flex', gap: height * 0.19, justifyContent: 'center', alignItems: 'center'}}>
    {[tiendas.android, tiendas.ios].map((t) => (
      <Img
        key={t.badge}
        src={staticFile(t.badge)}
        alt={t.alt}
        style={{height, width: height * t.ratio, display: 'block', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.35))'}}
      />
    ))}
  </div>
);

/* ───────────────────────── 1 · Gancho ───────────────────────── */

const SceneGancho: React.FC<{t: TimingAndroid; still?: boolean}> = ({t, still = false}) => {
  const frame = useCurrentFrame();
  const g = t.gancho;
  const exit = still ? 0 : interpolate(frame, g.exit, [0, 1], {...clamp, easing: easeIn});
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${1 + exit * 0.7})`,
        filter: exit > 0 ? `blur(${exit * 14}px)` : undefined,
        opacity: 1 - exit,
      }}
    >
      <div style={{position: 'absolute', left: ads.left, width: contentW, top: 600}}>
        <Eyebrow text={c.gancho.bajada} start={still ? -100 : -8} />
        <Headline lines={c.gancho.titulo} start={still ? -200 : g.titleStart} stagger={g.stagger} sans={124} serif={108} align="center" />
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 2 · Llegada ───────────────────────── */

const SceneLlegada: React.FC<{t: TimingAndroid; still?: boolean}> = ({t, still = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const L = t.llegada;
  const f = still ? 400 : frame;
  const abs = f + L.from;
  const icon = spring({frame: f - L.icon, fps, config: {damping: 9, mass: 0.7}});
  const st = spring({frame: f - L.sticker, fps, config: {damping: 8, mass: 0.6}});
  const badge = spring({frame: f - L.badge, fps, config: {damping: 12, mass: 0.7}});
  const wobble = still ? 0 : Math.sin((f - L.sticker) / 5) * 4 * Math.exp(-Math.max(0, f - L.sticker) / 30);
  const iconBeat = still ? 0 : beatPulse(abs, L.from + L.icon + 18);
  const exit = still ? 0 : interpolate(f, L.exit, [0, 1], {...clamp, easing: easeIn});
  const ICON = 300;

  return (
    <AbsoluteFill style={{transform: `translateY(${-exit * 240}px)`, opacity: 1 - exit * 0.9}}>
      <div style={{position: 'absolute', left: ads.left, width: contentW, top: 330}}>
        <Headline lines={c.llegada.titulo} start={still ? -200 : L.title} stagger={5} sans={136} serif={108} align="center" />
      </div>

      <div
        style={{
          position: 'absolute',
          left: adsCenterX - ICON / 2,
          top: 720,
          transform: `translateY(${(1 - icon) * 140}px) scale(${(0.4 + 0.6 * icon) * (1 + iconBeat * 0.05)}) rotate(${(1 - icon) * -18}deg)`,
          opacity: Math.min(1, icon * 2),
        }}
      >
        <AppIcon size={ICON} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: adsCenterX + ICON / 2 - 110,
          top: 640,
          transform: `scale(${st}) rotate(${12 + wobble + (1 - st) * 40}deg)`,
          opacity: Math.min(1, st * 3),
        }}
      >
        <Sticker size={210} arriba={c.llegada.sticker.arriba} abajo={c.llegada.sticker.abajo} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: ads.left,
          width: contentW,
          top: 1110,
          display: 'flex',
          justifyContent: 'center',
          opacity: Math.min(1, badge * 1.5),
          transform: `translateY(${(1 - badge) * 70}px)`,
        }}
      >
        <Img
          src={staticFile(tiendas.android.badge)}
          alt={tiendas.android.alt}
          style={{height: 132, width: 132 * tiendas.android.ratio, display: 'block', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.35))'}}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 3 · Mapa ───────────────────────── */

const PHONE_W = 520;

const SceneMapa: React.FC<{t: TimingAndroid}> = ({t}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const M = t.mapa;
  const phone = spring({frame: frame - M.phone, fps, config: {damping: 16, mass: 0.9}});
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
        <AndroidPhone width={PHONE_W}>
          <MapScreen t={M} />
        </AndroidPhone>
      </div>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 4 · Descarga ───────────────────────── */

const CHECKER = 44;

const SceneDescarga: React.FC<{t: TimingAndroid; still?: boolean}> = ({t, still = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const D = t.descarga;
  const f = still ? 400 : frame;
  const abs = f + D.from;
  const icon = spring({frame: f - D.icon, fps, config: {damping: 9, mass: 0.7}});
  const bajada = spring({frame: f - D.bajada, fps, config: {damping: 200}});
  const badges = spring({frame: f - D.badges, fps, config: {damping: 12, mass: 0.7}});
  const footer = interpolate(f, [D.footer - 10, D.footer + 8], [0, 1], {...clamp, easing: easeOut});
  const iconBeat = still ? 0 : beatPulse(abs, D.from + D.icon + 18);
  const badgeBeat = still ? 0 : beatPulse(abs, D.from + D.badges + 18);

  return (
    <AbsoluteFill>
      {still ? <AbsoluteFill style={{background: colors.verde}} /> : <WaveIn color={colors.verde} seed={7} />}
      <AbsoluteFill style={{opacity: still ? 1 : interpolate(f, [WAVE - 4, WAVE + 6], [0, 1], clamp)}}>
        <WheatTexture />
        <Atlas tone="dark" width={2600} x={-880} y={420} pins={false} opacity={0.75} />
      </AbsoluteFill>

      <div style={{position: 'absolute', left: ads.left, width: contentW, top: 300}}>
        <Eyebrow text={c.descarga.eyebrow} start={still ? -100 : D.eyebrow} />
        <Headline lines={c.descarga.titulo} start={still ? -200 : D.title} stagger={4} sans={124} serif={104} align="center" />
      </div>

      <div
        style={{
          position: 'absolute',
          left: adsCenterX - 120,
          top: 680,
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
          top: 960,
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
          top: 1100,
          opacity: Math.min(1, badges * 1.5),
          transform: `translateY(${(1 - badges) * 70}px) scale(${1 + badgeBeat * 0.025})`,
        }}
      >
        <BadgesAndroidPrimero height={118} />
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

/* ───────────────────────── composición ───────────────────────── */

export const REEL_ANDROID_DURATION = timingAndroid().total;

export const ReelAndroid: React.FC<{guides?: boolean; muted?: boolean}> = ({guides = false, muted = false}) => {
  useFonts();
  const frame = useCurrentFrame();
  const t = timingAndroid();
  const punch = punchAt(frame, t.punches);
  return (
    <AbsoluteFill style={{background: colors.verde, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${punch})`}}>
        <WheatTexture drift={0.6} />
        <Atlas tone="dark" width={2600} x={-780 - frame * 0.25} y={160} pins opacity={0.9} />

        <Sequence from={t.gancho.from} durationInFrames={t.gancho.duration} name="1 · Gancho">
          <SceneGancho t={t} />
        </Sequence>
        <Sequence from={t.llegada.from} durationInFrames={t.llegada.duration} name="2 · Llegada">
          <SceneLlegada t={t} />
        </Sequence>
        <Sequence from={t.mapa.from} durationInFrames={t.mapa.duration} name="3 · Mapa">
          <SceneMapa t={t} />
        </Sequence>
        <Sequence from={t.descarga.from} durationInFrames={t.descarga.duration} name="4 · Descarga">
          <SceneDescarga t={t} />
        </Sequence>
      </AbsoluteFill>

      <Grain opacity={0.07} blend="soft-light" />
      {guides ? <AdsGuides /> : null}
      {muted ? null : <Audio src={staticFile('audio/reel-android.wav')} />}
    </AbsoluteFill>
  );
};

/** Portada: la llegada armada (ícono + NUEVO + Google Play), dentro del recorte 4:5 del feed. */
export const PortadaAndroid: React.FC<{guides?: boolean}> = ({guides = false}) => {
  useFonts();
  const t = timingAndroid();
  return (
    <AbsoluteFill style={{background: colors.verde, overflow: 'hidden'}}>
      <WheatTexture />
      <Atlas tone="dark" width={2600} x={-780} y={160} pins opacity={0.9} />
      <SceneLlegada t={t} still />
      <Grain opacity={0.07} blend="soft-light" />
      {guides ? <AdsGuides /> : null}
    </AbsoluteFill>
  );
};
