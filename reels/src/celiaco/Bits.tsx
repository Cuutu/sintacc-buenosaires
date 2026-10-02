/** Piezas chicas de los anuncios: zonas seguras de Meta Ads, badges de tiendas, ícono de la app. */
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {video} from '../brand';
import {tiendas} from './copy';

/**
 * Zonas de Meta Ads en 9:16 (px de 1080x1920).
 * - Stories: ~14% arriba y abajo libres (270px).
 * - Reels ads: ~35% abajo lo tapan el texto del anuncio y el botón "Instalar" (672px).
 * Regla de diseño: textos y CTA arriba de `textBottom`; el celular puede bajar más (es imagen).
 */
export const ads = {
  top: 270,
  left: 80,
  right: 140,
  textBottom: video.height - 672,
  bottom: 380,
} as const;

export const adsCenterX = (ads.left + (video.width - ads.right)) / 2;

/** Guía de revisión para Meta Ads: rojo = Stories/Reels (siempre tapado), naranja = Reels ads. */
export const AdsGuides: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: ads.top, background: 'rgba(220,40,40,0.3)'}} />
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: ads.textBottom,
        bottom: ads.bottom,
        background: 'rgba(240,140,20,0.22)',
      }}
    />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: ads.bottom, background: 'rgba(220,40,40,0.3)'}} />
    <div
      style={{position: 'absolute', right: 0, top: ads.top, bottom: ads.bottom, width: ads.right, background: 'rgba(220,40,40,0.22)'}}
    />
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: (video.height - 1350) / 2,
        height: 1350,
        outline: '6px dashed rgba(40,90,220,0.8)',
        outlineOffset: -6,
      }}
    />
  </AbsoluteFill>
);

/**
 * Badges oficiales de las tiendas en español, sin modificar el arte:
 * - Apple "Consíguelo en el App Store" (SVG, negro).
 * - Google Play "Descargar en Google Play" (PNG oficial es-419, recortado sólo el margen transparente).
 * Se igualan por alto, como piden las guías de ambas marcas.
 */
export const StoreBadges: React.FC<{scale?: number}> = ({scale = 1}) => {
  const h = 128 * scale; // ~118px con scale .92: los dos entran en el ancho útil y quedan arriba de ads.textBottom
  return (
    <div style={{display: 'flex', gap: 24 * scale, justifyContent: 'center', alignItems: 'center'}}>
      {[tiendas.ios, tiendas.android].map((t) => (
        <Img
          key={t.badge}
          src={staticFile(t.badge)}
          alt={t.alt}
          style={{height: h, width: h * t.ratio, display: 'block', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.35))'}}
        />
      ))}
    </div>
  );
};

export const AppIcon: React.FC<{size: number}> = ({size}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.225,
      overflow: 'hidden',
      boxShadow: '0 40px 60px -30px rgba(0,0,0,0.65), 0 0 0 3px rgba(247,243,235,0.18)',
    }}
  >
    <Img src={staticFile('brand/app-icon.png')} style={{width: size, height: size, display: 'block'}} />
  </div>
);
