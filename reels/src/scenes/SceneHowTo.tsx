/**
 * 6–12.5s · Cómo se hace.
 * Celular con la web real: /emprendimientos → Sugerir → formulario → ¡Gracias! →
 * la tarjeta nueva aparece en el listado. Zoom de cámara en los momentos clave y
 * una píldora con el paso actual (01, 02, 03) como en "Cómo funciona" de la web.
 */
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp, colors, easeInOut, easeOut, fonts, safe, safeCenterX, video} from '../brand';
import {copy, type Linea} from '../copy';
import {Atlas} from '../components/Atlas';
import {Grain, RichText, Wave} from '../components/Decor';
import {Phone, SCREEN_H, SCREEN_W} from '../components/Phone';
import {Finger} from '../components/Finger';
import {EMPR_CTA, EmprendimientosScreen, LISTADO_Y, CARD_H} from '../components/VentureCatalog';
import {FORM, GraciasScreen, SugerirScreen, VER_BTN, chipCenter, enviarCenter, inputCenter} from '../components/AppScreens';
import {STATUS_H} from '../components/Phone';

/** Línea de tiempo del flujo (frames locales de la escena). */
export const HOWTO = {
  tagIn: 12,
  step1: 14,
  tapSugerir: 22,
  push: [24, 34] as const,
  step2: 34,
  zoomIn: [36, 48] as const,
  tapInstagram: 38,
  typeInstagram: [40, 64] as const,
  zoomOut: [64, 78] as const,
  scroll1: [64, 74] as const,
  tapZona: 78,
  typeZona: [80, 85] as const,
  tapCategoria: 90,
  step3: 92,
  scroll2: [92, 102] as const,
  tapEnviar: 105,
  gracias: 110,
  stepOut: 118,
  tapVer: 130,
  push2: [132, 144] as const,
  nueva: 146,
  zoomCard: [148, 172] as const,
  salida: [182, 204] as const,
  duration: 204,
};
const T = HOWTO;

const SCROLL_1 = 250;
const SCROLL_2 = FORM.alto - SCREEN_H;
const LISTADO_SCROLL = LISTADO_Y - STATUS_H - 12;

const PHONE_W = 520;
const PHONE_TOP = 512;
const BEZEL = 14;
const UI = (PHONE_W - BEZEL * 2) / SCREEN_W;
const PHONE_LEFT = safeCenterX - PHONE_W / 2;
/** Punto lógico de la pantalla → px del video (sin zoom). */
const toVideo = (x: number, y: number) => ({x: PHONE_LEFT + BEZEL + x * UI, y: PHONE_TOP + BEZEL + y * UI});

type Props = {
  /** Frames iniciales en los que la escena anterior sigue visible debajo (sin fondo propio). */
  underlay?: number;
};

export const SceneHowTo: React.FC<Props> = ({underlay = 0}) => {
  const frame = useCurrentFrame();
  const ownBg = frame >= underlay;
  const {fps} = useVideoConfig();

  // Entrada
  const phoneIn = spring({frame, fps, config: {damping: 200, mass: 0.9}});
  const tagIn = spring({frame: frame - T.tagIn, fps, config: {damping: 16, mass: 0.7}});

  // Pantallas
  const push = interpolate(frame, T.push, [0, 1], {...clamp, easing: easeOut});
  const push2 = interpolate(frame, T.push2, [0, 1], {...clamp, easing: easeOut});
  const scroll =
    interpolate(frame, T.scroll1, [0, SCROLL_1], {...clamp, easing: easeInOut}) +
    interpolate(frame, T.scroll2, [0, SCROLL_2 - SCROLL_1], {...clamp, easing: easeInOut});

  const link = copy.comoSeHace.linkEjemplo;
  const zona = copy.comoSeHace.zonaEjemplo;
  const igChars = Math.floor(interpolate(frame, T.typeInstagram, [0, link.length], clamp));
  const zonaChars = Math.floor(interpolate(frame, T.typeZona, [0, zona.length], clamp));
  const focus = frame >= T.tapZona ? 'zona' : frame >= T.tapInstagram ? 'instagram' : null;
  const typing = (frame >= T.typeInstagram[0] && frame <= T.typeInstagram[1]) || (frame >= T.typeZona[0] && frame <= T.typeZona[1]);
  const caretOn = typing || Math.floor(frame / 8) % 2 === 0;

  const gracias = interpolate(frame, [T.gracias, T.gracias + 8], [0, 1], {...clamp, easing: easeOut});
  const check = interpolate(frame, [T.gracias + 4, T.gracias + 16], [0, 1], {...clamp, easing: easeOut});
  const pop = spring({frame: frame - T.gracias, fps, config: {damping: 13, mass: 0.6}});
  const nuevaIn = spring({frame: frame - T.nueva, fps, config: {damping: 200, mass: 0.9}});
  const glow = interpolate(frame, [T.nueva + 12, T.nueva + 20, T.salida[0]], [0, 1, 0.45], clamp);

  // Cámara: zoom al input mientras se tipea y a la tarjeta nueva al final.
  const zIn = interpolate(frame, T.zoomIn, [0, 1], {...clamp, easing: easeInOut});
  const zOut = interpolate(frame, T.zoomOut, [0, 1], {...clamp, easing: easeInOut});
  const zCard = interpolate(frame, T.zoomCard, [0, 1], {...clamp, easing: easeInOut});
  const zoomType = zIn * (1 - zOut);
  const focusInput = toVideo(SCREEN_W / 2, inputCenter(FORM.instagram));
  const focusCard = toVideo(SCREEN_W / 2, LISTADO_Y - LISTADO_SCROLL + 44 + CARD_H / 2);
  const zoom = 1 + 0.38 * zoomType + 0.14 * zCard;
  const origin = zCard > 0 ? focusCard : focusInput;

  // Etiqueta: se esconde durante el zoom al input y cambia de texto al final.
  const tagOld = interpolate(frame, [T.push2[0], T.push2[0] + 6], [1, 0], {...clamp, easing: easeInOut});
  const tagSwap = interpolate(frame, [T.push2[0] + 6, T.push2[0] + 16], [0, 1], {...clamp, easing: easeOut});
  const tagHide = zoomType;

  // Paso actual
  const step = frame >= T.step3 ? 2 : frame >= T.step2 ? 1 : 0;
  const stepChange = [T.step1, T.step2, T.step3][step];
  const stepIn = spring({frame: frame - stepChange, fps, config: {damping: 16, mass: 0.6}});
  const stepVisible =
    interpolate(frame, [T.step1, T.step1 + 8], [0, 1], clamp) * interpolate(frame, [T.stepOut, T.stepOut + 8], [1, 0], clamp);

  // Dedo (px lógicos de pantalla; el scroll ya está descontado)
  const fingerKeys = [
    {f: 10, x: 300, y: 640},
    {f: 20, x: EMPR_CTA.x, y: EMPR_CTA.y},
    {f: 26, x: EMPR_CTA.x, y: EMPR_CTA.y},
    {f: 36, x: 200, y: inputCenter(FORM.instagram)},
    {f: 64, x: 200, y: inputCenter(FORM.instagram)},
    {f: 76, x: 200, y: inputCenter(FORM.zona) - SCROLL_1},
    {f: 82, x: 200, y: inputCenter(FORM.zona) - SCROLL_1},
    {f: 88, x: chipCenter.x, y: chipCenter.y - SCROLL_1},
    {f: 93, x: chipCenter.x, y: chipCenter.y - SCROLL_1},
    {f: 103, x: 195, y: enviarCenter - SCROLL_2},
  ];

  // Salida: onda verde que sube y tapa todo (pasa al CTA)
  const exit = interpolate(frame, T.salida, [0, 1], {...clamp, easing: easeInOut});
  const exitTop = video.height + 140 + (-300 - video.height - 140) * exit;

  return (
    <AbsoluteFill style={{background: ownBg ? colors.cremaFondo : 'transparent', overflow: 'hidden'}}>
      {ownBg ? <Atlas tone="light" width={2700} x={-900 - (frame - underlay) * 0.6} y={-80} pinOpacity={0.5} /> : null}

      {/* Teléfono con cámara */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${zoom})`,
          transformOrigin: `${origin.x}px ${origin.y}px`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: PHONE_TOP,
            left: PHONE_LEFT,
            transform: `translateY(${(1 - phoneIn) * 1500}px)`,
          }}
        >
          <Phone width={PHONE_W}>
            <div style={{position: 'absolute', inset: 0, transform: `translateX(${-120 * push}px)`}}>
              <EmprendimientosScreen
                ctaPressed={frame >= T.tapSugerir - 2 && frame <= T.tapSugerir + 4}
                cards={copy.catalogo.tarjetas}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translateX(${SCREEN_W * (1 - push)}px)`,
                boxShadow: push < 1 ? '-10px 0 30px rgba(31,77,53,0.15)' : 'none',
              }}
            >
              <SugerirScreen
                scroll={scroll}
                instagram={link.slice(0, igChars)}
                zona={zona.slice(0, zonaChars)}
                focus={frame >= T.scroll2[0] ? null : focus}
                caretOn={caretOn}
                categoria={frame >= T.tapCategoria}
                enviando={frame >= T.tapEnviar + 2}
                enviarPressed={frame >= T.tapEnviar - 2 && frame <= T.tapEnviar + 3}
              />
            </div>
            {gracias > 0 ? (
              <div style={{position: 'absolute', inset: 0, opacity: gracias, zIndex: 3}}>
                <GraciasScreen
                  titulo={<RichText text={copy.comoSeHace.gracias} />}
                  check={check}
                  pop={0.6 + 0.4 * pop}
                  verPressed={frame >= T.tapVer - 2 && frame <= T.tapVer + 3}
                />
              </div>
            ) : null}
            {push2 > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 4,
                  transform: `translateX(${SCREEN_W * (1 - push2)}px)`,
                  boxShadow: '-10px 0 30px rgba(31,77,53,0.15)',
                }}
              >
                <EmprendimientosScreen
                  scroll={LISTADO_SCROLL}
                  nueva={copy.comoSeHace.nueva}
                  nuevaIn={nuevaIn}
                  glow={glow}
                  cards={[...copy.catalogo.tarjetas.slice(1), copy.catalogo.tarjetas[0]]}
                />
              </div>
            ) : null}
            <Finger
              keys={fingerKeys}
              taps={[T.tapSugerir, T.tapInstagram, T.tapZona, T.tapCategoria, T.tapEnviar]}
              appear={10}
              disappear={T.tapEnviar + 6}
            />
            <Finger
              keys={[
                {f: T.gracias + 8, x: 280, y: 600},
                {f: T.tapVer - 2, x: VER_BTN.x, y: VER_BTN.y},
              ]}
              taps={[T.tapVer]}
              appear={T.gracias + 8}
              disappear={T.tapVer + 5}
            />
          </Phone>
        </div>
      </div>

      {/* Etiqueta */}
      <div
        style={{
          position: 'absolute',
          top: 236,
          left: safe.left,
          right: safe.right,
          display: 'flex',
          justifyContent: 'center',
          opacity: Math.min(1, tagIn * 1.4) * (1 - tagHide),
          transform: `translateY(${-tagHide * 40}px)`,
        }}
      >
        <div
          style={{
            background: colors.verde,
            borderRadius: 34,
            padding: '24px 44px 30px',
            textAlign: 'center',
            transform: `rotate(-2.2deg) scale(${0.9 + 0.1 * tagIn})`,
            boxShadow: '0 30px 50px -28px rgba(31,77,53,0.7)',
            display: 'grid',
          }}
        >
          <TagText lines={copy.comoSeHace.etiqueta} opacity={tagOld} />
          <TagText lines={copy.comoSeHace.etiquetaFinal} opacity={tagSwap} offset={(1 - tagSwap) * 18} />
        </div>
      </div>

      {/* Paso actual */}
      <div
        style={{
          position: 'absolute',
          top: 434 - zoomType * 190,
          left: safe.left,
          right: safe.right,
          display: 'flex',
          justifyContent: 'center',
          opacity: stepVisible,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '10px 30px 10px 10px',
            borderRadius: 999,
            background: colors.card,
            border: `2px solid ${colors.borde}`,
            boxShadow: '0 20px 40px -24px rgba(31,77,53,0.55)',
            transform: `translateY(${(1 - stepIn) * 14}px) scale(${0.92 + 0.08 * stepIn})`,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 999,
              background: colors.cta,
              color: colors.ctaTexto,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: fonts.serif,
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 30,
            }}
          >
            0{step + 1}
          </div>
          <div style={{fontFamily: fonts.sans, fontWeight: 800, fontSize: 36, color: colors.verde, letterSpacing: '-0.01em'}}>
            {copy.comoSeHace.pasos[step]}
          </div>
        </div>
      </div>

      <Wave color={colors.verde} top={exitTop} amplitude={52} lobes={1.1} seed={2} />
      {ownBg ? <Grain opacity={0.06} /> : null}
    </AbsoluteFill>
  );
};

const TagText: React.FC<{lines: readonly Linea[]; opacity: number; offset?: number}> = ({lines, opacity, offset = 0}) => (
  <div style={{gridArea: '1 / 1', opacity, transform: `translateY(${offset}px)`, alignSelf: 'center'}}>
    {lines.map((l, i) =>
      l.f === 'serif' ? (
        <div key={i} style={{fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: 500, fontSize: 66, lineHeight: 1.05, color: colors.crema}}>
          {l.t}
        </div>
      ) : (
        <div
          key={i}
          style={{fontFamily: fonts.sans, fontWeight: 800, fontSize: 44, lineHeight: 1.15, letterSpacing: '-0.015em', color: colors.crema}}
        >
          {l.t}
        </div>
      ),
    )}
  </div>
);
