import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {INTRO, SceneIntro} from './scenes/SceneIntro';
import {HOWTO, SceneHowTo} from './scenes/SceneHowTo';
import {CTA, SceneCTA} from './scenes/SceneCTA';
import {useFonts} from './components/useFonts';

/**
 * Tiempos en frames (30fps). Las escenas se pisan unos frames para que las
 * transiciones (tarjetas que caen, ondas que suben) sean continuas.
 */
const HOWTO_FROM = 176;
const OVERLAP = INTRO.duration - HOWTO_FROM;
export const SCENES = {
  intro: {from: 0, duration: INTRO.duration},
  howTo: {from: HOWTO_FROM, duration: HOWTO.duration},
  cta: {from: HOWTO_FROM + HOWTO.duration - 2, duration: CTA.duration},
} as const;

export const REEL_DURATION = SCENES.cta.from + SCENES.cta.duration;

export const ReelEmprendimientos: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{background: '#1F4D35'}}>
      <Sequence from={SCENES.intro.from} durationInFrames={SCENES.intro.duration} name="1 · Gancho + catálogo">
        <SceneIntro />
      </Sequence>
      <Sequence from={SCENES.howTo.from} durationInFrames={SCENES.howTo.duration} name="2 · Cómo se hace">
        <SceneHowTo underlay={OVERLAP} />
      </Sequence>
      <Sequence from={SCENES.cta.from} durationInFrames={SCENES.cta.duration} name="3 · CTA">
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Portada: el CTA ya armado, centrado para el recorte 1080x1350 del feed. */
export const PortadaEmprendimientos: React.FC = () => {
  useFonts();
  return (
    <Sequence from={-(CTA.duration - 1)}>
      <SceneCTA portada />
    </Sequence>
  );
};
