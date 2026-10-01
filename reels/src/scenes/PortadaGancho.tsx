/**
 * Portada alternativa: la pregunta del gancho + el abanico de tarjetas con comida.
 * Todo dentro del recorte 1080x1350 del feed (y 285–1635).
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {colors, fonts, video} from '../brand';
import {copy} from '../copy';
import {Atlas} from '../components/Atlas';
import {Emoji, Grain, Wave, WheatTexture} from '../components/Decor';
import {Headline} from '../components/Headline';
import {CARD_W, VentureCard} from '../components/VentureCatalog';

const FAN = [
  {i: 4, x: 290, y: 930, rot: -11, s: 1.06},
  {i: 1, x: 790, y: 940, rot: 10, s: 1.06},
  {i: 0, x: 540, y: 872, rot: -2.5, s: 1.12},
];

export const PortadaGancho: React.FC = () => (
  <AbsoluteFill style={{background: colors.verde, overflow: 'hidden'}}>
    <WheatTexture />
    <Atlas tone="dark" width={2600} x={-780} y={140} pins={false} opacity={0.9} />
    <Wave color={colors.cremaFondo} top={1712} amplitude={34} lobes={1.2} />
    <div style={{position: 'absolute', left: 80, right: 80, top: 318, textAlign: 'center'}}>
      <div style={{fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 46, color: colors.crema, opacity: 0.8, marginBottom: 18}}>
        {copy.gancho.bajada}
      </div>
      <Headline lines={copy.gancho.titulo} start={-200} sans={108} serif={132} align="center" />
    </div>
    {FAN.map((c) => (
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
          boxShadow: '0 50px 70px -40px rgba(10,30,20,0.6)',
        }}
      >
        <VentureCard v={copy.catalogo.tarjetas[c.i]} />
      </div>
    ))}
    <div style={{position: 'absolute', left: 0, right: 0, top: 1506, display: 'flex', justifyContent: 'center'}}>
      <div
        style={{
          fontFamily: fonts.sans,
          fontWeight: 800,
          fontSize: 40,
          color: colors.ctaTexto,
          background: colors.cta,
          borderRadius: 999,
          padding: '18px 38px',
          boxShadow: '0 24px 40px -24px rgba(0,0,0,0.6)',
        }}
      >
        Mencionalo en los comentarios <Emoji>👇</Emoji>
      </div>
    </div>
    <Grain opacity={0.08} blend="soft-light" />
  </AbsoluteFill>
);

export const PORTADA_H = video.height;
