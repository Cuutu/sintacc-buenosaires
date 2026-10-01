import React from 'react';
import {AbsoluteFill, Composition, Still} from 'remotion';
import {video} from './brand';
import {PortadaEmprendimientos, REEL_DURATION, ReelEmprendimientos} from './ReelEmprendimientos';
import {SafeGuides} from './components/SafeGuides';
import {PortadaGancho} from './scenes/PortadaGancho';
import {useFonts} from './components/useFonts';

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
  </>
);
