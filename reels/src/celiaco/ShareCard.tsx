/**
 * "Mandáselo": hoja de compartir genérica (no imita una app puntual).
 * Se elige el contacto, se tipea el mensaje y sale con la vista previa del link de CeliMap.
 */
import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Check, Send} from 'lucide-react';
import {clamp, colors, easeOut, fonts} from '../brand';
import {RichText} from '../components/Decor';
import {tiendas} from './copy';
import type {Timing} from './timing';

const CONTACTOS = ['Sofi', 'Mati', 'Juli', 'Mamá'];

type ShareT = NonNullable<Timing['compartir']>;

export const ShareCard: React.FC<{para: string; mensaje: string; width: number; t: ShareT}> = ({para, mensaje, width, t: SHARE}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cardIn = spring({frame: frame - SHARE.card, fps, config: {damping: 16, mass: 0.8}});
  const picked = spring({frame: frame - SHARE.pick, fps, config: {damping: 10, mass: 0.5}});
  const chars = Math.floor(interpolate(frame, SHARE.type, [0, mensaje.length], clamp));
  const sent = interpolate(frame, [SHARE.sent, SHARE.sent + 10], [0, 1], {...clamp, easing: easeOut});
  const done = spring({frame: frame - SHARE.done, fps, config: {damping: 12, mass: 0.5}});
  const sendPress = frame >= SHARE.send - 2 && frame <= SHARE.send + 2;

  return (
    <div
      style={{
        width,
        borderRadius: 48,
        background: colors.card,
        boxShadow: '0 60px 90px -50px rgba(0,0,0,0.6)',
        padding: '30px 34px 34px',
        fontFamily: fonts.sans,
        color: colors.verde,
        opacity: Math.min(1, cardIn * 1.6),
        transform: `translateY(${(1 - cardIn) * 120}px)`,
      }}
    >
      <div style={{width: 80, height: 8, borderRadius: 9, background: colors.borde, margin: '0 auto 22px'}} />
      <div style={{fontSize: 30, fontWeight: 800, marginBottom: 22}}>Enviar a</div>

      {/* Contactos */}
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 28}}>
        {CONTACTOS.map((n) => {
          const isTarget = n === para;
          const on = isTarget ? picked : 0;
          return (
            <div key={n} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 150}}>
              <div style={{position: 'relative'}}>
                <div
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 999,
                    background: isTarget ? '#E7D2C2' : '#E4E7DA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 46,
                    fontWeight: 800,
                    color: isTarget ? colors.terracota : colors.oliveMuted,
                    boxShadow: on > 0.01 ? `0 0 0 ${6 * on}px ${colors.cta}` : 'none',
                    transform: `scale(${1 - 0.06 * Math.sin(Math.min(1, on) * Math.PI)})`,
                  }}
                >
                  {n[0]}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    right: -4,
                    bottom: -4,
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: colors.cta,
                    border: `4px solid ${colors.card}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `scale(${on})`,
                  }}
                >
                  <Check size={24} color="#FFF" strokeWidth={3.2} />
                </div>
              </div>
              <div style={{fontSize: 26, fontWeight: isTarget ? 800 : 600, color: isTarget ? colors.verde : colors.muted}}>{n}</div>
            </div>
          );
        })}
      </div>

      {/* Vista previa del link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          borderRadius: 28,
          background: colors.verde,
          padding: 20,
          marginBottom: 22,
        }}
      >
        <Img src={staticFile('brand/app-icon.png')} style={{width: 96, height: 96, borderRadius: 22}} />
        <div style={{minWidth: 0}}>
          <div style={{fontSize: 32, fontWeight: 800, color: colors.crema}}>CeliMap</div>
          <div style={{fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 28, color: '#E7A07F', marginTop: 2}}>
            tu mapa sin gluten
          </div>
          <div style={{fontSize: 22, fontWeight: 600, color: 'rgba(247,243,235,0.6)', marginTop: 4}}>{tiendas.web}</div>
        </div>
      </div>

      {/* Mensaje + enviar */}
      <div style={{display: 'grid'}}>
        <div
          style={{
            gridArea: '1 / 1',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            height: 92,
            borderRadius: 999,
            border: `2px solid ${colors.borde}`,
            background: '#FFF',
            padding: '0 12px 0 30px',
            opacity: 1 - sent,
          }}
        >
          <div style={{flex: 1, fontSize: 32, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', display: 'flex', alignItems: 'center'}}>
            {chars === 0 ? (
              <span style={{color: colors.muted, fontWeight: 500}}>Escribí un mensaje…</span>
            ) : (
              <RichText text={mensaje.slice(0, chars)} />
            )}
            {frame < SHARE.send ? <span style={{width: 3, height: 40, background: colors.cta, marginLeft: 3}} /> : null}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 30,
              fontWeight: 800,
              color: colors.ctaTexto,
              background: colors.cta,
              borderRadius: 999,
              padding: '16px 26px',
              opacity: chars > 0 ? 1 : 0.4,
              transform: sendPress ? 'scale(0.93)' : 'none',
            }}
          >
            Enviar <Send size={26} strokeWidth={2.4} />
          </div>
        </div>
        <div
          style={{
            gridArea: '1 / 1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            height: 92,
            borderRadius: 999,
            background: 'rgba(31,77,53,0.08)',
            fontSize: 34,
            fontWeight: 800,
            opacity: sent,
            transform: `scale(${0.9 + 0.1 * sent})`,
          }}
        >
          <span
            style={{
              width: 50,
              height: 50,
              borderRadius: 999,
              background: colors.verde,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${done})`,
            }}
          >
            <Check size={30} color={colors.crema} strokeWidth={3.2} />
          </span>
          Enviado a {para}
        </div>
      </div>
    </div>
  );
};
