/**
 * Línea de tiempo del reel "CeliMap llegó a Android", en la misma grilla que los anuncios
 * (100 bpm, 30 fps: 1 beat = 18 frames, 1 compás = 72 frames = 2,4 s).
 *
 * Única fuente de tiempos: la usan las escenas (Remotion) y el sintetizador
 * (scripts/make-audio-android.ts). No importar nada de Remotion acá (lo corre Node).
 * Tiempos de cada escena: RELATIVOS a su `from`. Cues de audio y golpes: ABSOLUTOS.
 *
 *   Compás 1     Gancho: "¿Sos celíaco y usás Android?"              (filtro cerrado)
 *   Compás 2     Llegada: ícono + sticker NUEVO + badge de Google Play  (corte + subida al final)
 *   Compases 3–4 Mapa en un Android: caen pines, filtro, ficha          (se abre el groove)
 *   Compases 5–6 Descarga: ícono, badges, logo                          (cierre en tónica)
 */
import {BAR, BEAT, PIN_COUNT, WAVE, type Cue} from '../celiaco/timing';

export const timingAndroid = () => {
  const gancho = {from: 0, duration: BAR, titleStart: -14, stagger: 9, exit: [BAR - 10, BAR] as [number, number]};

  // Entra mientras el gancho sale; ícono en el 1 del compás 2, sticker en el beat 2, badge medio beat después.
  const lFrom = BAR - 10;
  const llegada = {
    from: lFrom,
    duration: 2 * BAR - lFrom,
    title: 4,
    icon: BAR + 4 - lFrom,
    sticker: BAR + BEAT - lFrom,
    badge: BAR + BEAT + BEAT / 2 - lFrom,
    exit: [2 * BAR - WAVE - 12 - lFrom, 2 * BAR - lFrom] as [number, number],
  };

  const mFrom = 2 * BAR - WAVE;
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

  const descDown = 4 * BAR;
  const descarga = {
    from: descDown - WAVE,
    duration: BAR * 2 + WAVE,
    eyebrow: WAVE - 4,
    title: WAVE - 2,
    icon: WAVE + BEAT,
    bajada: WAVE + BEAT * 2,
    badges: WAVE + BEAT * 3,
    footer: WAVE + BEAT * 4,
  };
  const total = descarga.from + descarga.duration;

  const riser = 2 * BAR - BEAT * 2;
  const drop = 2 * BAR;

  const cues: Cue[] = [{f: 0, kind: 'boom'}];
  cues.push({f: gancho.exit[0] - 2, kind: 'whoosh'});
  cues.push({f: llegada.from + llegada.icon, kind: 'pop', n: -3, gain: 1.1});
  cues.push({f: llegada.from + llegada.sticker, kind: 'pop', n: -5, gain: 1.2});
  cues.push({f: llegada.from + llegada.badge, kind: 'ding', gain: 0.7});
  cues.push({f: riser, kind: 'riser'});
  cues.push({f: drop - WAVE - 2, kind: 'whoosh'});
  cues.push({f: drop, kind: 'boom', gain: 0.8});
  for (let i = 0; i < PIN_COUNT; i++) {
    cues.push({f: mapa.from + mapa.pins + i * mapa.pinStagger + 4, kind: 'plink', n: i, gain: 0.55});
  }
  cues.push({f: mapa.from + mapa.filterTap, kind: 'tap'});
  cues.push({f: mapa.from + mapa.pinTap, kind: 'tap'});
  cues.push({f: mapa.from + mapa.card + 4, kind: 'ding', gain: 0.6});
  cues.push({f: descarga.from - 2, kind: 'whoosh'});
  cues.push({f: descDown, kind: 'boom', gain: 0.7});
  cues.push({f: descarga.from + descarga.icon, kind: 'pop', n: -3, gain: 1.1});
  cues.push({f: descarga.from + descarga.badges, kind: 'pop', n: 2, gain: 0.8});
  cues.push({f: descarga.from + descarga.footer, kind: 'ding', gain: 0.8});

  const punches = [
    0,
    llegada.from + llegada.icon,
    llegada.from + llegada.sticker,
    drop,
    mapa.from + mapa.filterTap,
    mapa.from + mapa.pinTap,
    descDown,
    descarga.from + descarga.icon,
  ];

  return {
    total,
    gancho,
    llegada,
    mapa,
    descarga,
    punches,
    music: {riser, drop, descarga: descDown, end: total},
    cues: cues.sort((x, y) => x.f - y.f),
  };
};

export type TimingAndroid = ReturnType<typeof timingAndroid>;
