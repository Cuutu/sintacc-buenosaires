/**
 * Textos de los dos anuncios de instalación (Meta Ads):
 *   - "sos":     ¿Sos celíaco? Esto es para vos
 *   - "conoces": ¿Conocés a un celíaco? Compartíselo
 *
 * Mismo esqueleto (gancho → dolor → mapa → descarga); cambia el punto de vista.
 * Titulares: { t, f: 'sans' | 'serif', subrayado? } igual que src/copy.ts.
 *
 * Regla de marca: nunca "seguro", "garantizado", "verificado", "certificado" ni "sin riesgo".
 * Los lugares del mapa son genéricos a propósito: no usar nombres reales sin permiso.
 */
import type {Linea} from '../copy';

export type Variante = 'sos' | 'conoces';

export type Mensaje = {
  /** 'yo' = burbuja terracota a la derecha. 'otro' = burbuja crema a la izquierda. */
  de: 'yo' | 'otro';
  texto: string;
  /** Nombre arriba de la burbuja (chats grupales). */
  autor?: string;
};

export type CopyCeliaco = {
  gancho: {bajada: string; titulo: Linea[]};
  dolor: {
    chat: {titulo: string; subtitulo: string; avatar: string};
    mensajes: Mensaje[];
    /** Emoji grande que "se pega" sobre el chat cuando aparece el mensaje `msg`. x/y en px del video. */
    sticker?: {emoji: string; msg: number; x: number; y: number; rot: number};
    remate: Linea[];
  };
  mapa: {titulo: Linea[]; busqueda: string};
  /** Solo en "conoces": el momento de mandárselo a alguien. */
  compartir?: {
    para: string;
    mensaje: string;
    titulo: Linea[];
  };
  descarga: {eyebrow: string; titulo: Linea[]; bajada: string};
};

/** Tarjeta del lugar que se abre en el mapa. Genérica a propósito. */
export const lugarEjemplo = {
  nombre: 'Tu próxima panadería favorita',
  meta: ['Panadería', 'Palermo', '350 m'],
};

/** CeliMap está publicada en App Store y Google Play. `ratio` = ancho/alto del arte oficial. */
export const tiendas = {
  ios: {badge: 'brand/app-store-badge-es.svg', alt: 'Consíguelo en el App Store', ratio: 119.66407 / 40},
  android: {badge: 'brand/google-play-badge-es.png', alt: 'Descargar en Google Play', ratio: 646 / 192},
  web: 'celimap.com.ar',
};

export const copyCeliaco: Record<Variante, CopyCeliaco> = {
  sos: {
    gancho: {
      bajada: 'tu mapa sin gluten',
      titulo: [
        {t: '¿Sos', f: 'sans'},
        {t: 'celíaco?', f: 'sans'},
        {t: 'Esto es para vos 💚', f: 'serif', subrayado: true},
      ],
    },
    dolor: {
      chat: {titulo: 'La Esquina', subtitulo: 'restó · en línea', avatar: '🍽️'},
      mensajes: [
        {de: 'yo', texto: 'Hola! ¿Tienen algo sin TACC?'},
        {de: 'otro', texto: 'Mmm… dejame que pregunto en la cocina 😬'},
        {de: 'otro', texto: 'Tenemos ensalada 🥗'},
        {de: 'yo', texto: 'Ah… bueno, gracias 🥲'},
      ],
      sticker: {emoji: '🥗', msg: 2, x: 780, y: 690, rot: 14},
      remate: [
        {t: 'Salir a comer', f: 'sans'},
        {t: 'no debería ser adivinar', f: 'serif'},
      ],
    },
    mapa: {
      titulo: [
        {t: 'Lugares sin TACC', f: 'sans'},
        {t: 'cerca tuyo', f: 'serif', subrayado: true},
      ],
      busqueda: 'Buscar lugar o zona...',
    },
    descarga: {
      eyebrow: 'Tu mapa sin gluten, en el bolsillo',
      titulo: [
        {t: 'Bajate la app', f: 'sans'},
        {t: 'y salí sin adivinar', f: 'serif'},
      ],
      bajada: 'Lugares 100% sin TACC y con opciones, en un solo mapa',
    },
  },

  conoces: {
    gancho: {
      bajada: 'tu mapa sin gluten',
      titulo: [
        {t: '¿Conocés a', f: 'sans'},
        {t: 'un celíaco?', f: 'sans'},
        {t: 'Compartíselo 💌', f: 'serif', subrayado: true},
      ],
    },
    dolor: {
      chat: {titulo: 'Juntada del sábado 🍕', subtitulo: 'Sofi, Juli, Mati y vos', avatar: '🍕'},
      mensajes: [
        {de: 'otro', autor: 'Sofi', texto: '¿Pizza el sábado? 🍕'},
        {de: 'otro', autor: 'Juli', texto: 'Dale!! 🙌'},
        {de: 'otro', autor: 'Mati', texto: 'Yo como algo antes en casa, no se preocupen 🙂'},
      ],
      sticker: {emoji: '🍕', msg: 0, x: 770, y: 470, rot: -12},
      remate: [
        {t: 'Que no tenga que', f: 'sans'},
        {t: 'comer antes de salir', f: 'serif'},
      ],
    },
    mapa: {
      titulo: [
        {t: 'Que elija con ustedes', f: 'sans'},
        {t: 'dónde comer', f: 'serif', subrayado: true},
      ],
      busqueda: 'Buscar lugar o zona...',
    },
    compartir: {
      para: 'Mati',
      mensaje: 'Mirá, para el sábado 💚',
      titulo: [
        {t: 'Mandáselo', f: 'sans'},
        {t: 'a quien lo necesite', f: 'serif'},
      ],
    },
    descarga: {
      eyebrow: 'Para la próxima juntada',
      titulo: [
        {t: 'Bajate la app', f: 'sans'},
        {t: 'y elijan juntos', f: 'serif'},
      ],
      bajada: 'Lugares 100% sin TACC y con opciones, en un solo mapa',
    },
  },
};
