import React from 'react';
import {AbsoluteFill, Composition, Still} from 'remotion';
import {video} from './brand';
import {PortadaEmprendimientos, REEL_DURATION, ReelEmprendimientos} from './ReelEmprendimientos';
import {SafeGuides} from './components/SafeGuides';
import {PortadaGancho} from './scenes/PortadaGancho';
import {useFonts} from './components/useFonts';
import {AdCeliaco, PortadaCeliaco} from './celiaco/AdCeliaco';
import {timing} from './celiaco/timing';

const PortadaAlternativa: React.FC = () => {
  useFonts();
  return <PortadaGancho />;
};

const ReelConGuias: React.FC = () => (
  <AbsoluteFill>
    <ReelEmprendimientos />
    <SafeGuides />
  </AbsoluteFill>
);

const PortadaConGuias: React.FC = () => (
  <AbsoluteFill>
    <PortadaEmprendimientos />
    <SafeGuides feed />
  </AbsoluteFill>
);

const PortadaAlternativaConGuias: React.FC = () => (
  <AbsoluteFill>
    <PortadaAlternativa />
    <SafeGuides feed />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="ReelEmprendimientos"
      component={ReelEmprendimientos}
      durationInFrames={REEL_DURATION}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
    <Still id="PortadaEmprendimientos" component={PortadaEmprendimientos} width={video.width} height={video.height} />
    <Still id="PortadaEmprendimientosAlternativa" component={PortadaAlternativa} width={video.width} height={video.height} />
    {/* Solo para revisar: zonas seguras de Reels (rojo) y recorte del feed (azul). */}
    <Composition
      id="ReelEmprendimientos-Guias"
      component={ReelConGuias}
      durationInFrames={REEL_DURATION}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
    <Still id="PortadaEmprendimientos-Guias" component={PortadaConGuias} width={video.width} height={video.height} />
    <Still id="PortadaEmprendimientosAlternativa-Guias" component={PortadaAlternativaConGuias} width={video.width} height={video.height} />

    {/* Meta Ads de instalación: src/celiaco/ (textos en src/celiaco/copy.ts) */}
    <Composition
      id="AdSosCeliaco"
      component={AdCeliaco}
      defaultProps={{v: 'sos' as const}}
      durationInFrames={timing('sos').total}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
    <Composition
      id="AdConocesCeliaco"
      component={AdCeliaco}
      defaultProps={{v: 'conoces' as const}}
      durationInFrames={timing('conoces').total}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
    <Still id="PortadaSosCeliaco" component={PortadaCeliaco} defaultProps={{v: 'sos' as const}} width={video.width} height={video.height} />
    <Still id="PortadaConocesCeliaco" component={PortadaCeliaco} defaultProps={{v: 'conoces' as const}} width={video.width} height={video.height} />
    {/* Solo para revisar: rojo = siempre tapado, naranja = texto + botón de Reels ads, azul = recorte 4:5 del feed. */}
    <Composition
      id="AdSosCeliaco-Guias"
      component={AdCeliaco}
      defaultProps={{v: 'sos' as const, guides: true}}
      durationInFrames={timing('sos').total}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
    <Composition
      id="AdConocesCeliaco-Guias"
      component={AdCeliaco}
      defaultProps={{v: 'conoces' as const, guides: true}}
      durationInFrames={timing('conoces').total}
      fps={video.fps}
      width={video.width}
      height={video.height}
    />
  </>
);
