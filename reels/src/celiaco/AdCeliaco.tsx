/**
 * Anuncios de instalación para Meta Ads (9:16, 1080x1920, 30fps, con música).
 *   AdSosCeliaco      gancho → chat con el restó → mapa → descarga                (7 compases, 16,8s)
 *   AdConocesCeliaco  gancho → chat de la juntada → mapa → mandáselo → descarga   (8,5 compases, 20,4s)
 *
 * Tiempos: timing.ts. Música y efectos: public/audio/ad-*.wav (npm run audio los regenera).
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {colors} from '../brand';
import {Atlas} from '../components/Atlas';
import {Grain, WheatTexture} from '../components/Decor';
import {useFonts} from '../components/useFonts';
import {AdsGuides} from './Bits';
import {SceneCompartir, SceneDescarga, SceneDolor, SceneGancho, SceneMapa} from './Scenes';
import {copyCeliaco, type Variante} from './copy';
import {punchAt} from './motion';
import {timing} from './timing';

export const AdCeliaco: React.FC<{v: Variante; guides?: boolean; muted?: boolean}> = ({v, guides = false, muted = false}) => {
  useFonts();
  const frame = useCurrentFrame();
  const c = copyCeliaco[v];
  const t = timing(v);
  const punch = punchAt(frame, t.punches);
  return (
    <AbsoluteFill style={{background: colors.verde, overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${punch})`}}>
        <WheatTexture drift={0.6} />
        <Atlas tone="dark" width={2600} x={-780 - frame * 0.25} y={160} pins opacity={0.9} />

        <Sequence from={t.gancho.from} durationInFrames={t.gancho.duration} name="1 · Gancho">
          <SceneGancho c={c} t={t} />
        </Sequence>
        <Sequence from={t.dolor.from} durationInFrames={t.dolor.duration} name="2 · Dolor">
          <SceneDolor c={c} t={t} />
        </Sequence>
        <Sequence from={t.mapa.from} durationInFrames={t.mapa.duration} name="3 · Mapa">
          <SceneMapa c={c} t={t} />
        </Sequence>
        {t.compartir ? (
          <Sequence from={t.compartir.from} durationInFrames={t.compartir.duration} name="4 · Mandáselo">
            <SceneCompartir c={c} t={t} />
          </Sequence>
        ) : null}
        <Sequence from={t.descarga.from} durationInFrames={t.descarga.duration} name="5 · Descarga">
          <SceneDescarga c={c} t={t} />
        </Sequence>
      </AbsoluteFill>

      <Grain opacity={0.07} blend="soft-light" />
      {guides ? <AdsGuides /> : null}
      {muted ? null : <Audio src={staticFile(`audio/ad-${v}.wav`)} />}
    </AbsoluteFill>
  );
};

/** Portada / miniatura: el gancho armado sobre el fondo verde. */
export const PortadaCeliaco: React.FC<{v: Variante; guides?: boolean}> = ({v, guides = false}) => {
  useFonts();
  return (
    <AbsoluteFill style={{background: colors.verde, overflow: 'hidden'}}>
      <WheatTexture />
      <Atlas tone="dark" width={2600} x={-780} y={160} pins opacity={0.9} />
      <SceneGancho c={copyCeliaco[v]} t={timing(v)} still />
      <Grain opacity={0.07} blend="soft-light" />
      {guides ? <AdsGuides /> : null}
    </AbsoluteFill>
  );
};
