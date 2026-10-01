/**
 * 12.5–17s · CTA. Fondo verde con textura de espigas, un comentario que se tipea
 * mencionando al emprendimiento, la bajada y el logo. Damero y onda al pie.
 */
import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CircleUserRound, Heart} from 'lucide-react';
import {clamp, colors, easeOut, fonts, safe, video} from '../brand';
import {copy} from '../copy';
import {Atlas} from '../components/Atlas';
import {Checker, Emoji, Grain, RichText, Wave, WheatTexture} from '../components/Decor';
import {Headline} from '../components/Headline';

export const CTA = {
  eyebrow: 0,
  title: 3,
  card: 20,
  type: [34, 58] as const,
  publicar: 62,
  posted: 64,
  like: 76,
  bajada: 86,
  logo: 98,
  duration: 150,
};

type Props = {
  /** Portada: layout centrado y simétrico, todo dentro del recorte 1080x1350 del feed. */
  portada?: boolean;
};

const CHECKER = 44;

export const SceneCTA: React.FC<Props> = ({portada = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const left = safe.left;
  const right = portada ? safe.left : safe.right;

  const eyebrow = interpolate(frame, [CTA.eyebrow, CTA.eyebrow + 12], [0, 1], {...clamp, easing: easeOut});
  const waveTop = interpolate(frame, [0, 26], [video.height + 60, 1660], {...clamp, easing: easeOut});
  const checkerIn = interpolate(frame, [12, 32], [CHECKER * 2, 0], {...clamp, easing: easeOut});
  const bajada = spring({frame: frame - CTA.bajada, fps, config: {damping: 200}});
  const logo = spring({frame: frame - CTA.logo, fps, config: {damping: 200, mass: 1}});

  return (
    <AbsoluteFill style={{background: colors.verde, overflow: 'hidden'}}>
      <WheatTexture />
      <Atlas tone="dark" width={2600} x={-880} y={380} pins={false} opacity={0.8} />

      <div style={{position: 'absolute', left, right, top: 296, textAlign: 'center'}}>
        <div
          style={{
            fontFamily: fonts.serif,
            fontStyle: 'italic',
            fontSize: 46,
            color: colors.crema,
            opacity: eyebrow * 0.8,
            transform: `translateY(${(1 - eyebrow) * 14}px)`,
            marginBottom: 18,
          }}
        >
          {copy.cta.bajadaArriba}
        </div>
        <Headline lines={copy.cta.titulo} start={CTA.title} stagger={4} sans={128} serif={80} align="center" />
      </div>

      <div style={{position: 'absolute', left, right, top: 676, display: 'flex', justifyContent: 'center'}}>
        <Comment />
      </div>

      <div
        style={{
          position: 'absolute',
          left: left + 30,
          right: right + 30,
          top: 972,
          textAlign: 'center',
          fontFamily: fonts.sans,
          fontWeight: 700,
          fontSize: 42,
          lineHeight: 1.3,
          color: colors.crema,
          opacity: bajada * 0.94,
          transform: `translateY(${(1 - bajada) * 24}px)`,
        }}
      >
        <RichText text={copy.cta.bajada} />
      </div>

      <div
        style={{
          position: 'absolute',
          left,
          right,
          top: 1262,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          opacity: logo,
          transform: `translateY(${(1 - logo) * 30}px)`,
        }}
      >
        <Img src={staticFile('logo-crema.png')} style={{width: 470, height: 'auto'}} />
        <div style={{fontFamily: fonts.sans, fontWeight: 700, fontSize: 30, letterSpacing: '0.02em', color: colors.crema, opacity: 0.7}}>
          {copy.cta.web}
        </div>
      </div>

      <Wave color={colors.crema} top={waveTop} amplitude={30} lobes={1.4} seed={4} />
      <div style={{position: 'absolute', left: 0, bottom: -checkerIn}}>
        <Checker size={CHECKER} rows={2} offset={frame * 0.6} />
      </div>
      <Grain opacity={0.08} blend="soft-light" />
    </AbsoluteFill>
  );
};

/** Comentario: primero el campo con la mención tipeándose, después publicado y con "me gusta" de CeliMap. */
const Comment: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = copy.cta.comentario;
  const full = c.mencion + c.resto;

  const cardIn = spring({frame: frame - CTA.card, fps, config: {damping: 18, mass: 0.8}});
  const chars = Math.floor(interpolate(frame, CTA.type, [0, full.length], clamp));
  const typed = full.slice(0, chars);
  const mention = typed.slice(0, Math.min(chars, c.mencion.length));
  const rest = typed.slice(c.mencion.length);
  const posted = interpolate(frame, [CTA.posted, CTA.posted + 8], [0, 1], {...clamp, easing: easeOut});
  const like = spring({frame: frame - CTA.like, fps, config: {damping: 9, mass: 0.5}});
  const liked = frame >= CTA.like;
  const likeText = interpolate(frame, [CTA.like + 2, CTA.like + 12], [0, 1], {...clamp, easing: easeOut});
  const caret = frame < CTA.publicar && (frame < CTA.type[0] || frame > CTA.type[1] ? Math.floor(frame / 8) % 2 === 0 : true);
  const publicarPressed = frame >= CTA.publicar - 2 && frame <= CTA.publicar + 2;

  const text = (
    <>
      <span style={{color: colors.cta, fontWeight: 800}}>{mention}</span>
      {rest ? <RichText text={rest} /> : null}
    </>
  );

  return (
    <div
      style={{
        width: 820,
        borderRadius: 40,
        background: colors.card,
        padding: '28px 30px',
        boxShadow: '0 50px 70px -40px rgba(0,0,0,0.55)',
        opacity: Math.min(1, cardIn * 1.5),
        transform: `translateY(${(1 - cardIn) * 80}px) rotate(${(1 - cardIn) * -3}deg)`,
        fontFamily: fonts.sans,
        color: colors.verde,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: 999,
            background: '#D5E3D2',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircleUserRound size={52} color="rgba(31,77,53,0.7)" strokeWidth={1.7} />
        </div>
        <div style={{flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)'}}>
          {/* Campo de comentario */}
          <div
            style={{
              gridArea: '1 / 1',
              height: 86,
              borderRadius: 999,
              border: `2px solid ${colors.borde}`,
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px 0 28px',
              gap: 12,
              opacity: 1 - posted,
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 30,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: chars > 22 ? 'flex-end' : 'flex-start',
              }}
            >
              {chars === 0 ? <span style={{color: colors.muted, fontWeight: 500}}>Agregá un comentario…</span> : text}
              {caret ? <span style={{width: 3, height: 40, background: colors.cta, marginLeft: 2, flexShrink: 0}} /> : null}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: colors.ctaTexto,
                background: colors.cta,
                borderRadius: 999,
                padding: '12px 22px',
                opacity: chars > 0 ? 1 : 0.35,
                transform: publicarPressed ? 'scale(0.94)' : 'none',
              }}
            >
              Publicar
            </div>
          </div>
          {/* Comentario publicado */}
          <div
            style={{
              gridArea: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              opacity: posted,
              transform: `translateY(${(1 - posted) * 12}px)`,
            }}
          >
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontSize: 28, fontWeight: 800, color: colors.verde}}>
                {c.usuario} <span style={{fontWeight: 600, color: colors.muted}}>· ahora</span>
              </div>
              <div style={{fontSize: 35, fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden'}}>{text}</div>
            </div>
            <div style={{transform: `scale(${liked ? 0.7 + 0.3 * like : 1})`, flexShrink: 0, paddingRight: 8}}>
              <Heart
                size={48}
                strokeWidth={2}
                color={liked ? colors.cta : colors.muted}
                fill={liked ? colors.cta : 'none'}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Me gusta de CeliMap */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 18,
          marginLeft: 108,
          fontSize: 27,
          fontWeight: 600,
          color: colors.muted,
          opacity: likeText,
          height: 40 * likeText,
          overflow: 'hidden',
        }}
      >
        <Img src={staticFile('brand/icon-ig.png')} style={{width: 36, height: 36, borderRadius: 999}} />
        <span>
          A <strong style={{color: colors.verde, fontWeight: 800}}>celimap</strong> le gustó <Emoji>💚</Emoji>
        </span>
      </div>
    </div>
  );
};
