import {Easing} from 'remotion';
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/500-italic.css';
import '@fontsource/fraunces/600-italic.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';

/**
 * Colores tomados de la web (app/globals.css, app/emprendimientos,
 * components/ventures, lib/celimap-pin.ts). Si cambia la marca, se cambia acá.
 */
export const colors = {
  verde: '#1F4D35', // text-[#1F4D35] / pin dedicado
  verdeHondo: '#183F2B',
  crema: '#F7F3EB', // --color-cream
  cremaFondo: '#F3EEE4', // bg de /emprendimientos
  card: '#FDFBF7', // --color-cream-card
  terracota: '#B64320', // --primary (botones)
  cta: '#C85A2E', // SuggestVentureCta / pin "con opciones"
  ctaTexto: '#F8F5EF',
  borde: '#E8E1D6',
  muted: '#5F6B63',
  olive: '#2D4A34', // --color-olive (texto shadcn)
  oliveMuted: '#4D6554', // --color-olive-muted
} as const;

/** Nunito (UI y titulares) + Fraunces itálica (acentos), igual que app/layout.tsx. */
export const fonts = {
  sans: '"Nunito", system-ui, sans-serif',
  serif: '"Fraunces", Georgia, serif',
  emoji: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif',
} as const;

export const video = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/** Zonas seguras de Reels (px): nada importante afuera de esto. */
export const safe = {
  top: 220,
  bottom: 380,
  right: 160,
  left: 80,
} as const;

/** Centro horizontal del área segura (la derecha pierde 160px por los botones de IG). */
export const safeCenterX = (safe.left + (video.width - safe.right)) / 2;

/** --ease-out de la web. */
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
