/**
 * Todos los textos del reel. Para un reel nuevo, editá acá y volvé a renderizar.
 *
 * Titulares: cada línea es { t: texto, f: 'sans' | 'serif' }.
 *   sans  = Nunito ExtraBold (como los h1 de la web)
 *   serif = Fraunces itálica (el acento, como "tu mapa sin gluten" del logo)
 * Máximo 3 líneas por titular.
 *
 * Regla de marca: nunca "seguro", "garantizado", "certificado" ni "sin riesgo",
 * y nunca nombres de emprendimientos reales sin permiso.
 */
import type {ArtKind} from './components/FoodArt';

export type Linea = {t: string; f: 'sans' | 'serif'; subrayado?: boolean};

export type Tarjeta = {
  name: string;
  zone: string;
  category: 'Panificados' | 'Pastelería' | 'Viandas' | 'Congelados' | 'Productos artesanales';
  art: ArtKind;
  chips: string[];
  instagram?: boolean;
  whatsapp?: boolean;
};

export const copy = {
  gancho: {
    bajada: 'tu mapa sin gluten',
    titulo: [
      {t: '¿Conocés un', f: 'sans'},
      {t: 'emprendimiento', f: 'sans'},
      {t: 'sin TACC? 👀', f: 'serif', subrayado: true},
    ] as Linea[],
  },

  catalogo: {
    // "Los que hacen …" + la palabra que va rotando al ritmo de las tarjetas.
    titulo: 'Los que hacen',
    palabras: ['pan', 'tortas', 'viandas', 'pizzas', 'alfajores'],
    bajada: 'Si es sin TACC, tiene su lugar en CeliMap',
    // Una tarjeta por palabra, en el mismo orden. Nombres genéricos a propósito.
    tarjetas: [
      {
        name: 'El de tu barrio',
        zone: 'CABA',
        category: 'Panificados',
        art: 'pan',
        chips: ['Delivery', 'Retiro'],
        instagram: true,
        whatsapp: true,
      },
      {
        name: 'Tu pastelería favorita',
        zone: 'La Plata',
        category: 'Pastelería',
        art: 'torta',
        chips: ['Retiro', 'Envíos'],
        instagram: true,
      },
      {
        name: 'El que pedís siempre',
        zone: 'Rosario',
        category: 'Viandas',
        art: 'vianda',
        chips: ['Delivery', 'Envíos'],
        whatsapp: true,
        instagram: true,
      },
      {
        name: 'El que te recomendaron',
        zone: 'Córdoba',
        category: 'Congelados',
        art: 'pizza',
        chips: ['Envíos', 'Retiro'],
        instagram: true,
      },
      {
        name: 'La de la feria',
        zone: 'Mar del Plata',
        category: 'Productos artesanales',
        art: 'alfajores',
        chips: ['Ferias', 'Envíos'],
        instagram: true,
        whatsapp: true,
      },
    ] as Tarjeta[],
  },

  comoSeHace: {
    etiqueta: [
      {t: 'Sumarlo a CeliMap te lleva', f: 'sans'},
      {t: '30 segundos', f: 'serif'},
    ] as Linea[],
    etiquetaFinal: [
      {t: 'Así se ve', f: 'sans'},
      {t: 'tu emprendimiento', f: 'serif'},
    ] as Linea[],
    pasos: ['Tocá «Sugerir»', 'Pegá su Instagram', 'Enviá y listo'],
    linkEjemplo: 'instagram.com/tu.emprendimiento.sintacc',
    zonaEjemplo: 'CABA',
    gracias: '¡Gracias! Lo revisamos 💚',
    nueva: {
      name: 'Tu emprendimiento',
      zone: 'CABA',
      category: 'Panificados',
      art: 'pan',
      chips: ['Envíos'],
      instagram: true,
    } as Tarjeta,
  },

  cta: {
    bajadaArriba: '¿Se te vino uno a la cabeza?',
    titulo: [
      {t: 'Mencionalo', f: 'sans'},
      {t: 'en los comentarios 👇', f: 'serif'},
    ] as Linea[],
    comentario: {
      usuario: 'tu.usuario',
      mencion: '@tu.emprendimiento.sintacc',
      resto: ' 🙌',
    },
    bajada: 'Todos los que nombren los revisamos y los sumamos a CeliMap 💚',
    web: 'celimap.com.ar',
  },
} as const;
