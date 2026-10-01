/**
 * Pantalla /emprendimientos (app/emprendimientos/EmprendimientosPageContent.tsx)
 * y tarjeta de emprendimiento (components/ventures/VentureCard.tsx), recreadas
 * con el mismo layout, colores y textos de UI que la web.
 */
import React from 'react';
import {Instagram, MessageCircle, Search} from 'lucide-react';
import {colors, fonts} from '../brand';
import type {Tarjeta} from '../copy';
import {FoodArt} from './FoodArt';
import {BottomNav} from './BottomNav';
import {STATUS_H} from './Phone';

export const VENTURE_CATALOG_INTRO =
  'Solo emprendimientos 100% sin gluten. No listamos marcas que también vendan con gluten.';

/** Ancho lógico de la tarjeta (mobile, px-5 → 390 - 40). */
export const CARD_W = 350;
const PHOTO_H = CARD_W * 0.75; // aspect-[4/3]

type CardProps = {
  v: Tarjeta;
  /** Borde terracota que resalta la tarjeta (0–1). */
  glow?: number;
  /** Corrimiento del dibujo dentro de la foto, para dar profundidad al moverse. */
  parallax?: number;
};

/** VentureCard. La "foto" es una ilustración (en el repo no hay fotos de emprendimientos). */
export const VentureCard: React.FC<CardProps> = ({v, glow = 0, parallax = 0}) => {
  const square = {
    width: 44,
    height: 44,
    borderRadius: 16,
    border: `1px solid ${colors.borde}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  const pill = {borderRadius: 999, fontWeight: 600, lineHeight: 1.25, whiteSpace: 'nowrap'} as const;

  return (
    <div
      style={{
        width: CARD_W,
        borderRadius: 24,
        border: `1px solid ${colors.borde}`,
        background: colors.card,
        overflow: 'hidden',
        boxShadow: `0 8px 24px -18px rgba(31,77,53,0.35), 0 0 0 ${4 * glow}px rgba(200,90,46,${0.55 * glow})`,
        color: colors.verde,
        fontFamily: fonts.sans,
      }}
    >
      <div style={{position: 'relative', height: PHOTO_H}}>
        <FoodArt kind={v.art} parallax={parallax} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            padding: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <span style={{...pill, padding: '4px 10px', fontSize: 11, background: colors.verde, color: colors.ctaTexto}}>
            100% sin gluten
          </span>
          <span
            style={{
              ...pill,
              padding: '4px 12px',
              fontSize: 12,
              color: colors.verde,
              background: 'rgba(248,245,239,0.92)',
            }}
          >
            {v.category}
          </span>
        </div>
      </div>
      <div style={{padding: '12px 16px 16px'}}>
        <div style={{fontSize: 18, fontWeight: 700, lineHeight: 1.375, color: colors.verde, whiteSpace: 'nowrap'}}>
          {v.name}
        </div>
        <div style={{marginTop: 4, fontSize: 14, color: colors.muted}}>{v.zone}</div>
        <div style={{marginTop: 12, display: 'flex', gap: 6, minHeight: 28}}>
          {v.chips.map((c) => (
            <span
              key={c}
              style={{
                ...pill,
                border: `1px solid ${colors.borde}`,
                background: 'rgba(255,255,255,0.8)',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 500,
                color: colors.muted,
              }}
            >
              {c}
            </span>
          ))}
        </div>
        <div style={{display: 'flex', gap: 8, marginTop: 12, height: 44}}>
          {v.instagram ? (
            <div style={square}>
              <Instagram size={16} color={colors.verde} />
            </div>
          ) : null}
          {v.whatsapp ? (
            <div style={square}>
              <MessageCircle size={16} color={colors.verde} />
            </div>
          ) : null}
        </div>
        <div
          style={{
            marginTop: 12,
            height: 44,
            borderRadius: 16,
            background: colors.cta,
            color: colors.ctaTexto,
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Ver perfil
        </div>
      </div>
    </div>
  );
};

/** Alto aproximado de la tarjeta (px lógicos). */
export const CARD_H = PHOTO_H + 12 + 25 + 4 + 19 + 12 + 28 + 12 + 44 + 12 + 44 + 16 + 2;

const HERO_CHIPS = ['Todas', 'Panificados', 'Pastelería', 'Viandas', 'Congelados'];

/** Y (sin scroll) donde arranca la sección "Todos los emprendimientos". */
export const LISTADO_Y = STATUS_H + 24 + 68 + 12 + 104 + 24 + 56 + 12 + 56 + 12 + 16 + 8 + 44 + 32;
export const EMPR_CTA = {x: 195, y: STATUS_H + 24 + 68 + 12 + 104 + 24 + 56 + 12 + 28};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type EmprProps = {
  ctaPressed?: boolean;
  scroll?: number;
  /** Tarjeta que se suma arriba del listado; `nuevaIn` va de 0 (oculta) a 1. */
  nueva?: Tarjeta;
  nuevaIn?: number;
  glow?: number;
  cards: readonly Tarjeta[];
};

export const EmprendimientosScreen: React.FC<EmprProps> = ({
  ctaPressed = false,
  scroll = 0,
  nueva,
  nuevaIn = 0,
  glow = 0,
  cards,
}) => (
  <div style={{position: 'absolute', inset: 0, background: colors.cremaFondo, overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: -scroll, padding: `${STATUS_H + 24}px 20px 0`}}>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: colors.verde,
          height: 68,
        }}
      >
        Emprendimientos <span style={{color: colors.cta}}>100% sin gluten</span>
      </div>
      <p style={{margin: '12px 0 0', fontSize: 16, lineHeight: 1.6, color: colors.muted, height: 104}}>
        {VENTURE_CATALOG_INTRO} ¿Falta alguno? Sugerilo, lo revisamos.
      </p>
      <div
        style={{
          marginTop: 24,
          height: 56,
          borderRadius: 16,
          border: `1px solid ${colors.borde}`,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          fontSize: 15,
          color: 'rgba(95,107,99,0.7)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <Search size={20} color={colors.muted} style={{flexShrink: 0}} />
        Buscar viandas, panificados, pastelería…
      </div>
      <div
        style={{
          marginTop: 12,
          height: 56,
          borderRadius: 16,
          background: ctaPressed ? '#B44F27' : colors.cta,
          color: colors.ctaTexto,
          fontSize: 14,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: ctaPressed ? 'scale(0.97)' : 'none',
        }}
      >
        Sugerir emprendimiento
      </div>
      <p style={{margin: '12px 0 0', fontSize: 12, lineHeight: '16px', color: colors.muted}}>
        Deslizá para ver más categorías
      </p>
      <div style={{display: 'flex', gap: 8, marginTop: 8, overflow: 'hidden', marginRight: -20}}>
        {HERO_CHIPS.map((c, i) => (
          <div
            key={c}
            style={{
              height: 44,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              borderRadius: 999,
              border: `1px solid ${i === 0 ? colors.cta : colors.borde}`,
              background: i === 0 ? colors.cta : '#fff',
              color: i === 0 ? colors.ctaTexto : colors.verde,
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {c}
          </div>
        ))}
      </div>

      {/* Listado */}
      <div style={{marginTop: 32, fontSize: 18, fontWeight: 600, color: colors.verde}}>Todos los emprendimientos</div>
      <div style={{marginTop: 20}}>
        {nueva ? (
          <div style={{height: (CARD_H + 20) * nuevaIn}}>
            <div
              style={{
                opacity: clamp01((nuevaIn - 0.35) / 0.65),
                transform: `translateY(${(1 - nuevaIn) * 30}px) scale(${0.94 + 0.06 * nuevaIn})`,
                transformOrigin: 'top center',
              }}
            >
              <VentureCard v={nueva} glow={glow} />
            </div>
          </div>
        ) : null}
        {cards.map((c) => (
          <div key={c.name} style={{marginBottom: 20}}>
            <VentureCard v={c} />
          </div>
        ))}
      </div>
    </div>
    <BottomNav active="emprendimientos" />
  </div>
);
