/**
 * Textos del reel "CeliMap llegó a Android" (reel de prueba / orgánico, 9:16).
 * Titulares: { t, f: 'sans' | 'serif', subrayado? } igual que src/copy.ts.
 *
 * Regla de marca: nunca "seguro", "garantizado", "verificado", "certificado" ni "sin riesgo".
 * El mapa del celular es una ilustración y el lugar es genérico (ver celiaco/copy.ts → lugarEjemplo).
 */
import type {Linea} from '../copy';

export const copyAndroid = {
  gancho: {
    bajada: 'tu mapa sin gluten',
    titulo: [
      {t: '¿Sos celíaco', f: 'sans'},
      {t: 'y usás Android?', f: 'serif', subrayado: true},
    ] as Linea[],
  },
  llegada: {
    titulo: [
      {t: 'Llegamos', f: 'sans'},
      {t: 'a Google Play', f: 'serif', subrayado: true},
    ] as Linea[],
    sticker: {arriba: 'NUEVO', abajo: 'en Android'},
  },
  mapa: {
    titulo: [
      {t: 'Lugares sin TACC', f: 'sans'},
      {t: 'cerca tuyo', f: 'serif', subrayado: true},
    ] as Linea[],
  },
  descarga: {
    eyebrow: 'Ahora también en Android',
    titulo: [
      {t: 'Descargala', f: 'sans'},
      {t: 'gratis', f: 'serif', subrayado: true},
    ] as Linea[],
    bajada: 'Lugares 100% sin TACC y con opciones, en un solo mapa',
  },
};
