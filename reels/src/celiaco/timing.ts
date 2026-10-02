/**
 * Línea de tiempo de los anuncios, en la grilla de la música (100 bpm, 30 fps).
 *   1 beat = 18 frames, 1 compás = 72 frames (2,4 s).
 *
 * Es la ÚNICA fuente de tiempos: la usan las escenas (Remotion) y el sintetizador
 * (scripts/make-audio.ts), así los cortes, los efectos y la música no se desfasan.
 * No importar nada de Remotion acá (lo corre Node).
 *
 * Tiempos de cada escena: RELATIVOS a su `from`. Los cues de audio: ABSOLUTOS.
 */
import {copyCeliaco, type Variante} from './copy';

export const FPS = 30;
export const BPM = 100;
export const BEAT = 18;
export const BAR = BEAT * 4;
/** Lo que tarda una onda en tapar la pantalla: la escena nueva "cae" en from + WAVE. */
export const WAVE = 16;

export type CueKind =
  | 'boom' // golpe grave (arranque y llegadas grandes)
  | 'whoosh' // cambio de escena
  | 'riser' // subida antes del mapa
  | 'pop' // burbuja de chat de otro / sticker
  | 'send' // burbuja propia
  | 'plink' // pin que cae (nota según `n`)
  | 'tap' // toque de dedo
  | 'ding' // confirmación (ficha abierta, enviado)
  | 'type' // tecla
  | 'sparkle'; // corazones

export type Cue = {f: number; kind: CueKind; n?: number; gain?: number};

export type Timing = {
  total: number;
  gancho: {from: number; duration: number; titleStart: number; stagger: number; exit: [number, number]};
  dolor: {
    from: number;
    duration: number;
    card: number;
    msgs: number[];
    /** Frame en que empieza el "escribiendo…" de cada mensaje (null = sin indicador). */
    typing: (number | null)[];
    sticker: number;
    remate: number;
    exit: [number, number];
  };
  mapa: {
    from: number;
    duration: number;
    title: number;
    phone: number;
    pins: number;
    pinStagger: number;
    pinCount: number;
    fingerIn: number;
    filterTap: number;
    pinTap: number;
    card: number;
    fingerOut: number;
  };
  compartir: null | {
    from: number;
    duration: number;
    title: number;
    card: number;
    pick: number;
    type: [number, number];
    send: number;
    sent: number;
    done: number;
    hearts: number;
  };
  descarga: {
    from: number;
    duration: number;
    fromGreen: boolean;
    eyebrow: number;
    title: number;
    icon: number;
    bajada: number;
    badges: number;
    footer: number;
  };
  /** Golpes de cámara (frames absolutos). */
  punches: number[];
  /** Para la música (frames absolutos). */
  music: {riser: number; drop: number; descarga: number; end: number};
  cues: Cue[];
};

const beat = (n: number) => Math.round(n * BEAT);

export const PIN_COUNT = 12;

export const timing = (v: Variante): Timing => {
  const c = copyCeliaco[v];
  const n = c.dolor.mensajes.length;

  // 1 · Gancho: compás 1. Las primeras palabras ya están arriba en el frame 0.
  const gancho = {from: 0, duration: BAR, titleStart: -14, stagger: 9, exit: [BAR - 10, BAR] as [number, number]};

  // 2 · Dolor: compases 2–3. Cada mensaje cae en un beat; el último "otro" de "conoces" duda un beat más.
  const dFrom = BAR - 10;
  const msgAbs: number[] =
    v === 'sos' ? [beat(5), beat(6), beat(7), beat(8)] : [beat(5), beat(6), beat(8)];
  const msgs = msgAbs.slice(0, n).map((f) => f - dFrom);
  const typing = c.dolor.mensajes.map((m, i) => {
    if (m.de === 'yo') return null;
    const gap = i === 0 ? BEAT : msgs[i] - msgs[i - 1];
    return msgs[i] - Math.min(gap - 4, gap > BEAT ? 24 : 12);
  });
  const stickerMsg = c.dolor.sticker?.msg ?? 0;
  const dolor = {
    from: dFrom,
    duration: 3 * BAR - dFrom,
    card: 4,
    msgs,
    typing,
    sticker: msgs[stickerMsg] + 4,
    remate: beat(9) - dFrom,
    exit: [3 * BAR - WAVE - 12 - dFrom, 3 * BAR - dFrom] as [number, number],
  };

  // 3 · Mapa: compases 4–5. Cae en el compás 4 (frame 216): ahí se abre la música.
  const mFrom = 3 * BAR - WAVE;
  const mapa = {
    from: mFrom,
    duration: 2 * BAR + WAVE * 2,
    title: WAVE + 2,
    phone: WAVE - 4,
    pins: WAVE + 14,
    pinStagger: 3,
    pinCount: PIN_COUNT,
    fingerIn: WAVE + BEAT * 3,
    filterTap: WAVE + BEAT * 4,
    pinTap: WAVE + BEAT * 6,
    card: WAVE + BEAT * 6 + 4,
    fingerOut: WAVE + BEAT * 7 + 6,
  };

  // 4 · Mandáselo (solo "conoces"): compases 6–7.
  const cFrom = 5 * BAR - WAVE;
  const compartir = c.compartir
    ? {
        from: cFrom,
        duration: 2 * BAR + WAVE,
        title: WAVE + 2,
        card: WAVE + 4,
        pick: WAVE + BEAT,
        type: [WAVE + BEAT + 6, WAVE + BEAT * 2 + 10] as [number, number],
        send: WAVE + BEAT * 3,
        sent: WAVE + BEAT * 3 + 2,
        done: WAVE + BEAT * 4,
        hearts: WAVE + BEAT * 5,
      }
    : null;

  // 5 · Descarga: cae en un compás y termina un compás y medio (o dos) después.
  const descDown = compartir ? 7 * BAR : 5 * BAR;
  const descarga = {
    from: descDown - WAVE,
    duration: (compartir ? BAR * 1.5 : BAR * 2) + WAVE,
    fromGreen: !!compartir,
    eyebrow: WAVE - 4,
    title: WAVE - 2,
    icon: WAVE + BEAT,
    bajada: WAVE + BEAT * 2,
    badges: WAVE + BEAT * 3,
    footer: WAVE + BEAT * 4,
  };
  const total = descarga.from + descarga.duration;

  // —— Cues de audio (absolutos) ——
  const cues: Cue[] = [{f: 0, kind: 'boom'}];
  cues.push({f: gancho.exit[0] - 2, kind: 'whoosh'});
  c.dolor.mensajes.forEach((m, i) => {
    cues.push({f: dolor.from + msgs[i], kind: m.de === 'yo' ? 'send' : 'pop'});
  });
  if (c.dolor.sticker) cues.push({f: dolor.from + dolor.sticker, kind: 'pop', n: -5, gain: 1.2});
  cues.push({f: 3 * BAR - BEAT * 2, kind: 'riser'});
  cues.push({f: 3 * BAR - WAVE - 2, kind: 'whoosh'});
  cues.push({f: 3 * BAR, kind: 'boom', gain: 0.8});
  for (let i = 0; i < PIN_COUNT; i++) {
    cues.push({f: mapa.from + mapa.pins + i * mapa.pinStagger + 4, kind: 'plink', n: i, gain: 0.55});
  }
  cues.push({f: mapa.from + mapa.filterTap, kind: 'tap'});
  cues.push({f: mapa.from + mapa.pinTap, kind: 'tap'});
  cues.push({f: mapa.from + mapa.card + 4, kind: 'ding', gain: 0.6});
  if (compartir) {
    const a = compartir.from;
    cues.push({f: a - 2, kind: 'whoosh'});
    cues.push({f: a + compartir.pick, kind: 'tap'});
    const msgLen = c.compartir!.mensaje.length;
    const [t0, t1] = compartir.type;
    for (let k = 0; k < msgLen; k += 2) {
      cues.push({f: a + Math.round(t0 + ((t1 - t0) * k) / msgLen), kind: 'type', gain: 0.5 + ((k * 37) % 10) / 20});
    }
    cues.push({f: a + compartir.send, kind: 'tap'});
    cues.push({f: a + compartir.sent, kind: 'whoosh', gain: 0.6});
    cues.push({f: a + compartir.done, kind: 'ding'});
    cues.push({f: a + compartir.hearts, kind: 'sparkle'});
  }
  cues.push({f: descarga.from - 2, kind: 'whoosh'});
  cues.push({f: descDown, kind: 'boom', gain: 0.7});
  cues.push({f: descarga.from + descarga.icon, kind: 'pop', n: -3, gain: 1.1});
  cues.push({f: descarga.from + descarga.badges, kind: 'pop', n: 2, gain: 0.8});
  cues.push({f: descarga.from + descarga.footer, kind: 'ding', gain: 0.8});

  const punches = [
    0,
    dolor.from + dolor.card + 10,
    3 * BAR,
    mapa.from + mapa.filterTap,
    mapa.from + mapa.pinTap,
    ...(compartir ? [compartir.from + WAVE, compartir.from + compartir.done] : []),
    descDown,
    descarga.from + descarga.icon,
  ];

  return {
    total,
    gancho,
    dolor,
    mapa,
    compartir,
    descarga,
    punches,
    music: {riser: 3 * BAR - BEAT * 2, drop: 3 * BAR, descarga: descDown, end: total},
    cues: cues.sort((x, y) => x.f - y.f),
  };
};
